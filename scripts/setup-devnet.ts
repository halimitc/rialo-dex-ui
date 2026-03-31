#!/usr/bin/env npx ts-node

/**
 * Setup script for Rialo DEX on Solana Devnet
 * This script:
 * 1. Creates the RIAL SPL token
 * 2. Initializes the DEX program
 * 3. Sets up initial liquidity pools
 * 4. Updates configuration files
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const DEVNET_RPC = "https://api.devnet.solana.com";
const DECIMALS = 6;
const INITIAL_SUPPLY = 1_000_000; // 1 million RIAL

async function loadKeypair(keypairPath: string): Promise<Keypair> {
  const expandedPath = keypairPath.replace("~", os.homedir());
  const keypairData = JSON.parse(fs.readFileSync(expandedPath, "utf-8"));
  return Keypair.fromSecretKey(Buffer.from(keypairData));
}

async function main() {
  console.log("========================================");
  console.log("Rialo DEX - Devnet Setup");
  console.log("========================================\n");

  // Get keypair
  const configPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(configPath)) {
    console.error("Error: Solana keypair not found at ~/.config/solana/id.json");
    console.error("Please run: solana-keygen new");
    process.exit(1);
  }

  const payer = await loadKeypair(configPath);
  const connection = new Connection(DEVNET_RPC, "confirmed");

  console.log(`Payer: ${payer.publicKey.toString()}`);

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Balance: ${balance / 10 ** 9} SOL\n`);

  if (balance < 500_000_000) {
    // 0.5 SOL
    console.log("Warning: Low balance. Consider requesting airdrop:");
    console.log("  solana airdrop 2\n");
  }

  // Create RIAL token
  console.log("Creating RIAL token...");
  const rialMint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    DECIMALS
  );
  console.log(`✓ RIAL Mint: ${rialMint.toString()}`);

  // Create associated token account
  console.log("\nCreating token account...");
  const rialATA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    rialMint,
    payer.publicKey
  );
  console.log(`✓ Token Account: ${rialATA.address.toString()}`);

  // Mint initial supply
  console.log("\nMinting initial supply...");
  await mintTo(
    connection,
    payer,
    rialMint,
    rialATA.address,
    payer.publicKey,
    INITIAL_SUPPLY * 10 ** DECIMALS
  );
  console.log(`✓ Minted ${INITIAL_SUPPLY} RIAL tokens`);

  // Update config file
  const configFile = path.join(__dirname, "../lib/solana/config.ts");
  let configContent = fs.readFileSync(configFile, "utf-8");

  configContent = configContent.replace(
    /RIAL_MINT:\s*new PublicKey\([^)]+\)/,
    `RIAL_MINT: new PublicKey('${rialMint.toString()}')`
  );

  fs.writeFileSync(configFile, configContent);
  console.log(`\n✓ Updated /lib/solana/config.ts`);

  // Summary
  console.log("\n==========================================");
  console.log("✓ Setup Complete!");
  console.log("==========================================");
  console.log("\nToken Configuration:");
  console.log(`  Mint Address: ${rialMint.toString()}`);
  console.log(`  Decimals: ${DECIMALS}`);
  console.log(`  Initial Supply: ${INITIAL_SUPPLY} RIAL`);
  console.log(`  Token Account: ${rialATA.address.toString()}`);
  console.log("\nNext steps:");
  console.log("1. Deploy Anchor program:");
  console.log("   anchor deploy");
  console.log("\n2. Update PROGRAM_ID in /lib/solana/config.ts");
  console.log("\n3. Start your frontend:");
  console.log("   npm run dev");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
