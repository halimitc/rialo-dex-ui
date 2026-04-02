import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getTreasuryKeypair } from "@/lib/solana/treasury";
import { Devnet_RPC } from "@/lib/solana/config";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

// IDL for the AMM
import IDL_RAW from "../../../lib/solana/idl/rialo_amm_dex.json";

const NATIVE_MINT = "So11111111111111111111111111111111111111112";
const PROGRAM_ID = new PublicKey("EPLjdrFaEJ51yUzbwdaroeQqp6FX2egmAhNN4avD8B9u");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inputMint, outputMint, inputAmount, outputAmount, walletAddress } = body;

    if (!inputMint || !outputMint || !inputAmount || !outputAmount || !walletAddress) {
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 });
    }

    const treasury = getTreasuryKeypair();
    if (!treasury) {
      return NextResponse.json({ success: false, message: "Treasury config missing" }, { status: 500 });
    }

    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC || Devnet_RPC, "confirmed");
    const safeWalletAddress = walletAddress.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
    const userPubkey = new PublicKey(safeWalletAddress);

    const safeInputMintRaw = inputMint.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
    const safeOutputMintRaw = outputMint.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');

    const safeInputMint = safeInputMintRaw === "native" ? NATIVE_MINT : safeInputMintRaw;
    const safeOutputMint = safeOutputMintRaw === "native" ? NATIVE_MINT : safeOutputMintRaw;

    const mintPubkeyIn = new PublicKey(safeInputMint);
    const mintPubkeyOut = new PublicKey(safeOutputMint);

    // Sort mints to find Pool PDA correctly
    let mintA = mintPubkeyIn;
    let mintB = mintPubkeyOut;
    let isAToB = true;

    if (mintA.toBuffer().compare(mintB.toBuffer()) > 0) {
        mintA = mintPubkeyOut;
        mintB = mintPubkeyIn;
        isAToB = false;
    }

    const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), mintA.toBuffer(), mintB.toBuffer()],
        PROGRAM_ID
    );

    const [authorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority"), poolPda.toBuffer()],
        PROGRAM_ID
    );

    const userSource = getAssociatedTokenAddressSync(mintPubkeyIn, userPubkey, true);
    const userDestination = getAssociatedTokenAddressSync(mintPubkeyOut, userPubkey, true);

    // Setup Anchor
    const dummyWallet = {
      publicKey: treasury.publicKey,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    const provider = new AnchorProvider(connection, dummyWallet as any, { preflightCommitment: "confirmed" });
    const program = new Program(IDL_RAW as any, PROGRAM_ID, provider);

    // Fetch Pool State to get Vaults
    let poolState: any;
    try {
        poolState = await program.account.pool.fetch(poolPda);
    } catch (e) {
        return NextResponse.json({ success: false, message: "Liquidity pool is not initialized for this pair on Devnet." }, { status: 400 });
    }

    const transaction = new Transaction();

    // Make sure user ATAs exist
    const userDestAtaInfo = await connection.getAccountInfo(userDestination);
    if (!userDestAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userPubkey, 
          userDestination,
          userPubkey,
          mintPubkeyOut
        )
      );
    }
    
    // Convert amounts to BN (bn.js)
    let BN_CLASS = BN;

    const amountInBN = new BN_CLASS(inputAmount);
    // Slippage tolerance: frontend requested exact quote, AMM supports minimumAmountOut
    const minAmountOutBN = new BN_CLASS(Math.floor(Number(outputAmount) * 0.99));

    // Handle wrapping SOL -> wSOL if input is native
    if (safeInputMint === NATIVE_MINT || safeInputMint === "native") {
        const { createSyncNativeInstruction } = require("@solana/spl-token");
        const wsolAtaInfo = await connection.getAccountInfo(userSource);
        if (!wsolAtaInfo) {
            transaction.add(createAssociatedTokenAccountInstruction(userPubkey, userSource, userPubkey, mintPubkeyIn));
        }
        transaction.add(SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: userSource,
            lamports: amountInBN.toNumber()
        }));
        transaction.add(createSyncNativeInstruction(userSource));
    }

    // Construct the Swap instruction
    const swapIx = await program.methods.swap(
      amountInBN,
      minAmountOutBN,
      isAToB
    )
    .accounts({
      pool: poolPda,
      authority: authorityPda,
      vaultA: poolState.vaultA,
      vaultB: poolState.vaultB,
      userSource: userSource,
      userDestination: userDestination,
      user: userPubkey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

    transaction.add(swapIx);

    // Handle unwrapping wSOL -> SOL if output is native
    if (safeOutputMint === NATIVE_MINT || safeOutputMint === "native") {
        const { createCloseAccountInstruction } = require("@solana/spl-token");
        transaction.add(createCloseAccountInstruction(userDestination, userPubkey, userPubkey, []));
    }

    // Fetch latest blockhash
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const messageV0 = new TransactionMessage({
      payerKey: userPubkey,
      recentBlockhash: blockhash,
      instructions: transaction.instructions,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(messageV0);

    // Send base64 back for user signing
    const serializedTx = versionedTx.serialize();
    const base64Tx = Buffer.from(serializedTx).toString("base64");

    return NextResponse.json({
      success: true,
      transactionBase64: base64Tx,
      message: "Swap transaction successfully generated.",
    });

  } catch (error: any) {
    console.error("[Swap API] Error:", error.message || error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
