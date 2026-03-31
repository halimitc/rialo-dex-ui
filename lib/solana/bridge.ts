import { DEX_PROGRAM_ID_STR, SEEDS, BRIDGE_CHAINS } from './config';

export type DestChain = typeof BRIDGE_CHAINS[keyof typeof BRIDGE_CHAINS];

/**
 * Get bridge transaction PDA
 */
export async function getBridgeTxPDA(
  userPublicKey: any,
  nonce: bigint
) {
  const { PublicKey } = await import('@solana/web3.js');
  const DEX_PROG = new PublicKey(DEX_PROGRAM_ID_STR);
  
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigInt64LE(nonce, 0);

  const [pda, bump] = await PublicKey.findProgramAddress(
    [SEEDS.BRIDGE_TX, userPublicKey.toBuffer(), nonceBuffer],
    DEX_PROGRAM_ID
  );
  return { pda, bump };
}

/**
 * Get DEX config PDA
 */
export async function getDexConfigPDA() {
  const [pda, bump] = await PublicKey.findProgramAddress(
    [SEEDS.DEX_CONFIG],
    DEX_PROGRAM_ID
  );
  return { pda, bump };
}

/**
 * Create instruction to initiate a bridge transfer
 */
export async function createInitiateBridgeInstruction(
  connection: Connection,
  userPublicKey: PublicKey,
  tokenMint: PublicKey,
  amount: bigint,
  destChain: DestChain,
  nonce: bigint
): Promise<TransactionInstruction> {
  const dexConfig = await getDexConfigPDA();
  const bridgeTx = await getBridgeTxPDA(userPublicKey, nonce);

  // Get user's token account
  const userTokenAccount = await getAssociatedTokenAddress(tokenMint, userPublicKey);

  // Create instruction data
  const instructionData = Buffer.alloc(26); // 1 + 1 + 8 + 8 + 8
  instructionData.writeUInt8(3, 0); // Instruction discriminator for initiate_bridge
  instructionData.writeUInt8(destChain, 1); // Destination chain
  instructionData.writeBigInt64LE(amount, 2);
  instructionData.writeBigInt64LE(nonce, 10);

  const instruction = new TransactionInstruction({
    programId: DEX_PROGRAM_ID,
    keys: [
      { pubkey: dexConfig.pda, isSigner: false, isWritable: false },
      { pubkey: bridgeTx.pda, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  return instruction;
}

/**
 * Create instruction to complete a bridge transfer
 */
export async function createCompleteBridgeInstruction(
  connection: Connection,
  userPublicKey: PublicKey,
  nonce: bigint
): Promise<TransactionInstruction> {
  const bridgeTx = await getBridgeTxPDA(userPublicKey, nonce);

  const instructionData = Buffer.alloc(1);
  instructionData.writeUInt8(4, 0); // Instruction discriminator for complete_bridge

  const instruction = new TransactionInstruction({
    programId: DEX_PROGRAM_ID,
    keys: [
      { pubkey: bridgeTx.pda, isSigner: false, isWritable: true },
      { pubkey: DEX_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  return instruction;
}

/**
 * Get bridge transaction status
 */
export async function getBridgeStatus(
  connection: Connection,
  userPublicKey: PublicKey,
  nonce: bigint
) {
  try {
    const { pda } = await getBridgeTxPDA(userPublicKey, nonce);
    const accountInfo = await connection.getAccountInfo(pda);

    if (!accountInfo) {
      return null;
    }

    // Parse bridge tx data (simplified)
    const data = accountInfo.data;
    const sourceChain = data.readUInt8(8);
    const destChain = data.readUInt8(9);
    const status = data.readUInt8(73); // Adjust offset based on struct layout
    const createdAt = Number(Buffer.from(data.slice(74, 82)).readBigInt64LE());

    return {
      sourceChain: getChainName(sourceChain),
      destChain: getChainName(destChain),
      status: getBridgeStatusName(status),
      createdAt: new Date(createdAt * 1000),
    };
  } catch (error) {
    console.error('[Bridge] Error getting bridge status:', error);
    return null;
  }
}

/**
 * Get chain name from chain type ID
 */
export function getChainName(chainId: number): string {
  switch (chainId) {
    case BRIDGE_CHAINS.SOLANA_DEVNET:
      return 'Solana Devnet';
    case BRIDGE_CHAINS.ETHEREUM_GOERLI:
      return 'Ethereum Goerli';
    case BRIDGE_CHAINS.POLYGON_MUMBAI:
      return 'Polygon Mumbai';
    default:
      return 'Unknown';
  }
}

/**
 * Get bridge status name
 */
export function getBridgeStatusName(statusId: number): string {
  switch (statusId) {
    case 0:
      return 'Initiated';
    case 1:
      return 'Processing';
    case 2:
      return 'Completed';
    case 3:
      return 'Failed';
    default:
      return 'Unknown';
  }
}

/**
 * Generate unique nonce for bridge transaction
 */
export function generateNonce(): bigint {
  return BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
}

/**
 * Validate destination chain
 */
export function isValidBridgeChain(chain: DestChain): boolean {
  return chain === BRIDGE_CHAINS.ETHEREUM_GOERLI || chain === BRIDGE_CHAINS.POLYGON_MUMBAI;
}
