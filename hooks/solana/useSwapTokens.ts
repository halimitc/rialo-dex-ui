'use client'

import { useCallback, useState } from 'react'
import { VersionedTransaction, PublicKey } from '@solana/web3.js'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { getQuote, getSwapTransaction } from '@/lib/swap/jupiter'
import { useWeb3 } from '@/components/providers/web3-provider'

export interface SwapState {
  isLoading: boolean
  error: string | null
  txHash: string | null
  outputAmount: string
  priceImpact: number
}

export interface SwapResult {
  state: SwapState
  executeSwap: (inputMint: string, outputMint: string, inputAmount: string, slippage: number) => Promise<void>
  reset: () => void
}

export function useSwapTokens(walletAddress: string | null): SwapResult {
  const { sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { network } = useWeb3()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [outputAmount, setOutputAmount] = useState('0')
  const [priceImpact, setPriceImpact] = useState(0)

  const executeSwap = useCallback(
    async (inputMint: string, outputMint: string, inputAmount: string, slippage: number) => {
      if (!walletAddress) {
        setError('Wallet not connected')
        return
      }

      setIsLoading(true)
      setError(null)
      setTxHash(null)

      try {
        const safeInputMint = inputMint.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '')
        const safeOutputMint = outputMint.replace(/[^1-9A-HJ-NP-Za-km-z]/g, '')
        
        let inputDecimals = 9 
        let outputDecimals = 9

        const fetchDecimals = async (mint: string) => {
          if (mint === 'So11111111111111111111111111111111111111112' || mint === 'native') return 9;
          try {
            const parsedMint: any = await connection.getParsedAccountInfo(new PublicKey(mint))
            if (parsedMint?.value && 'parsed' in parsedMint.value.data) {
              return parsedMint.value.data.parsed.info.decimals
            }
          } catch (e) {
            console.warn(`Could not fetch mint decimals for ${mint}, defaulting to 9`)
          }
          return 9;
        }

        inputDecimals = await fetchDecimals(safeInputMint)
        outputDecimals = await fetchDecimals(safeOutputMint)

        const rawAmount = Math.floor(parseFloat(inputAmount) * Math.pow(10, inputDecimals)).toString()
        const slippageBps = Math.floor(slippage * 100)
        
        let quote: any
        const MOCK_PRICES: Record<string, number> = {
          'So11111111111111111111111111111111111111112': 145, // SOL
          'native': 145,
          default: 1 // RIAL, USDC, USDT
        }
        
        // Match token to mock price (if it's not SOL, assume it's RIAL/USDC worth around $0.5 - $1)
        // From swap-panel UI, RIAL is $0.5
        const RIAL_MINT = 'EczP6Zf8q6QJ6VjT5E5FjZ5tq5dK2CjR2CjR2CjR2CjR'; // We'll just use a generic check
        const getMockPrice = (mint: string) => {
           if (mint === 'So11111111111111111111111111111111111111112' || mint === 'native') return 145;
           // Default to 0.5 for RIAL to match UI's behavior safely without needing direct env import
           return 0.5;
        }

        const fromPrice = getMockPrice(safeInputMint)
        const toPrice = getMockPrice(safeOutputMint)

        // Calculate output amount using UI mock prices (incorporating slippage buffer)
        const exchangeRate = fromPrice / toPrice;
        const fallbackOutAmountFloat = parseFloat(inputAmount) * exchangeRate * 0.99;
        const fallbackOutAmount = Math.floor(fallbackOutAmountFloat * Math.pow(10, outputDecimals)).toString()

        try {
          quote = await getQuote(safeInputMint, safeOutputMint, rawAmount, slippageBps)
          setPriceImpact(quote.priceImpactPct || 0)
          setOutputAmount(quote.outAmount)
        } catch (e) {
          console.log("[Swap] Jupiter Quote failed (Normal on Devnet), using local mock calculation.");
          setPriceImpact(0.1)
          setOutputAmount(rawAmount === "0" ? "0" : fallbackOutAmountFloat.toString())
          quote = null
        }

        let txid: string

        if (network === 'mainnet-beta') {
          if (!quote) throw new Error("Could not fetch swap quote from Mainnet.")
          const txBase64 = await getSwapTransaction(quote, walletAddress)
          const swapTransactionBuf = Buffer.from(txBase64, 'base64')
          const transaction = VersionedTransaction.deserialize(new Uint8Array(swapTransactionBuf))
          txid = await sendTransaction(transaction, connection)
        } else {
          const expectedOutAmount = quote?.outAmount || fallbackOutAmount;
          
          const res = await fetch('/api/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputMint: safeInputMint,
              outputMint: safeOutputMint,
              inputAmount: rawAmount,
              outputAmount: expectedOutAmount,
              walletAddress
            })
          });
          
          const data = await res.json();
          if (!data.success) {
             throw new Error(data.message || "Failed to generate atomic swap transaction");
          }

          const swapTransactionBuf = Buffer.from(data.transactionBase64, 'base64');
          const transaction = VersionedTransaction.deserialize(new Uint8Array(swapTransactionBuf));
          
          // Debug simulation before sending
          try {
             const sim = await connection.simulateTransaction(transaction);
             if (sim.value.err) {
                console.error("[Swap] Transaction simulation failed. Logs:", sim.value.logs);
                // We won't throw here, let Phantom handle it, but we log the exact error
             }
          } catch (e) {}

          txid = await sendTransaction(transaction, connection);
        }

        const latestBlockHash = await connection.getLatestBlockhash("confirmed")
        
        await connection.confirmTransaction({
           blockhash: latestBlockHash.blockhash,
           lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
           signature: txid
        }, 'confirmed')

        setTxHash(txid)
        console.log('[v0] Swap execution successful:', txid)

      } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : 'Swap failed'
        if (errorMsg.includes("User rejected") || errorMsg.includes("rejected the request")) {
            setError("Transaction rejected by user.")
        } else if (errorMsg.includes("Unexpected error") || errorMsg.includes("simulation failed") || errorMsg.includes("insufficient funds")) {
            setError("Swap failed: Please verify Faucet/Treasury balance for Devnet RIAL, or try reconnecting your wallet.")
        } else {
            setError(errorMsg)
        }
        console.error('[v0] Swap error log:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [walletAddress, sendTransaction, connection, network]
  )

  const reset = useCallback(() => {
    setError(null)
    setTxHash(null)
    setOutputAmount('0')
    setPriceImpact(0)
  }, [])

  return {
    state: {
      isLoading,
      error,
      txHash,
      outputAmount,
      priceImpact,
    },
    executeSwap,
    reset,
  }
}
