import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createSyncNativeInstruction,
  getAccount,
  transfer,
  NATIVE_MINT,
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ============================================
// CONFIGURATION (Replace these with your actual inputs)
// ============================================

// If running in the project root, it will try to load from .env.local
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const CONNECTION_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";

// 1. Mints
const MINT_ADDRESSES = {
  RIAL: new PublicKey(process.env.NEXT_PUBLIC_RIAL_MINT || "3Fi8K61KxcW1emjKCNvY8HFhG7LDSCRnNqbkL9J9Rgom"),
  USDC: new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || "D1vyvEbCbRBnidvHh9krZ5ZfwZSTwHJ8ayhgWRxwqGYd"),
  USDT: new PublicKey(process.env.NEXT_PUBLIC_USDT_MINT || "Efy9AvUx6Fgaavozp9HQSGTWbwsQbQnk85MNpJpLuCyt"),
};

// 2. Vault / Treasury ATA addresses
const VAULT_ADDRESSES: Record<string, PublicKey | null> = {
  // Replace these nulls with actual vault TokenAccount Game pubkeys!
  RIAL: null, 
  USDC: null, 
  USDT: null, 
  wSOL: null, 
};

// Amounts
const MINT_AMOUNT_TOKENS = 1_000_000;
const WSOL_WRAP_AMOUNT_SOL = 10; // Target SOL liquidity minimum (5-10 SOL)

// Dynamic Target Rates Storage
const TARGET_RATIOS: Record<string, number> = {
  USDC: 150,   // Fallback
  USDT: 150,   // Fallback
  RIAL: 150,   // Fallback
};

// ============================================

async function fetchRealSolPrice(): Promise<number> {
  console.log(`\n=== PRICE ALIGNMENT ===`);
  try {
    console.log(`Fetching real SOL price from CoinGecko...`);
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await res.json();
    const price = data.solana.usd;
    
    if (price && typeof price === 'number') {
      console.log(`Current SOL Price: $${price}`);
      console.log(`Assuming: 1 USDC = $1, 1 USDT = $1, 1 RIAL = $1`);
      
      TARGET_RATIOS.USDC = price;
      TARGET_RATIOS.USDT = price;
      TARGET_RATIOS.RIAL = price;
      
      return price;
    }
  } catch (err: any) {
    console.log(`[WARNING] Failed to fetch real SOL price: ${err.message}. Using fallback $150.`);
  }
  return 150;
}

function getSignerKeypair(): Keypair {
  if (process.env.TREASURY_SECRET_KEY) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.TREASURY_SECRET_KEY)));
  }
  const configPath = path.join(os.homedir(), ".config", "solana", "id.json");
  if (fs.existsSync(configPath)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(configPath, "utf-8"))));
  }
  throw new Error("No signer keypair found. Please set TREASURY_SECRET_KEY or have ~/.config/solana/id.json");
}

async function handleMinting(
  connection: Connection,
  signer: Keypair,
  tokenName: string,
  mintPubkey: PublicKey
): Promise<PublicKey | null> {
  console.log(`\n=== TOKEN STATUS (${tokenName}) ===`);
  console.log(`Mint: ${mintPubkey.toBase58()}`);

  try {
    const mintInfo = await getMint(connection, mintPubkey);
    console.log(`Supply: ${mintInfo.supply}`);
    console.log(`Mint Authority: ${mintInfo.mintAuthority?.toBase58() || "null"}`);

    // Get or create wallet ATA for this token
    const walletAta = await getOrCreateAssociatedTokenAccount(
      connection,
      signer, // payer
      mintPubkey, // mint
      signer.publicKey // owner
    );

    if (mintInfo.supply === BigInt(0) && mintInfo.mintAuthority) {
      console.log(`\n[!] Supply is zero. Minting ${MINT_AMOUNT_TOKENS} ${tokenName} new tokens...`);
      
      const amountToMint = BigInt(MINT_AMOUNT_TOKENS) * BigInt(Math.pow(10, mintInfo.decimals));
      
      const mintTx = await mintTo(
        connection,
        signer, // payer
        mintPubkey, // mint
        walletAta.address, // destination
        signer, // authority
        amountToMint
      );
      
      console.log(`Mint TX: ${mintTx}`);
    } else if (!mintInfo.mintAuthority && mintInfo.supply === BigInt(0)) {
      console.log(`\n[WARNING] Mint authority is NULL and supply is zero. Cannot mint!`);
    }

    return walletAta.address;
  } catch (error: any) {
    console.log(`[ERROR] Failed to fetch mint info for ${tokenName}: ${error.message}`);
    return null;
  }
}

async function handleSolVault(connection: Connection, signer: Keypair, vaultAddress: PublicKey | null) {
  if (!vaultAddress) {
    console.log(`\n=== SOL VAULT STATUS ===`);
    console.log(`[SKIPPED] SOL Vault address not provided in VAULT_ADDRESSES.wSOL`);
    return;
  }

  const requiredMinimum = BigInt(WSOL_WRAP_AMOUNT_SOL * LAMPORTS_PER_SOL); // Require sufficient SOL in the pool
  let currentBalance = BigInt(0);

  try {
    const vaultAccount = await getAccount(connection, vaultAddress);
    currentBalance = vaultAccount.amount;
  } catch (e) {
    // If account doesn't exist or is not initialized, balance is effectively 0
  }

  console.log(`\n=== SOL VAULT STATUS ===`);
  console.log(`Vault Address: ${vaultAddress.toBase58()}`);
  console.log(`Balance: ${currentBalance}`);
  
  if (currentBalance >= requiredMinimum) {
    console.log(`Status: OK`);
    return;
  }

  console.log(`Status: INSUFFICIENT`);
  console.log(`\n=== SOL LIQUIDITY FIX (CRITICAL) ===`);
  console.log(`SOL vault balance is insufficient (requires ${requiredMinimum}). Automatically topping up from wallet...`);

  try {
    const walletAta = await getOrCreateAssociatedTokenAccount(
      connection,
      signer,
      NATIVE_MINT,
      signer.publicKey
    );

    const amountLamports = WSOL_WRAP_AMOUNT_SOL * LAMPORTS_PER_SOL;

    console.log(`Wrapping ${WSOL_WRAP_AMOUNT_SOL} SOL into wSOL...`);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: walletAta.address,
        lamports: amountLamports,
      }),
      createSyncNativeInstruction(walletAta.address)
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [signer]);
    console.log(`Wrapped SOL TX: ${sig}`);

    console.log(`Transferring ${WSOL_WRAP_AMOUNT_SOL} wSOL to SOL Vault: ${vaultAddress.toBase58()}`);
    const transferSig = await transfer(
      connection,
      signer, // payer
      walletAta.address, // source
      vaultAddress, // destination
      signer, // owner
      BigInt(amountLamports)
    );
    console.log(`Success! Sent wSOL to Vault. TX: ${transferSig}`);
    
    // Re-validate
    const newVaultAccount = await getAccount(connection, vaultAddress);
    console.log(`\n=== FINAL SOL VAULT STATUS ===`);
    console.log(`Vault Address: ${vaultAddress.toBase58()}`);
    console.log(`Balance: ${newVaultAccount.amount}`);
    console.log(`Status: ${newVaultAccount.amount >= requiredMinimum ? 'OK' : 'INSUFFICIENT'}`);
    
  } catch (error: any) {
    console.log(`[ERROR] Failed to fix SOL liquidity: ${error.message}`);
  }
}

async function fundVault(
  connection: Connection,
  signer: Keypair,
  tokenName: string,
  mintPubkey: PublicKey,
  sourceAta: PublicKey,
  vaultAddress: PublicKey | null
) {
  if (!vaultAddress) {
    console.log(`\n=== TRANSFERS (${tokenName}) ===`);
    console.log(`[SKIPPED] Vault address not provided for ${tokenName}`);
    return;
  }

  console.log(`\n=== TRANSFERS (${tokenName}) ===`);
  try {
    const mintInfo = await getMint(connection, mintPubkey);
    
    // Dynamically calculate balanced token liquidity to match SOL value
    const tokenPriceRatio = TARGET_RATIOS[tokenName] || 150; // default to $150 per SOL
    const balancedTokenAmount = WSOL_WRAP_AMOUNT_SOL * tokenPriceRatio;
    const transferAmountRaw = BigInt(balancedTokenAmount) * BigInt(Math.pow(10, mintInfo.decimals));

    console.log(`Target Liquidity Balance: 1 SOL = ${tokenPriceRatio} ${tokenName}`);
    console.log(`Funding Amount: ${balancedTokenAmount} ${tokenName}`);
    console.log(`Sending tokens from ${sourceAta.toBase58()} to Vault: ${vaultAddress.toBase58()}`);

    const txSig = await transfer(
      connection,
      signer, // payer
      sourceAta, // source
      vaultAddress, // destination
      signer, // owner
      transferAmountRaw
    );

    console.log(`Success! Sent tokens to Vault: ${vaultAddress.toBase58()}`);
    console.log(`TX: ${txSig}`);

  } catch (error: any) {
    console.log(`[ERROR] Transfer failed for ${tokenName}: ${error.message}`);
  }
}

async function validateVaults(connection: Connection, tokenName: string, vaultAddress: PublicKey | null) {
  if (!vaultAddress) return;

  console.log(`\n=== FINAL LIQUIDITY (${tokenName}) ===`);
  try {
    const vaultAccount = await getAccount(connection, vaultAddress);
    console.log(`Vault: ${vaultAddress.toBase58()}`);
    console.log(`Balance: ${vaultAccount.amount}`);
    if (vaultAccount.amount > BigInt(0)) {
      console.log(`Status: Liquidity is NON-ZERO! Ready for swaps.`);
    } else {
      console.log(`Status: liquidity is ZERO.`);
    }
  } catch (error: any) {
    console.log(`[ERROR] Failed to fetch vault balance for ${vaultAddress.toBase58()}: ${error.message}`);
  }
}

async function main() {
  console.log("Starting Treasury Liquidity Funding Script...");
  
  await fetchRealSolPrice();

  const connection = new Connection(CONNECTION_RPC, "confirmed");
  const signer = getSignerKeypair();
  
  console.log(`Signer Wallet: ${signer.publicKey.toBase58()}`);
  
  const sourceAtas: Record<string, PublicKey> = {};

  // 1 & 2. Check Token State and Mint Supply (Excluding SOL)
  for (const [tokenName, mintAddress] of Object.entries(MINT_ADDRESSES)) {
    const sourceAta = await handleMinting(connection, signer, tokenName, mintAddress);
    if (sourceAta) {
      sourceAtas[tokenName] = sourceAta;
    }
  }

  // 3. Fund Token Vaults
  for (const [tokenName, mintAddress] of Object.entries(MINT_ADDRESSES)) {
    const sourceAta = sourceAtas[tokenName];
    const vaultAddress = VAULT_ADDRESSES[tokenName];
    
    if (sourceAta) {
       await fundVault(connection, signer, tokenName, mintAddress, sourceAta, vaultAddress);
    }
  }

  // 4. Critical SOL Liquidity Fix
  await handleSolVault(connection, signer, VAULT_ADDRESSES.wSOL);

  // 5. Validation
  console.log("\n-------------------------------------------");
  for (const [tokenName, vaultAddress] of Object.entries(VAULT_ADDRESSES)) {
    if (tokenName !== 'wSOL') {
      await validateVaults(connection, tokenName, vaultAddress);
    }
  }
  console.log("-------------------------------------------\n");
  console.log("Script Execution Complete.");
}

main().catch((err) => {
  console.error("Fatal Error:", err);
});
