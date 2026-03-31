import {
  DEX_PROGRAM_ID,
  RIAL_MINT_STR,
  SEEDS,
  TOKEN_MINTS,
  FAUCET_CONFIG,
} from './config';

/**
 * Get the faucet request PDA for a user
 */
export async function getFaucetRequestPDA(userPublicKey: any) {
  const { PublicKey } = await import('@solana/web3.js');
  const programId = new PublicKey(DEX_PROGRAM_ID);
  const [pda, bump] = await PublicKey.findProgramAddress(
    [SEEDS.FAUCET_REQUEST, userPublicKey.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Get the DEX config PDA
 */
export async function getDexConfigPDA() {
  const { PublicKey } = await import('@solana/web3.js');
  const programId = new PublicKey(DEX_PROGRAM_ID);
  const [pda, bump] = await PublicKey.findProgramAddress(
    [SEEDS.DEX_CONFIG],
    programId
  );
  return { pda, bump };
}

/**
 * Create instruction to request RIAL tokens from faucet
 */
export async function createRequestFaucetInstruction(
  connection: Connection,
  userPublicKey: PublicKey
): Promise<TransactionInstruction> {
  const dexConfig = await getDexConfigPDA();
  const faucetRequest = await getFaucetRequestPDA(userPublicKey);
  
  // Get user's RIAL token account (create if doesn't exist)
  const userRialAccount = await getAssociatedTokenAddress(
    TOKEN_MINTS.RIAL!,
    userPublicKey
  );

  // Get faucet vault (created during DEX initialization)
  const faucetVault = await getAssociatedTokenAddress(
    TOKEN_MINTS.RIAL!,
    dexConfig.pda,
    true
  );

  const instruction = new TransactionInstruction({
    programId: new PublicKey(DEX_PROGRAM_ID),
    keys: [
      { pubkey: dexConfig.pda, isSigner: false, isWritable: false },
      { pubkey: faucetRequest.pda, isSigner: false, isWritable: true },
      { pubkey: faucetVault, isSigner: false, isWritable: true },
      { pubkey: userRialAccount, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey("TokenkegQfeZyiNwAJsyFbPVwwQQftas5call5pVM5gdk"), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]), // Instruction discriminator for request_faucet
  });

  return instruction;
}

/**
 * Get faucet claim status for a user
 */
export async function getFaucetStatus(
  connection: Connection,
  userPublicKey: PublicKey
) {
  try {
    const { pda } = await getFaucetRequestPDA(userPublicKey);
    const accountInfo = await connection.getAccountInfo(pda);

    if (!accountInfo) {
      return {
        claimed: false,
        lastClaimTime: null,
        totalClaimed: 0n,
        canClaimNow: true,
        cooldownRemaining: 0,
      };
    }

    // Parse account data (this is simplified - in production you'd use Anchor's account parser)
    // Structure: user (32) + last_claim_time (8) + total_claimed (8) + bump (1)
    const data = accountInfo.data;
    const lastClaimTime = Number(Buffer.from(data.slice(32, 40)).readBigInt64LE());
    const totalClaimed = Buffer.from(data.slice(40, 48)).readBigInt64LE();

    const now = Math.floor(Date.now() / 1000);
    const cooldownRemaining = Math.max(
      0,
      lastClaimTime + Number(FAUCET_CONFIG.cooldownSeconds) - now
    );

    return {
      claimed: true,
      lastClaimTime: new Date(lastClaimTime * 1000),
      totalClaimed,
      canClaimNow: cooldownRemaining === 0,
      cooldownRemaining,
    };
  } catch (error) {
    console.error('[Faucet] Error getting faucet status:', error);
    return {
      claimed: false,
      lastClaimTime: null,
      totalClaimed: 0n,
      canClaimNow: true,
      cooldownRemaining: 0,
    };
  }
}

/**
 * Format cooldown time for display
 */
export function formatCooldown(seconds: number): string {
  if (seconds <= 0) return 'Ready to claim';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s remaining`;
  } else {
    return `${secs}s remaining`;
  }
}

/**
 * Build a complete faucet request transaction
 */
export async function requestFaucetTransaction(
  connection: Connection,
  userPublicKey: PublicKey,
  dexProgramId: PublicKey,
  rialMint: PublicKey,
  recentBlockhash: string
) {
  const { Transaction } = await import('@solana/web3.js');
  
  const instruction = await createRequestFaucetInstruction(
    connection,
    userPublicKey
  );

  const transaction = new Transaction({
    recentBlockhash,
    feePayer: userPublicKey,
  });

  transaction.add(instruction);
  return transaction;
}
