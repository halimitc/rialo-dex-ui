import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token';

/**
 * Get token balance for a user
 */
export async function getTokenBalance(
  connection: any,
  tokenMint: any,
  userPublicKey: any
): Promise<bigint> {
  try {
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, userPublicKey);
    const account = await getAccount(connection, tokenAccount);
    return account.amount;
  } catch (error) {
    console.error('[Token] Error getting token balance:', error);
    return 0n;
  }
}

/**
 * Get SOL balance
 */
export async function getSolBalance(
  connection: Connection,
  userPublicKey: PublicKey
): Promise<bigint> {
  try {
    const balance = await connection.getBalance(userPublicKey);
    return BigInt(balance);
  } catch (error) {
    console.error('[Token] Error getting SOL balance:', error);
    return 0n;
  }
}

/**
 * Check if token account exists
 */
export async function tokenAccountExists(
  connection: Connection,
  tokenMint: PublicKey,
  userPublicKey: PublicKey
): Promise<boolean> {
  try {
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, userPublicKey);
    const account = await connection.getAccountInfo(tokenAccount);
    return account !== null;
  } catch (error) {
    console.error('[Token] Error checking token account:', error);
    return false;
  }
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number = 6
): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

/**
 * Parse token amount to bigint with decimals
 */
export function parseTokenAmount(
  amount: string,
  decimals: number = 6
): bigint {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0');
  const fraction = parts[1] || '0';

  const fractionBigInt = BigInt(fraction.padEnd(decimals, '0').slice(0, decimals));
  return whole * (10n ** BigInt(decimals)) + fractionBigInt;
}

/**
 * Get detailed token account info
 */
export async function getTokenAccountInfo(
  connection: Connection,
  tokenMint: PublicKey,
  userPublicKey: PublicKey
) {
  try {
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, userPublicKey);
    const account = await getAccount(connection, tokenAccount);
    const mintInfo = await getMint(connection, account.mint);

    return {
      address: tokenAccount,
      mint: account.mint,
      owner: account.owner,
      amount: account.amount,
      decimals: mintInfo.decimals,
      isNative: account.isNative,
      isFrozen: account.isFrozen,
    };
  } catch (error) {
    console.error('[Token] Error getting token account info:', error);
    return null;
  }
}

/**
 * Compare token addresses
 */
export function compareTokens(
  tokenA: PublicKey | null | undefined,
  tokenB: PublicKey | null | undefined
): boolean {
  if (!tokenA || !tokenB) return false;
  return tokenA.equals(tokenB);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / 1_000_000_000;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * 1_000_000_000));
}
