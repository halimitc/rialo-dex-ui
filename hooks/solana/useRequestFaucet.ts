'use client'

import { useCallback, useState } from 'react'
import { FAUCET_CONFIG } from '@/lib/solana/config'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

export interface FaucetRequest {
  isLoading: boolean
  error: string | null
  txHash: string | null
  cooldownRemaining: number
  requestFaucet: (network: string) => Promise<void>
  reset: () => void
}

export function useRequestFaucet(walletAddress: string | null): FaucetRequest {
  const { connection } = useConnection()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const requestFaucet = useCallback(async (network: string) => {
    if (!walletAddress) {
      setError('Wallet not connected')
      return
    }

    if (network === 'mainnet-beta') {
      setError('Mainnet airdrops are not supported')
      return
    }

    setIsLoading(true)
    setError(null)
    setTxHash(null)

    try {
      const pubkey = new PublicKey(walletAddress)
      let signature = "sol-failed-" + Date.now()
      
      try {
        signature = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL)

        // Confirm SOL transaction
        const latestBlockHash = await connection.getLatestBlockhash()
        await connection.confirmTransaction({
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: signature
        }, 'confirmed')
      } catch (airdropError) {
        console.warn("SOL Airdrop failed (maybe rate limited), attempting RIAL drop anyway:", airdropError)
      }

      // Request API to Drop RIAL Tokens
      const res = await fetch('/api/faucet/rial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })
      const data = await res.json()

      if (!data.success && signature.startsWith("sol-failed")) {
          // If both SOL drop and RIAL drop failed
          throw new Error(data.message || "Failed to drop both SOL and RIAL.")
      }

      // Prefer showing RIAL tx hash on explorer, rollback to SOL hash
      setTxHash(data.txHash || signature)

      // Set cooldown
      const cooldownMs = FAUCET_CONFIG.cooldownSeconds * 1000
      setCooldownRemaining(cooldownMs)

      // Countdown timer
      const interval = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1000) {
            clearInterval(interval)
            return 0
          }
          return prev - 1000
        })
      }, 1000)

      console.log('[v0] Faucet request successful:', signature)
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'Faucet request failed'
      // Pretty print known Sol RPC errors
      if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        setError('Airdrop rate limit reached for this IP/Wallet. Please wait 24 hours.')
      } else {
        setError(errorMsg)
      }
      console.error('[v0] Faucet error:', errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, connection])

  const reset = useCallback(() => {
    setError(null)
    setTxHash(null)
    setCooldownRemaining(0)
  }, [])

  return {
    isLoading,
    error,
    txHash,
    cooldownRemaining,
    requestFaucet,
    reset,
  }
}
