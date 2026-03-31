import { Connection, Keypair } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

async function main() {
  console.log("Starting Treasury Setup...");
  
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

  // Airdrop some SOL just in case
  const balance = await connection.getBalance(treasury.publicKey);
  console.log("Treasury SOL Balance:", balance / 1e9);

  if (balance < 0.05 * 1e9) {
    console.error("ERROR: Not enough SOL for fees! Please send at least 0.05 SOL to Treasury.");
    console.error(`Treasury address: ${treasury.publicKey.toBase58()}`);
    return;
  }

  // 2. Create New Mint for RIAL
  console.log("Creating new RIAL Mint...");
  const mint = await createMint(
    connection,
    treasury, // payer
    treasury.publicKey, // mint authority
    null, // freeze authority
    6 // decimals
  );
  console.log("✅ NEW RIAL MINT:", mint.toBase58());

  // 3. Create ATA for Treasury
  console.log("Creating Treasury ATA...");
  const treasuryAta = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    mint,
    treasury.publicKey
  );
  console.log("Treasury ATA:", treasuryAta.address.toBase58());

  // 4. Mint 10,000,000 RIAL tokens to Treasury
  const amountToMint = 10_000_000 * Math.pow(10, 6);
  console.log(`Minting 10,000,000 RIAL to Treasury...`);
  await mintTo(
    connection,
    treasury,
    mint,
    treasuryAta.address,
    treasury.publicKey,
    amountToMint
  );
  console.log("✅ Minted successfully!");

  // 5. Update .env.local
  const envPath = path.join(process.cwd(), ".env.local");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  if (envContent.includes("NEXT_PUBLIC_RIAL_MINT")) {
    envContent = envContent.replace(/NEXT_PUBLIC_RIAL_MINT=.*/, `NEXT_PUBLIC_RIAL_MINT=${mint.toBase58()}`);
  } else {
    envContent += `\nNEXT_PUBLIC_RIAL_MINT=${mint.toBase58()}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Updated .env.local with new NEXT_PUBLIC_RIAL_MINT!");
  console.log("\n=================================");
  console.log("SUCCESS! Please restart your Next.js dev server!");
  console.log("=================================\n");
}

main().catch(console.error);
