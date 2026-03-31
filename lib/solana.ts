import { Connection } from "@solana/web3.js"

export const RPC = "https://api.devnet.solana.com"

export const connection = new Connection(RPC, "confirmed")