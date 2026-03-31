import { Connection } from "@solana/web3.js";

// Determine RPC from environment variables
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";

// Create a robust singleton connection
export const connection = new Connection(RPC_ENDPOINT, {
  commitment: "confirmed",
  // Optional: add wsEndpoint if doing subscription-heavy operations
});