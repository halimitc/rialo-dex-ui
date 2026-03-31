'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { useConnection } from '@solana/wallet-adapter-react'

export interface TokenBalance {
  amount: string
  decimals: number
  uiAmount: string
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateBalance: (newAmount: string | number) => void
}

function formatTokenAmount(amount: bigint, decimals: number): string {
  if (amount === 0n) return '0'
  const divisor = BigInt(Math.pow(10, decimals))
  const wholePart = amount / divisor
  const fractionalPart = amount % divisor
  if (fractionalPart === 0n) return wholePart.toString()
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  return `${wholePart}.${fractionalStr}`.replace(/\.?0+$/, '')
}

export function useTokenBalance(walletAddress: string | null, tokenMint: string | null): TokenBalance {
  const { connection } = useConnection()
  
  const [amount, setAmount] = useState('0')
  const [decimals, setDecimals] = useState(6)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const fetchBalance = useCallback(async () => {
    if (!walletAddress || !tokenMint) {
      if (isMounted.current) setAmount('0')
      return
    }

    if (isMounted.current) {
      setIsLoading(true)
      setError(null)
    }

    try {
      // Sanitize inputs to prevent trailing characters or BOM creating 'Non-base58 character' errors
      const safeWalletAddress = walletAddress.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '')
      const safeTokenMint = tokenMint.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '')
      
      const owner = new PublicKey(safeWalletAddress)

      // WSOL Mint usually represents Native SOL in frontends
      const WSOL_MINT = 'So11111111111111111111111111111111111111112'
      if (safeTokenMint === WSOL_MINT || safeTokenMint === 'native') {
        const lamports = await connection.getBalance(owner)
        if (isMounted.current) {
          setAmount(lamports.toString())
          setDecimals(9) // SOL has 9 decimals
        }
        console.log(`[TokenBalance] Fetched SOL Balance for ${safeWalletAddress}: ${lamports} lamports`)
      } else {
        const mintPubkey = new PublicKey(safeTokenMint)
        const ata = getAssociatedTokenAddressSync(mintPubkey, owner, true)
        
        try {
          const balance = await connection.getTokenAccountBalance(ata)
          if (isMounted.current) {
            setAmount(balance.value.amount)
            setDecimals(balance.value.decimals)
          }
          console.log(`[TokenBalance] Fetched SPL Balance for Mint ${safeTokenMint}: ${balance.value.amount} (Decimals: ${balance.value.decimals}), ATA: ${ata.toBase58()}`)
        } catch (err: any) {
          // If ATA doesn't exist, it means balance is 0
          if (err.message?.includes('could not find account') || err.message?.includes('Invalid account')) {
            if (isMounted.current) setAmount('0')
            console.log(`[TokenBalance] ATA not found for Mint ${safeTokenMint}, defaulting to 0.`)
            // Need to know decimals to avoid UI glitches, fallback or fetch from mint
            try {
              const parsedMint = await connection.getParsedAccountInfo(mintPubkey)
              if (parsedMint.value && 'parsed' in parsedMint.value.data) {
                 if (isMounted.current) setDecimals(parsedMint.value.data.parsed.info.decimals)
              }
            } catch {
              // Ignore failure to fetch decimals, defaulting to current
            }
          } else {
            throw err
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balance'
      console.error(`[TokenBalance] Error fetching mint ${tokenMint}:`, errorMsg)
      if (isMounted.current) setError(errorMsg)
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [walletAddress, tokenMint, connection])

  useEffect(() => {
    fetchBalance()
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [fetchBalance])

  const updateBalance = useCallback((newAmount: string | number) => {
    if (isMounted.current) setAmount(newAmount.toString())
  }, [])

  const getAmountAsBigInt = (amountStr: string): bigint => {
    try {
      if (amountStr.includes('.')) {
        const [whole, fractional] = amountStr.split('.')
        const paddedFractional = (fractional || '0').padEnd(decimals, '0').slice(0, decimals)
        return BigInt(whole + paddedFractional)
      }
      return BigInt(amountStr || '0')
    } catch {
      return 0n
    }
  }
  
  const uiAmount = formatTokenAmount(getAmountAsBigInt(amount), decimals)

  return {
    amount,
    decimals,
    uiAmount,
    isLoading,
    error,
    refresh: fetchBalance,
    updateBalance,
  }
}
