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
  createTransferInstruction,
} from "@solana/spl-token";
import { getTreasuryKeypair } from "@/lib/solana/treasury";
import { Devnet_RPC } from "@/lib/solana/config";

const NATIVE_MINT = "So11111111111111111111111111111111111111112";

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

    const transaction = new Transaction();
    const inAmountBN = BigInt(Math.floor(Number(inputAmount)));
    const outAmountBN = BigInt(Math.floor(Number(outputAmount)));

    // Safely clean strings from UTF/BOM
    const safeInputMint = inputMint.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
    const safeOutputMint = outputMint.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');

    const isInputNative = safeInputMint === NATIVE_MINT || safeInputMint === "native";
    const isOutputNative = safeOutputMint === NATIVE_MINT || safeOutputMint === "native";

    // --- STEP 1: Handle Input (User -> Treasury) ---
    if (isInputNative) {
      // Transfer SOL from User to Treasury
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: userPubkey,
          toPubkey: treasury.publicKey,
          lamports: inAmountBN,
        })
      );
    } else {
      // Transfer SPL Token from User to Treasury
      const mintPubkey = new PublicKey(safeInputMint);
      const userAta = getAssociatedTokenAddressSync(mintPubkey, userPubkey, true);
      const treasuryAta = getAssociatedTokenAddressSync(mintPubkey, treasury.publicKey, true);

      // Check if Treasury ATA exists, if not, create it
      const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta);
      if (!treasuryAtaInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            userPubkey, // Payer (User pays for tx and ATA creation)
            treasuryAta,
            treasury.publicKey,
            mintPubkey
          )
        );
      }

      transaction.add(
        createTransferInstruction(
          userAta, // source
          treasuryAta, // destination
          userPubkey, // owner
          inAmountBN
        )
      );
    }

    // --- STEP 2: Handle Output (Treasury -> User) ---
    if (isOutputNative) {
      // Check Treasury Native SOL Balance
      const treasuryBalance = await connection.getBalance(treasury.publicKey);
      console.log(`[Swap API] Treasury SOL Balance: ${treasuryBalance}, Required: ${outAmountBN}`);
      
      if (BigInt(treasuryBalance) < outAmountBN) {
        return NextResponse.json({ 
          success: false, 
          message: `Insufficient Treasury balance. The DEX Treasury does not have enough SOL on Devnet to fulfill this swap.` 
        }, { status: 400 });
      }

      // Transfer SOL from Treasury to User
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: treasury.publicKey,
          toPubkey: userPubkey,
          lamports: outAmountBN,
        })
      );
    } else {
      // Transfer SPL Token from Treasury to User
      const mintPubkey = new PublicKey(safeOutputMint);
      const treasuryAta = getAssociatedTokenAddressSync(mintPubkey, treasury.publicKey, true);
      const userAta = getAssociatedTokenAddressSync(mintPubkey, userPubkey, true);

      console.log(`[Swap API] Mint: ${safeOutputMint}`);
      console.log(`[Swap API] Treasury: ${treasury.publicKey.toBase58()}`);
      console.log(`[Swap API] Treasury ATA: ${treasuryAta.toBase58()}`);

      // Explicitly check Treasury SPL Token Balance
      let treasuryBalanceAmount = 0n;
      try {
        const treasuryAtaBalance = await connection.getTokenAccountBalance(treasuryAta);
        treasuryBalanceAmount = BigInt(treasuryAtaBalance.value.amount);
      } catch (e: any) {
        // ATA missing implies 0 balance. We will create it below if needed, but it still means 0 balance currently.
        treasuryBalanceAmount = 0n;
      }
      
      console.log(`[Swap API] Treasury Balance: ${treasuryBalanceAmount.toString()} tokens, Required: ${outAmountBN}`);

      if (treasuryBalanceAmount < outAmountBN) {
        return NextResponse.json({ 
          success: false, 
          message: `DEX Treasury liquidity empty. Treasury holds ${treasuryBalanceAmount} tokens but ${outAmountBN} is needed.` 
        }, { status: 400 });
      }

      // If Treasury ATA does not exist (but somehow required amount is 0), we create it
      const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta);
      if (!treasuryAtaInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            userPubkey, // User pays for ATA creation
            treasuryAta,
            treasury.publicKey,
            mintPubkey
          )
        );
      }

      // Check if User ATA exists, if not, create it
      const userAtaInfo = await connection.getAccountInfo(userAta);
      if (!userAtaInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            userPubkey, 
            userAta,
            userPubkey,
            mintPubkey
          )
        );
      }

      transaction.add(
        createTransferInstruction(
          treasuryAta, // source
          userAta, // destination
          treasury.publicKey, // owner is treasury
          outAmountBN
        )
      );
    }

    // Fetch latest blockhash
    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    // Convert legacy Transaction to VersionedTransaction
    const messageV0 = new TransactionMessage({
      payerKey: userPubkey,
      recentBlockhash: blockhash,
      instructions: transaction.instructions,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(messageV0);

    // Treasury partially signs the transaction (for Step 2 and potential Step 1 ATA logic)
    versionedTx.sign([treasury]);

    // Serialize to base64
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
