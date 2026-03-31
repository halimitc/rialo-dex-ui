/**
 * RIALO DEX - Solana Devnet Configuration
 * 
 * Environment Variables Required:
 * - NEXT_PUBLIC_DEX_PROGRAM_ID: Deployed Anchor program ID on Devnet
 * - NEXT_PUBLIC_RIAL_MINT: RIAL token mint address on Devnet
 * - NEXT_PUBLIC_SOLANA_RPC: (Optional) Custom Devnet RPC URL
 */

// Solana Devnet RPC - use default public RPC to avoid module loading issues
export const Devnet_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
export const DEVNET_RPC = Devnet_RPC; // Backward compatibility - points to Devnet
export const NETWORK = 'devnet'; // Use standardized 'devnet'

// ⚠️ UPDATE THESE WITH YOUR DEPLOYED ADDRESSES ⚠️
// Using string addresses to avoid PublicKey initialization issues in preview environment
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJsyFbPVwwQQftas5call5pVM5gdk'; // SPL Token Program
const DEFAULT_USDC_MINT = '4zMMC9srt5Ri5X14Gye5QZ5yi9GeZymQuNCjaSstB5Ty'; // USDC-Dev on Devnet
const DEFAULT_USDT_MINT = 'Ejmc1UB4EsES5oAaRN63Spoxs81exHQVr1b6M7tEbvW'; // Dummy placeholder

// Export as strings - convert to PublicKey in hooks/components where needed
export const DEX_PROGRAM_ID_STR = (process.env.NEXT_PUBLIC_DEX_PROGRAM_ID || TOKEN_PROGRAM).trim();
export const RIAL_MINT_STR = (process.env.NEXT_PUBLIC_RIAL_MINT || DEFAULT_USDC_MINT).trim();
export const USDC_MINT_STR = (process.env.NEXT_PUBLIC_USDC_MINT || DEFAULT_USDC_MINT).trim();
export const USDT_MINT_STR = (process.env.NEXT_PUBLIC_USDT_MINT || DEFAULT_USDT_MINT).trim();

// Backward compatibility - export string versions with original names
export const DEX_PROGRAM_ID = DEX_PROGRAM_ID_STR;
export const RIAL_MINT = RIAL_MINT_STR;

// Network configuration
export const NETWORKS = {
  devnet: {
    name: 'Solana Devnet',
    rpcUrl: Devnet_RPC,
    explorerUrl: 'https://solscan.io',
    explorerUrlParam: '?cluster=devnet',
  },
};

// Token mint strings on Solana Devnet
export const TOKEN_MINTS = {
  RIAL: RIAL_MINT_STR,
  USDC: USDC_MINT_STR,
  USDT: USDT_MINT_STR,
  SOL: 'native', // Native SOL uses special handling
};

// Default faucet settings (matches smart contract)
export const FAUCET_CONFIG = {
  amount: 100_000_000n, // 100 RIAL (with 6 decimals)
  cooldownSeconds: 86400, // 24 hours
  requestsPerDay: 1,
};

// Pool configuration (matches smart contract)
export const POOL_CONFIG = {
  feeBps: 25, // 0.25% fee
  minLiquidity: 1_000_000n, // 1 RIAL
};

// PDA seeds (must match Anchor program)
export const SEEDS = {
  DEX_CONFIG: Buffer.from('dex_config'),
  FAUCET_REQUEST: Buffer.from('faucet_request'),
  POOL: Buffer.from('pool'),
  BRIDGE_TX: Buffer.from('bridge_tx'),
};

// Destination chains for bridge (must match Anchor program)
export const BRIDGE_CHAINS = {
  SOLANA_Devnet: 0,
  ETHEREUM_Devnet: 1,
  POLYGON_MUMBAI: 2,
} as const;

// Transaction settings
export const TRANSACTION_CONFIG = {
  maxRetries: 5,
  blockhashCacheExpiry: 120000, // 2 minutes
  confirmationTimeout: 30000, // 30 seconds
};

// Solscan explorer helper
export function getSolscanUrl(txHash: string, network: string = 'devnet'): string {
  const clusterFlag = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://solscan.io/tx/${txHash}${clusterFlag}`;
}

export function getSolscanAddressUrl(address: string, network: string = 'devnet'): string {
  const clusterFlag = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `https://solscan.io/address/${address}${clusterFlag}`;
}

// Helper to create PublicKey safely when needed (deferred to runtime)
export function toPublicKey(address: string) {
  try {
    const { PublicKey } = require('@solana/web3.js');
    return new PublicKey(address);
  } catch (error) {
    console.error('[v0] Failed to create PublicKey:', error);
    return null;
  }
}
