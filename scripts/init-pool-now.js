const { Connection, Keypair, PublicKey, SystemProgram, Transaction, SYSVAR_RENT_PUBKEY, sendAndConfirmTransaction } = require("@solana/web3.js");
const { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, createSyncNativeInstruction, MINT_SIZE, ACCOUNT_SIZE, createInitializeMint2Instruction, createInitializeAccount3Instruction } = require("@solana/spl-token");
const anchor = require("@coral-xyz/anchor");
const fs = require("fs");
const path = require("path");
const os = require("os");

const IDL = require("../lib/solana/idl/rialo_amm_dex.json");

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const PROGRAM_ID = new PublicKey("EPLjdrFaEJ51yUzbwdaroeQqp6FX2egmAhNN4avD8B9u");
const RIAL_MINT = new PublicKey(process.env.NEXT_PUBLIC_RIAL_MINT || "3Fi8K61KxcW1emjKCNvY8HFhG7LDSCRnNqbkL9J9Rgom");

function getTreasuryKeypair() {
    require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
    if (process.env.TREASURY_SECRET_KEY) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.TREASURY_SECRET_KEY)));
    }
    const configPath = path.join(os.homedir(), ".config", "solana", "id.json");
    if (fs.existsSync(configPath)) {
        return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(configPath, "utf-8"))));
    }
    return null;
}

async function main() {
    const treasury = getTreasuryKeypair();
    if (!treasury) throw new Error("No treasury keypair found");
    console.log("Treasury:", treasury.publicKey.toBase58());

    let mintA = NATIVE_MINT;
    let mintB = RIAL_MINT;
    if (mintA.toBuffer().compare(mintB.toBuffer()) > 0) {
        mintA = RIAL_MINT;
        mintB = NATIVE_MINT;
    }

    const [poolPda] = PublicKey.findProgramAddressSync([Buffer.from("pool"), mintA.toBuffer(), mintB.toBuffer()], PROGRAM_ID);
    const [authorityPda] = PublicKey.findProgramAddressSync([Buffer.from("authority"), poolPda.toBuffer()], PROGRAM_ID);

    console.log("Pool PDA:", poolPda.toBase58());
    console.log("Auth PDA:", authorityPda.toBase58());

    const dummyWallet = {
      publicKey: treasury.publicKey,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    };
    const provider = new anchor.AnchorProvider(connection, dummyWallet, { preflightCommitment: "confirmed" });
    const program = new anchor.Program(IDL, PROGRAM_ID, provider);

    try {
        await program.account.pool.fetch(poolPda);
        console.log("Pool already initialized!");
        return;
    } catch {}

    const amountAStr = mintA.equals(NATIVE_MINT) ? "2000000000" : "5000000000000"; // 2 SOL or 5000 RIAL
    const amountBStr = mintB.equals(NATIVE_MINT) ? "2000000000" : "5000000000000"; // 2 SOL or 5000 RIAL
    const amountA = new anchor.BN(amountAStr);
    const amountB = new anchor.BN(amountBStr);

    const lpMint = Keypair.generate();
    const vaultA = Keypair.generate();
    const vaultB = Keypair.generate();

    const depositorA = getAssociatedTokenAddressSync(mintA, treasury.publicKey);
    const depositorB = getAssociatedTokenAddressSync(mintB, treasury.publicKey);
    const depositorLp = getAssociatedTokenAddressSync(lpMint.publicKey, treasury.publicKey);

    const tx = new Transaction();
    
    const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const tokenRent = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);

    tx.add(SystemProgram.createAccount({ fromPubkey: treasury.publicKey, newAccountPubkey: lpMint.publicKey, lamports: mintRent, space: MINT_SIZE, programId: TOKEN_PROGRAM_ID }));
    tx.add(createInitializeMint2Instruction(lpMint.publicKey, 9, authorityPda, null, TOKEN_PROGRAM_ID));

    tx.add(SystemProgram.createAccount({ fromPubkey: treasury.publicKey, newAccountPubkey: vaultA.publicKey, lamports: tokenRent, space: ACCOUNT_SIZE, programId: TOKEN_PROGRAM_ID }));
    tx.add(createInitializeAccount3Instruction(vaultA.publicKey, mintA, authorityPda, TOKEN_PROGRAM_ID));

    tx.add(SystemProgram.createAccount({ fromPubkey: treasury.publicKey, newAccountPubkey: vaultB.publicKey, lamports: tokenRent, space: ACCOUNT_SIZE, programId: TOKEN_PROGRAM_ID }));
    tx.add(createInitializeAccount3Instruction(vaultB.publicKey, mintB, authorityPda, TOKEN_PROGRAM_ID));

    const depAInfo = await connection.getAccountInfo(depositorA);
    if (!depAInfo) tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, depositorA, treasury.publicKey, mintA));
    if (mintA.equals(NATIVE_MINT)) {
        tx.add(SystemProgram.transfer({ fromPubkey: treasury.publicKey, toPubkey: depositorA, lamports: amountA.toNumber() }));
        tx.add(createSyncNativeInstruction(depositorA));
    }
    
    const depBInfo = await connection.getAccountInfo(depositorB);
    if (!depBInfo) tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, depositorB, treasury.publicKey, mintB));
    if (mintB.equals(NATIVE_MINT)) {
        tx.add(SystemProgram.transfer({ fromPubkey: treasury.publicKey, toPubkey: depositorB, lamports: amountB.toNumber() }));
        tx.add(createSyncNativeInstruction(depositorB));
    }

    const depLpInfo = await connection.getAccountInfo(depositorLp);
    if (!depLpInfo) tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, depositorLp, treasury.publicKey, lpMint.publicKey));

    const initIx = await program.methods.initializePool(30, amountA, amountB)
        .accounts({
            pool: poolPda,
            authority: authorityPda,
            mintA,
            mintB,
            vaultA: vaultA.publicKey,
            vaultB: vaultB.publicKey,
            lpMint: lpMint.publicKey,
            depositorA,
            depositorB,
            depositorLp,
            payer: treasury.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

    tx.add(initIx);

    console.log("Sending transaction...");
    const sig = await sendAndConfirmTransaction(connection, tx, [treasury, lpMint, vaultA, vaultB]);
    console.log("Success! TX:", sig);
}

main().catch(console.error);
