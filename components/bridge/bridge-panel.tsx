"use client"

import { useState } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { getSolscanUrl } from "@/lib/solana/config"
import { useTokenBalance } from "@/hooks/solana/useTokenBalance"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Download, Upload, ArrowRightLeft, Loader2, AlertCircle, Wallet, Shield, ArrowDown, ExternalLink, CheckCircle } from "lucide-react"
import { LoginModal } from "@/components/auth/login-modal"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js"
import { getAssociatedTokenAddressSync, createBurnInstruction } from "@solana/spl-token"
import { TOKEN_MINTS } from "@/lib/solana/config"

const NETWORKS = [
  { id: "solana-devnet", name: "Solana Devnet", icon: "SOL", chainId: "solana-devnet" },
  { id: "solana-testnet", name: "Solana Testnet", icon: "SOL", chainId: "solana-testnet" },
  { id: "polygon-mumbai", name: "Polygon Mumbai", icon: "POLY", chainId: 80001 },
  { id: "arbitrum-sepolia", name: "Arbitrum Sepolia", icon: "ARB", chainId: 421614 },
]

const BRIDGE_TOKENS = [
  { symbol: "RIAL", name: "Rialo Token", icon: "RIAL" },
  { symbol: "SOL", name: "Solana", icon: "SOL" },
  { symbol: "USDC", name: "USD Coin", icon: "USDC" },
]

// Helper to render network/token icons
const getTokenIcon = (icon: string) => {
  const iconMap: Record<string, string> = {
    SOL: "◎",
    RIAL: "⊙",
    POLY: "◈",
    USDC: "◆",
  }
  return iconMap[icon] || "◇"
}

export function BridgePanel() {
  const { user, request2FAConfirmation } = useAuth()
  const [fromNetwork, setFromNetwork] = useState("solana-devnet")
  const [toNetwork, setToNetwork] = useState("polygon-mumbai")
  const [txHash, setTxHash] = useState<string | null>(null)
  const [selectedToken, setSelectedToken] = useState("RIAL")
  const [amount, setAmount] = useState("")
  const [isBridging, setIsBridging] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const selectedTokenData = BRIDGE_TOKENS.find((t) => t.symbol === selectedToken)
  
  // Derive mint from symbol (using standard TOKEN_MINTS)
  const MINT_MAP: Record<string, string> = {
    RIAL: TOKEN_MINTS.RIAL,
    SOL: "So11111111111111111111111111111111111111112",
    USDC: TOKEN_MINTS.USDC
  }
  const mintAddress = MINT_MAP[selectedToken] || MINT_MAP["RIAL"]
  const { address, isConnected, network } = useWeb3()
  const { connection } = useConnection()
  const { sendTransaction } = useWallet()
  const { uiAmount } = useTokenBalance(address, mintAddress)

  const handleSwapNetworks = () => {
    const temp = fromNetwork
    setFromNetwork(toNetwork)
    setToNetwork(temp)
  }

  const handleBridge = async () => {
    if (!isConnected || !address) {
      setShowLoginModal(true)
      return
    }

    // Request 2FA confirmation if enabled
    if (user?.is2FAEnabled) {
      const confirmed = await request2FAConfirmation("Bridge Tokens")
      if (!confirmed) return
    }

    setIsBridging(true)
    
    try {
      if (fromNetwork.startsWith("solana-")) {
        const pubKey = new PublicKey(address)
        const transaction = new Transaction()
        
        if (mintAddress === "So11111111111111111111111111111111111111112" || selectedToken === "SOL") {
          // Native SOL transfer to dummy system address (effectively locking/burning)
          const dummyTarget = new PublicKey('11111111111111111111111111111111') 
          const transferInstr = SystemProgram.transfer({
            fromPubkey: pubKey,
            toPubkey: dummyTarget,
            lamports: BigInt(Math.floor(Number(amount) * 1e9))
          })
          transaction.add(transferInstr)
        } else {
          // SPL Token Burn (simulating locking on origin chain)
          const mintPubkey = new PublicKey(mintAddress)
          let decimals = 6
          try {
             const parsedMint: any = await connection.getParsedAccountInfo(mintPubkey)
             if (parsedMint.value && 'parsed' in parsedMint.value.data) {
                decimals = parsedMint.value.data.parsed.info.decimals
             }
          } catch {
             decimals = 6
          }

          const userAta = getAssociatedTokenAddressSync(mintPubkey, pubKey, true)
          const rawAmount = BigInt(Math.floor(Number(amount) * Math.pow(10, decimals)))
          
          const burnInstr = createBurnInstruction(
            userAta, // account to burn from
            mintPubkey,
            pubKey, // owner
            rawAmount
          )
          transaction.add(burnInstr)
        }
        
        const latestBlockHash = await connection.getLatestBlockhash()
        transaction.recentBlockhash = latestBlockHash.blockhash
        transaction.feePayer = pubKey
        
        const txid = await sendTransaction(transaction, connection)
        
        await connection.confirmTransaction({
           blockhash: latestBlockHash.blockhash,
           lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
           signature: txid
        }, 'confirmed')

        setTxHash(txid)
      } else {
        // Fallback or other networks (simulated)
        await new Promise((resolve) => setTimeout(resolve, 3000))
        setTxHash(`${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`)
      }
      setAmount("")
    } catch (err) {
      console.error("Bridge Error: ", err)
    } finally {
      setIsBridging(false)
    }
  }

  const fromNetworkData = NETWORKS.find((n) => n.id === fromNetwork)
  const toNetworkData = NETWORKS.find((n) => n.id === toNetwork)

  // Estimated fees (mock)
  const estimatedFee = amount ? (Number(amount) * 0.001).toFixed(6) : "0"
  const estimatedTime = "~10 minutes"

  return (
    <>
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <ArrowRightLeft className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Bridge</CardTitle>
          <CardDescription>Transfer assets across Devnets</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Bridge Success Alert */}
          {txHash && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Bridge Initiated!</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p className="text-sm">Your tokens are being bridged to {toNetworkData?.name}</p>
                <a
                  href={fromNetwork.startsWith("solana") ? getSolscanUrl(txHash, network) : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                >
                  View on Solscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          )}

          {/* From Network */}
          <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">From</span>
            </div>
            <Select value={fromNetwork} onValueChange={setFromNetwork}>
              <SelectTrigger className="h-12 bg-transparent border-border">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                      {getTokenIcon(fromNetworkData?.icon || "")}
                    </div>
                    <span>{fromNetworkData?.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.filter((n) => n.id !== toNetwork).map((network) => (
                  <SelectItem key={network.id} value={network.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                        {getTokenIcon(network.icon || "")}
                      </div>
                      <span>{network.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleSwapNetworks}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-4 border-card bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>

          {/* To Network */}
          <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">To</span>
            </div>
            <Select value={toNetwork} onValueChange={setToNetwork}>
              <SelectTrigger className="h-12 bg-transparent border-border">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                      {getTokenIcon(toNetworkData?.icon || "")}
                    </div>
                    <span>{toNetworkData?.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.filter((n) => n.id !== fromNetwork).map((network) => (
                  <SelectItem key={network.id} value={network.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                        {getTokenIcon(network.icon || "")}
                      </div>
                      <span>{network.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Token & Amount */}
          <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm text-muted-foreground">Balance: {uiAmount} {selectedToken}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 min-w-0 bg-transparent text-2xl font-medium outline-none placeholder:text-muted-foreground/50"
              />
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger className="w-[110px] shrink-0 h-10 bg-secondary border-0">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                        {getTokenIcon(selectedTokenData?.icon || "")}
                      </div>
                      <span>{selectedTokenData?.symbol}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BRIDGE_TOKENS.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                          {getTokenIcon(token.icon || "")}
                        </div>
                        <span>{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bridge Details */}
          {amount && Number(amount) > 0 && (
            <div className="rounded-lg bg-secondary/30 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">You will receive</span>
                <span className="text-foreground">
                  {(Number(amount) - Number(estimatedFee)).toFixed(6)} {selectedToken}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bridge Fee</span>
                <span className="text-foreground">
                  {estimatedFee} {selectedToken}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated Time</span>
                <span className="text-foreground">{estimatedTime}</span>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {!isConnected ? (
            <Button onClick={() => setShowLoginModal(true)} className="w-full h-12 text-base gap-2">
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </Button>
          ) : !amount || Number(amount) === 0 ? (
            <Button disabled className="w-full h-12 text-base">
              Enter an amount
            </Button>
          ) : Number(amount) > Number(uiAmount) ? (
            <Button disabled variant="destructive" className="w-full h-12 text-base gap-2">
              <AlertCircle className="h-5 w-5" />
              Insufficient balance
            </Button>
          ) : (
            <Button onClick={handleBridge} disabled={isBridging} className="w-full h-12 text-base gap-2">
              {isBridging ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Bridging...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-5 w-5" />
                  Bridge {selectedToken}
                </>
              )}
            </Button>
          )}

          {user?.is2FAEnabled && isConnected && (
            <div className="flex items-center justify-center gap-2 text-xs text-primary">
              <Shield className="h-3 w-3" />
              <span>Protected by Rialo 2FA</span>
            </div>
          )}
        </CardFooter>
      </Card>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  )
}
