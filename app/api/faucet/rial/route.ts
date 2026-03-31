import { type NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction, 
  createTransferInstruction 
} from "@solana/spl-token";
import { getTreasuryKeypair } from "@/lib/solana/treasury";
import { RIAL_MINT_STR, Devnet_RPC } from "@/lib/solana/config";

// Rate limiting store (in production, use Redis or a database)
const rateLimitStore = new Map<string, number>();
const RATE_LIMIT_DURATION = 12 * 60 * 60 * 1000; // 12 hours in ms

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json({ success: false, message: "Wallet address is required" }, { status: 400 });
    }

    let userPubkey: PublicKey;
    try {
      const safeWalletAddress = walletAddress.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
      userPubkey = new PublicKey(safeWalletAddress);
    } catch {
      return NextResponse.json({ success: false, message: "Invalid wallet address format" }, { status: 400 });
    }

    // Check rate limit
    const lastRequest = rateLimitStore.get(walletAddress.toLowerCase());
    const now = Date.now();

    if (lastRequest && now - lastRequest < RATE_LIMIT_DURATION) {
      const remainingTime = Math.ceil((RATE_LIMIT_DURATION - (now - lastRequest)) / (60 * 60 * 1000));
      return NextResponse.json(
        {
          success: false,
          message: `Rate limited. Please try again in ${remainingTime} hours.`,
        },
        { status: 429 }
      );
    }

    // Get Treasury Keypair
    const treasury = getTreasuryKeypair();
    if (!treasury) {
      return NextResponse.json({ success: false, message: "Treasury configuration missing." }, { status: 500 });
    }

    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC || Devnet_RPC, "confirmed");
    const safeRialMint = RIAL_MINT_STR.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
    const rialMint = new PublicKey(safeRialMint);

    // Amount to drop: 100 RIAL
    const DECIMALS = 6;
    const dropAmount = 100 * (10 ** DECIMALS);

    const treasuryAta = getAssociatedTokenAddressSync(rialMint, treasury.publicKey, true);
    const userAta = getAssociatedTokenAddressSync(rialMint, userPubkey, true);

    const transaction = new Transaction();

    console.log(`[Faucet API] Mint: ${safeRialMint}`);
    console.log(`[Faucet API] Treasury: ${treasury.publicKey.toBase58()}`);
    console.log(`[Faucet API] Treasury ATA: ${treasuryAta.toBase58()}`);

    // --- Explicit Treasury Check ---
    let treasuryBalanceAmount = 0n;
    try {
      const treasuryAtaBalance = await connection.getTokenAccountBalance(treasuryAta);
      treasuryBalanceAmount = BigInt(treasuryAtaBalance.value.amount);
    } catch (e: any) {
      treasuryBalanceAmount = 0n; // ATA missing
    }

    console.log(`[Faucet API] Treasury Balance: ${treasuryBalanceAmount.toString()} tokens, Required: ${dropAmount}`);

    if (treasuryBalanceAmount < BigInt(dropAmount)) {
      return NextResponse.json({ 
        success: false, 
        message: `DEX Treasury liquidity empty. Treasury holds ${treasuryBalanceAmount} tokens but ${dropAmount} is needed for faucet.` 
      }, { status: 400 });
    }

    // 1. Manually check and create Treasury ATA if needed (Should almost never happen if balance > dropAmount, but added for safety)
    const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta);
    if (!treasuryAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          treasury.publicKey, // Payer
          treasuryAta, // ATA
          treasury.publicKey, // Owner
          rialMint // Mint
        )
      );
    }

    // 2. Manually check and create User ATA if needed
    const userAtaInfo = await connection.getAccountInfo(userAta);
    if (!userAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          treasury.publicKey, // Payer (In the faucet, Treasury pays for user ATA)
          userAta,
          userPubkey, // Owner
          rialMint
        )
      );
    }

    // 3. Add Transfer RIAL tokens Instruction
    transaction.add(
      createTransferInstruction(
        treasuryAta, // Source
        userAta, // Destination
        treasury.publicKey, // Owner
        dropAmount // Amount
      )
    );

    // Send the compiled multi-instruction transaction
    const signature = await sendAndConfirmTransaction(connection, transaction, [treasury]);

    // Update rate limit only after successful transfer
    rateLimitStore.set(walletAddress.toLowerCase(), now);

    return NextResponse.json({
      success: true,
      txHash: signature,
      message: "100 RIAL tokens sent successfully",
    });

  } catch (error: any) {
    console.error("[Faucet RIAL] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error?.message || "Internal server error",
        details: String(error?.stack || error),
        name: error?.name
      },
      { status: 500 }
    );
  }
}
