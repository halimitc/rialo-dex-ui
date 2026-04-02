import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import IDL_RAW from "../lib/solana/idl/rialo_amm_dex.json";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");
  const RIAL_MINT = new PublicKey("3Fi8K61KxcW1emjKCNvY8HFhG7LDSCRnNqbkL9J9Rgom");
  const PROGRAM_ID = new PublicKey("EPLjdrFaEJ51yUzbwdaroeQqp6FX2egmAhNN4avD8B9u");

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

  console.log("Pool PDA:", poolPda.toBase58());

  const dummyWallet = {
    publicKey: new PublicKey("11111111111111111111111111111111"),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new AnchorProvider(connection, dummyWallet as any, { preflightCommitment: "confirmed" });
  const program = new Program(IDL_RAW as any, PROGRAM_ID, provider);

  try {
      const pool = await program.account.pool.fetch(poolPda) as any;
      console.log("Pool Initialized successfully!");
      if (mintA.equals(NATIVE_MINT)) {
          console.log("SOL Vault (Vault A):", pool.vaultA.toBase58());
          console.log("RIAL Vault (Vault B):", pool.vaultB.toBase58());
      } else {
          console.log("RIAL Vault (Vault A):", pool.vaultA.toBase58());
          console.log("SOL Vault (Vault B):", pool.vaultB.toBase58());
      }
  } catch (err) {
      console.log("Pool not initialized yet!", err);
  }
}

main();
