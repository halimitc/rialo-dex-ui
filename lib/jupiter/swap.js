
import { Connection, VersionedTransaction } from "@solana/web3.js";

const RPC = "https://api.devnet.solana.com";

export const connection = new Connection(RPC, "confirmed");

export async function getQuote(inputMint, outputMint, amount) {
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`;
  const res = await fetch(url);
  return res.json();
}

export async function executeSwap(wallet, route) {
  const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      route,
      userPublicKey: wallet.publicKey.toString(),
      wrapAndUnwrapSol: true
    })
  });

  const { swapTransaction } = await swapRes.json();

  const txBuf = Buffer.from(swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(txBuf);

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendTransaction(signed);

  await connection.confirmTransaction(txid);

  return txid;
}
