import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { DEX_PROGRAM_ID_STR, SEEDS, POOL_CONFIG, DEX_PROGRAM_ID_STR as DEX_PROGRAM_ID } from './config';

/**
 * Get liquidity pool PDA
 */
export async function getPoolPDA(tokenA: any, tokenB: any) {
  const { PublicKey } = await import('@solana/web3.js');
  const DEX_PROG = new PublicKey(DEX_PROGRAM_ID_STR);
  
  // Sort mints deterministically as done on-chain
  let mintA = tokenA;
  let mintB = tokenB;
  if (mintA.toBuffer().compare(mintB.toBuffer()) > 0) {
    mintA = tokenB;
    mintB = tokenA;
  }
  
  const [pda, bump] = await PublicKey.findProgramAddress(
    [SEEDS.POOL, mintA.toBuffer(), mintB.toBuffer()],
    DEX_PROG
  );
  return { pda, bump, mintA, mintB };
}

/**
 * Calculate output amount for a swap using constant product formula
 * Formula: output = (reserve_b * input * (10000 - fee)) / (10000 * (reserve_a + input * (10000 - fee) / 10000))
 */
export function calculateSwapOutput(
  inputAmount: bigint,
  reserveA: bigint,
  reserveB: bigint,
  feeBps: number = POOL_CONFIG.feeBps
): bigint {
  if (inputAmount === 0n || reserveA === 0n || reserveB === 0n) {
    return 0n;
  }

  const inputWithFee = (inputAmount * BigInt(10000 - feeBps)) / 10000n;
  const numerator = inputWithFee * reserveB;
  const denominator = reserveA + inputWithFee;

  return numerator / denominator;
}

/**
 * Calculate minimum output with slippage tolerance
 */
export function calculateMinOutputWithSlippage(
  outputAmount: bigint,
  slippageBps: number = 50 // 0.5% default
): bigint {
  return (outputAmount * BigInt(10000 - slippageBps)) / 10000n;
}

/**
 * Get pool state and reserves
 */
export async function getPoolState(
  connection: Connection,
  poolPda: PublicKey
) {
  try {
    const accountInfo = await connection.getAccountInfo(poolPda);
    if (!accountInfo) {
      return null;
    }

    // Parse pool account data (simplified)
    // You'd want to use Anchor's AccountCoder in production
    const data = accountInfo.data;
    
    // Skip discriminator (8 bytes) and parse key fields
    const reserveA = Buffer.from(data.slice(96, 104)).readBigInt64LE();
    const reserveB = Buffer.from(data.slice(104, 112)).readBigInt64LE();

    return {
      reserveA: BigInt(reserveA),
      reserveB: BigInt(reserveB),
    };
  } catch (error) {
    console.error('[Swap] Error getting pool state:', error);
    return null;
  }
}

/**
 * Create instruction to execute a swap
 */
export async function createSwapInstruction(
  connection: Connection,
  userPublicKey: PublicKey,
  tokenInMint: PublicKey,
  tokenOutMint: PublicKey,
  inputAmount: bigint,
  minOutputAmount: bigint,
  feeRecipient: PublicKey
): Promise<TransactionInstruction> {
  const pool = await getPoolPDA(tokenInMint, tokenOutMint);

  // Get token accounts
  const userInputAccount = await getAssociatedTokenAddress(tokenInMint, userPublicKey);
  const userOutputAccount = await getAssociatedTokenAddress(tokenOutMint, userPublicKey);
  const feeRecipientAccount = await getAssociatedTokenAddress(tokenOutMint, feeRecipient);

  // Get pool vaults
  const vaultA = await getAssociatedTokenAddress(tokenInMint, pool.pda, true);
  const vaultB = await getAssociatedTokenAddress(tokenOutMint, pool.pda, true);

  // Create swap instruction
  const instructionData = Buffer.alloc(17); // 1 (discriminator) + 8 + 8
  instructionData.writeUInt8(2, 0); // Instruction discriminator for swap
  instructionData.writeBigInt64LE(inputAmount, 1);
  instructionData.writeBigInt64LE(minOutputAmount, 9);

  const instruction = new TransactionInstruction({
    programId: new PublicKey(DEX_PROGRAM_ID),
    keys: [
      { pubkey: pool.pda, isSigner: false, isWritable: true },
      { pubkey: vaultA, isSigner: false, isWritable: true },
      { pubkey: vaultB, isSigner: false, isWritable: true },
      { pubkey: userInputAccount, isSigner: false, isWritable: true },
      { pubkey: userOutputAccount, isSigner: false, isWritable: true },
      { pubkey: feeRecipientAccount, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  return instruction;
}

/**
 * Estimate swap price
 */
export function estimateSwapPrice(
  inputAmount: bigint,
  outputAmount: bigint
): number {
  if (outputAmount === 0n) return 0;
  return Number(inputAmount) / Number(outputAmount);
}

/**
 * Calculate price impact
 */
export function calculatePriceImpact(
  spotPrice: number,
  executionPrice: number
): number {
  if (spotPrice === 0) return 0;
  return ((executionPrice - spotPrice) / spotPrice) * 100;
}

/**
 * Build a complete swap transaction
 */
export async function executeSwapTransaction(
  connection: Connection,
  userPublicKey: PublicKey,
  dexProgramId: PublicKey,
  tokenInMint: PublicKey,
  tokenOutMint: PublicKey,
  inputAmount: bigint,
  slippageBps: number,
  recentBlockhash: string
) {
  const { Transaction } = await import('@solana/web3.js');
  
  // Get pool state to calculate output
  const pool = await getPoolPDA(tokenInMint, tokenOutMint);
  const poolState = await getPoolState(connection, pool.pda);

  if (!poolState) {
    throw new Error('Pool not found or has no liquidity');
  }

  // Sort mints to map reserves properly
  const isTokenInMintA = tokenInMint.toBuffer().compare(pool.mintA.toBuffer()) === 0;
  
  const reserveIn = isTokenInMintA ? poolState.reserveA : poolState.reserveB;
  const reserveOut = isTokenInMintA ? poolState.reserveB : poolState.reserveA;

  if (inputAmount > (reserveIn / BigInt(2))) {
    throw new Error('Swap amount exceeds maximum allowed (50% of vault liquidity)! Suggestion: Try a smaller amount.');
  }

  // Calculate swap output
  const outputAmount = calculateSwapOutput(inputAmount, reserveIn, reserveOut);
  
  if (outputAmount > reserveOut) {
    throw new Error('Required output exceeds available vault liquidity! Suggestion: Try a smaller amount.');
  }

  const minOutputAmount = calculateMinOutputWithSlippage(outputAmount, slippageBps);

  // Create swap instruction
  const instruction = await createSwapInstruction(
    connection,
    userPublicKey,
    tokenInMint,
    tokenOutMint,
    inputAmount,
    minOutputAmount,
    userPublicKey // Fee recipient is user for this implementation
  );

  const transaction = new Transaction({
    recentBlockhash,
    feePayer: userPublicKey,
  });

  transaction.add(instruction);
  return transaction;
}
