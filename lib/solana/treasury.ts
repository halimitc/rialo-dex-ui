import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Load Treasury Keypair from default local Solana CLI path or Environment Variable
export function getTreasuryKeypair(): Keypair | null {
  try {
    // 1. Try Environment Variable first
    if (process.env.TREASURY_SECRET_KEY) {
      const secretArray = JSON.parse(process.env.TREASURY_SECRET_KEY);
      return Keypair.fromSecretKey(Uint8Array.from(secretArray));
    }

    // 2. Try default Solana CLI path on local machine (for devnet testing)
    const configPath = path.join(os.homedir(), ".config", "solana", "id.json");
    if (fs.existsSync(configPath)) {
      const secretArray = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return Keypair.fromSecretKey(Uint8Array.from(secretArray));
    }

    console.warn("⚠️ No Treasury Keypair found. Faucet and Swap on Devnet might not work properly.");
    return null;
  } catch (error) {
    console.error("Error loading Treasury Keypair:", error);
    return null;
  }
}
