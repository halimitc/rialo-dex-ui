import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
} from "@solana/spl-token";
import { getTreasuryKeypair } from "@/lib/solana/treasury";
import { Devnet_RPC } from "@/lib/solana/config";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

// IDL for the AMM
import IDL_RAW from "@/lib/solana/idl/rialo_amm_dex.json";

const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const PROGRAM_ID = new PublicKey("EPLjdrFaEJ51yUzbwdaroeQqp6FX2egmAhNN4avD8B9u");

export async function GET(req: NextRequest) {
  try {
    const treasury = getTreasuryKeypair();
    if (!treasury) {
      return NextResponse.json({ success: false, message: "Treasury config missing" }, { status: 500 });
    }

    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC || Devnet_RPC, "confirmed");
    const RIAL_MINT = new PublicKey(process.env.NEXT_PUBLIC_RIAL_MINT || "3Fi8K61KxcW1emjKCNvY8HFhG7LDSCRnNqbkL9J9Rgom");

    // Mints (Ensure mintA < mintB for deterministic PDA seeds)
    let mintA = NATIVE_MINT;
    let mintB = RIAL_MINT;

    if (mintA.toBuffer().compare(mintB.toBuffer()) > 0) {
        mintA = RIAL_MINT;
        mintB = NATIVE_MINT;
    }

    const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), mintA.toBuffer(), mintB.toBuffer()],
        PROGRAM_ID
    );

    const [authorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority"), poolPda.toBuffer()],
        PROGRAM_ID
    );

    const dummyWallet = {
      publicKey: treasury.publicKey,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    const provider = new AnchorProvider(connection, dummyWallet as any, { preflightCommitment: "confirmed" });
    const program = new Program(IDL_RAW as any, PROGRAM_ID, provider);

    // Check if initialized
    try {
        await program.account.pool.fetch(poolPda);
        return NextResponse.json({ success: true, message: "Pool already initialized! PDE: " + poolPda.toBase58() });
    } catch {} // Not initialized, proceed

    // Initial liquidity amount: 5 SOL, 5000 RIAL
    const amountAStr = mintA.equals(NATIVE_MINT) ? "5000000000" : "5000000000000"; // 5 SOL / 5000 RIAL
    const amountBStr = mintB.equals(NATIVE_MINT) ? "5000000000" : "5000000000000";

    const amountA = new BN(amountAStr);
    const amountB = new BN(amountBStr);

    const lpMint = Keypair.generate();
    const vaultA = Keypair.generate();
    const vaultB = Keypair.generate();

    const depositorA = getAssociatedTokenAddressSync(mintA, treasury.publicKey);
    const depositorB = getAssociatedTokenAddressSync(mintB, treasury.publicKey);
    const depositorLp = getAssociatedTokenAddressSync(lpMint.publicKey, treasury.publicKey);

    // Add wSOL check and token init logic
    const tx = new Transaction();
    
    // Import spl-token primitives needed for raw account setup
    const { MINT_SIZE, ACCOUNT_SIZE, createInitializeMint2Instruction, createInitializeAccount3Instruction } = require("@solana/spl-token");
    const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const tokenRent = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);

    // 1. Create and Initialize lpMint
    tx.add(SystemProgram.createAccount({
        fromPubkey: treasury.publicKey,
        newAccountPubkey: lpMint.publicKey,
        lamports: mintRent,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID
    }));
    tx.add(createInitializeMint2Instruction(lpMint.publicKey, 9, authorityPda, null, TOKEN_PROGRAM_ID));

    // 2. Create and Initialize Vault A
    tx.add(SystemProgram.createAccount({
        fromPubkey: treasury.publicKey,
        newAccountPubkey: vaultA.publicKey,
        lamports: tokenRent,
        space: ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID
    }));
    tx.add(createInitializeAccount3Instruction(vaultA.publicKey, mintA, authorityPda, TOKEN_PROGRAM_ID));

    // 3. Create and Initialize Vault B
    tx.add(SystemProgram.createAccount({
        fromPubkey: treasury.publicKey,
        newAccountPubkey: vaultB.publicKey,
        lamports: tokenRent,
        space: ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID
    }));
    tx.add(createInitializeAccount3Instruction(vaultB.publicKey, mintB, authorityPda, TOKEN_PROGRAM_ID));

    // Check if user has Depositor A
    const depAInfo = await connection.getAccountInfo(depositorA);
    if (!depAInfo) {
        tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, depositorA, treasury.publicKey, mintA));
    }
    // Automatically wrap SOL to wSOL if it's Native
    if (mintA.equals(NATIVE_MINT)) {
        tx.add(SystemProgram.transfer({
            fromPubkey: treasury.publicKey,
            toPubkey: depositorA,
            lamports: amountA.toNumber()
        }));
        tx.add(createSyncNativeInstruction(depositorA));
    }
    
    // Check if user has Depositor B
    const depBInfo = await connection.getAccountInfo(depositorB);
    if (!depBInfo) {
        tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, depositorB, treasury.publicKey, mintB));
    }
    if (mintB.equals(NATIVE_MINT)) {
        tx.add(SystemProgram.transfer({
            fromPubkey: treasury.publicKey,
            toPubkey: depositorB,
            lamports: amountB.toNumber()
        }));
        tx.add(createSyncNativeInstruction(depositorB));
    }

    const depLpInfo = await connection.getAccountInfo(depositorLp);
    if (!depLpInfo) {
        tx.add(createAssociatedTokenAccountInstruction(treasury.publicKey, depositorLp, treasury.publicKey, lpMint.publicKey));
    }

    // Call Anchor
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

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: treasury.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: tx.instructions,
    }).compileToV0Message();
    
    const versionedTx = new VersionedTransaction(messageV0);
    versionedTx.sign([treasury, lpMint, vaultA, vaultB]);

    const txSig = await connection.sendRawTransaction(versionedTx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({
        signature: txSig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    return NextResponse.json({
      success: true,
      message: "Pool successfully initialized!",
      tx: txSig,
      pool: poolPda.toBase58()
    });

  } catch (error: any) {
    console.error("[Init Pool API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed" }, { status: 500 });
  }
}
