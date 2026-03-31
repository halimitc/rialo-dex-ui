import { Connection, Keypair } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

async function main() {
  console.log("Starting USDC & USDT Treasury Setup...");
  
  // 1. Load Treasury
  let treasury: Keypair;
  const configPath = path.join(os.homedir(), ".config", "solana", "id.json");
  if (fs.existsSync(configPath)) {
    const secretArray = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    treasury = Keypair.fromSecretKey(Uint8Array.from(secretArray));
    console.log("Loaded treasury from id.json: ", treasury.publicKey.toBase58());
  } else {
    console.error("No id.json found. Please run solana-keygen new first.");
    return;
  }

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  const balance = await connection.getBalance(treasury.publicKey);
  console.log("Treasury SOL Balance:", balance / 1e9);

  if (balance < 0.05 * 1e9) {
    console.error("ERROR: Not enough SOL for fees! Please send at least 0.05 SOL to Treasury.");
    console.error(`Treasury address: ${treasury.publicKey.toBase58()}`);
    return;
  }

  // 2. Create New Mint for USDC
  console.log("\\nCreating new USDC Mint...");
  const usdcMint = await createMint(
    connection,
    treasury, // payer
    treasury.publicKey, // mint authority
    null, // freeze authority
    6 // decimals
  );
  console.log("✅ NEW USDC MINT:", usdcMint.toBase58());

  // Create ATA and Mint to Treasury
  console.log("Creating Treasury ATA for USDC...");
  const usdcAta = await getOrCreateAssociatedTokenAccount(connection, treasury, usdcMint, treasury.publicKey);
  console.log("Minting 10,000,000 USDC to Treasury...");
  await mintTo(connection, treasury, usdcMint, usdcAta.address, treasury.publicKey, 10_000_000 * Math.pow(10, 6));

  // 3. Create New Mint for USDT
  console.log("\\nCreating new USDT Mint...");
  const usdtMint = await createMint(
    connection,
    treasury, // payer
    treasury.publicKey, // mint authority
    null, // freeze authority
    6 // decimals
  );
  console.log("✅ NEW USDT MINT:", usdtMint.toBase58());

  // Create ATA and Mint to Treasury
  console.log("Creating Treasury ATA for USDT...");
  const usdtAta = await getOrCreateAssociatedTokenAccount(connection, treasury, usdtMint, treasury.publicKey);
  console.log("Minting 10,000,000 USDT to Treasury...");
  await mintTo(connection, treasury, usdtMint, usdtAta.address, treasury.publicKey, 10_000_000 * Math.pow(10, 6));

  // 4. Update .env.local
  const envPath = path.join(process.cwd(), ".env.local");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  if (envContent.includes("NEXT_PUBLIC_USDC_MINT")) {
    envContent = envContent.replace(/NEXT_PUBLIC_USDC_MINT=.*/, `NEXT_PUBLIC_USDC_MINT=${usdcMint.toBase58()}`);
  } else {
    envContent += `\nNEXT_PUBLIC_USDC_MINT=${usdcMint.toBase58()}`;
  }

  if (envContent.includes("NEXT_PUBLIC_USDT_MINT")) {
    envContent = envContent.replace(/NEXT_PUBLIC_USDT_MINT=.*/, `NEXT_PUBLIC_USDT_MINT=${usdtMint.toBase58()}`);
  } else {
    envContent += `\nNEXT_PUBLIC_USDT_MINT=${usdtMint.toBase58()}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("\\n✅ Updated .env.local with new USDC and USDT MINTS!");
  console.log("=================================");
  console.log("SUCCESS! Please restart your Next.js dev server!");
  console.log("=================================\\n");
}

main().catch(console.error);
