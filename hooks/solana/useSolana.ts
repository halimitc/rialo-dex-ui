'use client'

import { useCallback, useState } from 'react'
import { TESTNET_RPC } from '@/lib/solana/config'

export interface SolanaState {
  connection: any | null
  publicKey: any | null
  isLoading: boolean
  error: string | null
}

export function useSolana() {
  const [state, setState] = useState<SolanaState>({
    connection: null,
    publicKey: null,
    isLoading: false,
    error: null,
  })

  // Initialize connection
  const initConnection = useCallback(async () => {
    try {
      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection(TESTNET_RPC, 'confirmed')
      setState((prev) => ({ ...prev, connection }))
      return connection
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to initialize connection'
      setState((prev) => ({ ...prev, error }))
      throw err
    }
  }, [])

  // Get Phantom provider
  const getPhantomProvider = useCallback(() => {
    if (typeof window === 'undefined') return null
    const solana = (window as any).solana
    if (!solana?.isPhantom) return null
    return solana
  }, [])

  // Sign and send transaction
  const sendTransaction = useCallback(
    async (tx: any): Promise<string> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      try {
        const provider = getPhantomProvider()
        if (!provider) throw new Error('Phantom wallet not found')

        const connection = state.connection || (await initConnection())

        // Sign transaction
        const signedTx = await provider.signAndSendTransaction(tx)

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signedTx.signature, 'confirmed')
        if (confirmation.value.err) {
          throw new Error('Transaction failed on chain')
        }

        setState((prev) => ({ ...prev, isLoading: false }))
        return signedTx.signature
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Transaction failed'
        setState((prev) => ({ ...prev, isLoading: false, error }))
        throw err
      }
    },
    [state.connection, initConnection, getPhantomProvider]
  )

  return {
    ...state,
    initConnection,
    getPhantomProvider,
    sendTransaction,
  }
}
