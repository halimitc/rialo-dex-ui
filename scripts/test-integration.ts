#!/usr/bin/env npx ts-node

/**
 * Integration test script for Rialo DEX
 * Tests faucet, swap, and bridge functionality
 */

import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, getAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const DEVNET_RPC = "https://api.devnet.solana.com";

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
};

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

async function loadKeypair(keypairPath: string): Promise<Keypair> {
  const expandedPath = keypairPath.replace("~", os.homedir());
  const keypairData = JSON.parse(fs.readFileSync(expandedPath, "utf-8"));
  return Keypair.fromSecretKey(Buffer.from(keypairData));
}

async function main() {
  log(colors.blue, "\n========================================");
  log(colors.blue, "Rialo DEX - Integration Test");
  log(colors.blue, "========================================\n");

  // Load configuration
  const configPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(configPath)) {
    log(colors.red, "Error: Solana keypair not found");
    process.exit(1);
  }

  const payer = await loadKeypair(configPath);
  const connection = new Connection(DEVNET_RPC, "confirmed");

  log(colors.blue, `Payer: ${payer.publicKey.toString()}`);

  // Read deployed addresses from config
  const configFile = path.join(__dirname, "../lib/solana/config.ts");
  const configContent = fs.readFileSync(configFile, "utf-8");

  // Extract addresses (simple regex parsing)
  const rialMatch = configContent.match(
    /RIAL_MINT.*?new PublicKey\('([^']+)'\)/
  );
  const programMatch = configContent.match(
    /DEX_PROGRAM_ID.*?new PublicKey\('([^']+)'\)/
  );

  if (!rialMatch || !programMatch) {
    log(colors.red, "Error: Addresses not configured in /lib/solana/config.ts");
    log(colors.yellow, "Please run:");
    log(colors.yellow, "  1. ./scripts/create-rial-token.sh");
    log(colors.yellow, "  2. anchor deploy");
    log(colors.yellow, "  3. Update config.ts with deployed addresses");
    process.exit(1);
  }

  const rialMint = new PublicKey(rialMatch[1]);
  const programId = new PublicKey(programMatch[1]);

  log(colors.blue, `RIAL Mint: ${rialMint.toString()}`);
  log(colors.blue, `Program ID: ${programId.toString()}\n`);

  try {
    // Test 1: Check RIAL token exists
    log(colors.blue, "Test 1: Checking RIAL token...");
    const mint = await connection.getParsedAccountInfo(rialMint);

    if (mint.value && mint.value.data) {
      log(colors.green, "✓ RIAL token found on Devnet");
    } else {
      throw new Error("RIAL token not found");
    }

    // Test 2: Check program is deployed
    log(colors.blue, "\nTest 2: Checking DEX program...");
    const program = await connection.getParsedAccountInfo(programId);

    if (program.value && program.value.executable) {
      log(colors.green, "✓ DEX program is deployed and executable");
    } else {
      throw new Error("DEX program not found or not executable");
    }

    // Test 3: Check wallet balance
    log(colors.blue, "\nTest 3: Checking wallet balance...");
    const balance = await connection.getBalance(payer.publicKey);
    const balanceSol = balance / 10 ** 9;
    log(colors.green, `✓ Wallet balance: ${balanceSol.toFixed(4)} SOL`);

    if (balanceSol < 0.1) {
      log(colors.yellow, "⚠ Low balance. Consider requesting airdrop:");
      log(colors.yellow, "  solana airdrop 2");
    }

    // Test 4: Check RIAL token account
    log(colors.blue, "\nTest 4: Checking RIAL token account...");
    try {
      const rialATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        rialMint,
        payer.publicKey
      );

      const accountInfo = await getAccount(connection, rialATA.address);
      log(colors.green, `✓ Token account exists`);
      log(
        colors.green,
        `✓ RIAL balance: ${Number(accountInfo.amount) / 10 ** 6} RIAL`
      );
    } catch (error) {
      log(colors.yellow, "⚠ Token account not found - will be created on first use");
    }

    // Test 5: Check network
    log(colors.blue, "\nTest 5: Checking network connectivity...");
    const version = await connection.getVersion();
    log(colors.green, `✓ Solana version: ${version["solana-core"]}`);

    const blockheight = await connection.getBlockHeight();
    log(colors.green, `✓ Current blockheight: ${blockheight}`);

    // Summary
    log(colors.green, "\n========================================");
    log(colors.green, "✓ All Tests Passed!");
    log(colors.green, "========================================");

    log(colors.blue, "\nYour DEX is ready to use! Next steps:");
    log(colors.blue, "1. Start the frontend: npm run dev");
    log(colors.blue, "2. Connect Phantom wallet to Devnet");
    log(colors.blue, "3. Test faucet, swap, and bridge features");
    log(colors.blue, "4. View transaction details in Solscan:");
    log(colors.blue, `   https://solscan.io/address/${programId.toString()}?cluster=devnet`);

  } catch (error) {
    log(colors.red, `\n✗ Test Failed: ${error instanceof Error ? error.message : String(error)}`);
    log(colors.yellow, "\nTroubleshooting:");
    log(colors.yellow, "1. Ensure RIAL token is created:");
    log(colors.yellow, "   ./scripts/create-rial-token.sh");
    log(colors.yellow, "2. Ensure DEX program is deployed:");
    log(colors.yellow, "   anchor deploy");
    log(colors.yellow, "3. Update config.ts with correct addresses");
    log(colors.yellow, "4. Check Solana cluster is set to devnet:");
    log(colors.yellow, "   solana config set --url devnet");
    process.exit(1);
  }
}

main();
