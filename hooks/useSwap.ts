"use client"

import { useState } from "react"
import { VersionedTransaction } from "@solana/web3.js"
import { connection } from "@/lib/solana"

export function useSwap() {
    const [loading, setLoading] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)

    const swap = async (
        inputMint: string,
        outputMint: string,
        amount: number,
        address: string
    ) => {
        try {
            setLoading(true)

            const wallet = (window as any).solana

            const lamports =
                inputMint === "So11111111111111111111111111111111111111112"
                    ? Math.floor(amount * 1e9)
                    : Math.floor(amount * 1e6)

            // 🔥 QUOTE
            const quote = await fetch(
                `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${lamports}&slippageBps=50`
            ).then(res => res.json())

            const route = quote.data[0]

            // 🔥 SWAP TX
            const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    route,
                    userPublicKey: address,
                    wrapAndUnwrapSol: true,
                }),
            }).then(res => res.json())

            const tx = VersionedTransaction.deserialize(
                Buffer.from(swapRes.swapTransaction, "base64")
            )

            const signed = await wallet.signTransaction(tx)

            const txid = await connection.sendTransaction(signed)

            await connection.confirmTransaction(txid)

            setTxHash(txid)

            return txid
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return { swap, loading, txHash }
}