"use client"

import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletModalProvider, useWalletModal } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import "@solana/wallet-adapter-react-ui/styles.css"
import { clusterApiUrl } from "@solana/web3.js"

// The shape used by the UI components
type Web3Type = {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  network: string
  switchNetwork: (net: string) => void
  chainId: number
}

const Web3Context = createContext<Web3Type | null>(null)

function Web3ContextBridge({ children, network, switchNetwork }: { children: React.ReactNode, network: string, switchNetwork: (n: string) => void }) {
  const { publicKey, connected, connecting, disconnect: walletDisconnect } = useWallet()
  const { setVisible } = useWalletModal()

  const address = publicKey ? publicKey.toString() : null
  const isConnected = connected
  const isConnecting = connecting
  const chainId = network === "mainnet-beta" ? 101 : network === "testnet" ? 102 : 103 // Standard conceptual chainId

  const connectWallet = async () => {
    setVisible(true)
  }

  const disconnectWallet = async () => {
    if (connected) {
      await walletDisconnect()
    }
  }

  const connect = connectWallet
  const disconnect = disconnectWallet

  return (
    <Web3Context.Provider value={{ address, isConnected, isConnecting, connectWallet, disconnectWallet, connect, disconnect, network, switchNetwork, chainId }}>
      {children}
    </Web3Context.Provider>
  )
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [network, setNetwork] = useState("devnet")
  
  // Use explicit network
  const endpoint = useMemo(() => {
    if (network === "devnet") return process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com'
    return clusterApiUrl(network as any)
  }, [network])

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Web3ContextBridge network={network} switchNetwork={setNetwork}>
            {children}
          </Web3ContextBridge>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export const useWeb3 = () => {
  const ctx = useContext(Web3Context)
  if (!ctx) throw new Error("Web3Provider is not available")
  return ctx
}
