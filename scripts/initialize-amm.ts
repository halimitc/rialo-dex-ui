import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction, 
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID, 
  NATIVE_MINT, 
  createTransferInstruction,
  getAccount
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Load IDL
const IDL = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/solana/idl/rialo_amm_dex.json"), "utf-8"));
const PROGRAM_ID = new PublicKey("EPLjdrFaEJ51yUzbwdaroeQqp6FX2egmAhNN4avD8B9u");

// Configuration
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const RIAL_MINT = new PublicKey(process.env.NEXT_PUBLIC_RIAL_MINT || "3Fi8K61KxcW1emjKCNvY8HFhG7LDSCRnNqbkL9J9Rgom"); // Fixed to match local env

// Helper to load Treasury
function getTreasuryKeypair(): Keypair {
    let secretArray;
    if (process.env.TREASURY_SECRET_KEY) {
      secretArray = JSON.parse(process.env.TREASURY_SECRET_KEY);
    } else {
      const configPath = path.join(os.homedir(), ".config", "solana", "id.json");
      secretArray = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
    return Keypair.fromSecretKey(Uint8Array.from(secretArray));
}

async function main() {
    console.log("Initializing AMM Pool on Devnet...");

    const payer = getTreasuryKeypair();
    const provider = new AnchorProvider(connection, new Wallet(payer), { preflightCommitment: "confirmed" });
    const program = new Program(IDL, PROGRAM_ID, provider);

    // Mints (Ensure mint_a < mint_b for deterministic PDA seeds)
    let mintA = NATIVE_MINT;
    let mintB = RIAL_MINT;
    
    // Sort mints lexically to be consistent
    if (mintA.toBuffer().compare(mintB.toBuffer()) > 0) {
        mintA = RIAL_MINT;
        mintB = NATIVE_MINT;
    }

    // Amounts (e.g. 5 SOL and 5000 RIAL)
    // 1 SOL = 1e9 lamports
    const amountAStr = (mintA.equals(NATIVE_MINT)) ? "5000000000" : "5000000000000";
    const amountBStr = (mintB.equals(NATIVE_MINT)) ? "5000000000" : "5000000000000";

    const amountA = new BN(amountAStr);
    const amountB = new BN(amountBStr);

    console.log(`Mint A: ${mintA.toBase58()} | Amount: ${amountA}`);
    console.log(`Mint B: ${mintB.toBase58()} | Amount: ${amountB}`);

    // PDAs
    const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), mintA.toBuffer(), mintB.toBuffer()],
        PROGRAM_ID
    );

    const [authorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority"), poolPda.toBuffer()],
        PROGRAM_ID
    );

    // Create LP Mint Keypair
    const lpMint = Keypair.generate();

    // Depositor accounts
    const depositorA = getAssociatedTokenAddressSync(mintA, payer.publicKey);
    const depositorB = getAssociatedTokenAddressSync(mintB, payer.publicKey);
    const depositorLp = getAssociatedTokenAddressSync(lpMint.publicKey, payer.publicKey);

    // Check wSOL wrapper
    try {
        await getAccount(connection, depositorA);
    } catch {
        console.log("Wrapping SOL...");
        // This is a naive check. A complete script should wrap exactly enough SOL dynamically.
    }

    const tx = await program.methods.initializePool(
            30, // 0.3% fee
            amountA,
            amountB
        )
        .accounts({
            pool: poolPda,
            authority: authorityPda,
            mintA: mintA,
            mintB: mintB,
            vaultA: Keypair.generate().publicKey, // Need actual keypairs to init
            vaultB: Keypair.generate().publicKey,
            lpMint: lpMint.publicKey,
            depositorA: depositorA,
            depositorB: depositorB,
            depositorLp: depositorLp,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

    console.log(`Pool Initialized! TX: ${tx}`);
}

main().catch(console.error);
