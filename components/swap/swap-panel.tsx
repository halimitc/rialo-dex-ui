"use client"

import { useState, useEffect } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { useSwapTokens } from "@/hooks/solana/useSwapTokens"
import { useTokenBalance } from "@/hooks/solana/useTokenBalance"
import { getSolscanUrl } from "@/lib/solana/config"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TokenSelector } from "@/components/swap/token-selector"
import { SlippageSettings } from "@/components/swap/slippage-settings"
import { ArrowDown, Settings, Loader2, AlertCircle, Shield, ExternalLink, CheckCircle } from "lucide-react"
import { LoginModal } from "@/components/auth/login-modal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TOKEN_MINTS } from "@/lib/solana/config"

// We initialize MOCK_TOKENS dynamically within the component to use TOKEN_MINTS correctly
// Alternatively, since TOKEN_MINTS values are strings, we can export them directly
const MOCK_TOKENS = [
  { symbol: "RIAL", name: "Rialo Token", icon: "RIAL", mint: TOKEN_MINTS.RIAL, balance: "0" },
  { symbol: "SOL", name: "Solana", icon: "SOL", mint: "So11111111111111111111111111111111111111112", balance: "0" },
  { symbol: "USDC", name: "USD Coin", icon: "USDC", mint: TOKEN_MINTS.USDC, balance: "0" },
  { symbol: "USDT", name: "Tether", icon: "USDT", mint: "FWbnQfnMvYnjJaQwxULR2xkwx1h7gzCu1fK5cRkxsf9E", balance: "0" },
]

export function SwapPanel() {
  const { address, isConnected, connectWallet, network } = useWeb3() // ✅ DIPINDAH KE ATAS

  const { user, request2FAConfirmation } = useAuth()
  const { state: swapState, executeSwap } = useSwapTokens(address)

  const [fromToken, setFromToken] = useState(MOCK_TOKENS[0])
  const [toToken, setToToken] = useState(MOCK_TOKENS[1])
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState("0.5")
  const [showSettings, setShowSettings] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const fromBalance = useTokenBalance(address, fromToken.mint)
  const toBalance = useTokenBalance(address, toToken.mint)

  const mockPrices: Record<string, number> = {
    RIAL: 0.5,
    SOL: 145,
    USDC: 1,
    USDT: 1,
  }

  const handlePercentage = (percent: number) => {
    if (!fromBalance.uiAmount || Number(fromBalance.uiAmount) === 0) return;
    const maxAmount = Number(fromBalance.uiAmount);
    // Leave a small fee buffer if it's Native SOL and MAX is clicked
    const isSolMax = percent === 1 && fromToken.symbol === "SOL";
    const amountToSet = isSolMax ? Math.max(0, maxAmount - 0.005) : maxAmount * percent;
    
    // Format back to string
    setFromAmount(amountToSet > 0 ? amountToSet.toFixed(4).replace(/\.?0+$/, "") : "");
  }

  const handleSwap = async () => {
    if (!isConnected || !address) {
      setShowLoginModal(true)
      return
    }

    if (user?.is2FAEnabled) {
      const confirmed = await request2FAConfirmation("Swap Tokens")
      if (!confirmed) return
    }

    await executeSwap(fromToken.mint, toToken.mint, fromAmount, Number(slippage))
    // Refetch the data after a short cooldown to ensure confirmation triggers state update
    setTimeout(async () => {
      await fromBalance.refresh()
      await toBalance.refresh()
    }, 1000)
    setFromAmount("")
  }

  // Auto-calculate toAmount based on mockPrices (simulating quote)
  useEffect(() => {
    if (!fromAmount || isNaN(Number(fromAmount))) {
      setToAmount("")
      return
    }
    const fromRate = mockPrices[fromToken.symbol] || 1
    const toRate = mockPrices[toToken.symbol] || 1
    const calculatedAmount = (Number(fromAmount) * fromRate) / toRate
    setToAmount(calculatedAmount.toFixed(4))
  }, [fromAmount, fromToken, toToken])

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl">Swap</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-5 w-5" />
          </Button>
        </CardHeader>

        {showSettings && <SlippageSettings slippage={slippage} setSlippage={setSlippage} />}

        {/* Status Alerts */}
        <div className="px-6 pb-2">
          {swapState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Swap Failed</AlertTitle>
              <AlertDescription className="text-xs break-words">{swapState.error}</AlertDescription>
            </Alert>
          )}

          {swapState.txHash && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Swap Successful!</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <a
                  href={getSolscanUrl(swapState.txHash, network)}
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
        </div>

        <CardContent className="space-y-4 pt-2">
          {/* FROM */}
          <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">You Pay</span>
              <span className="text-sm text-muted-foreground">Balance: {fromBalance.uiAmount} {fromToken.symbol}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 min-w-0 bg-transparent text-3xl font-medium outline-none placeholder:text-muted-foreground/50"
              />
              <TokenSelector selected={fromToken as any} onSelect={(t) => setFromToken(t as any)} tokens={MOCK_TOKENS as any} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePercentage(pct / 100)}
                  className="text-xs px-2.5 py-1 rounded-md bg-secondary text-muted-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  {pct === 100 ? "MAX" : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <button 
              onClick={() => {
                const tempT = fromToken; setFromToken(toToken); setToToken(tempT);
                setFromAmount(""); setToAmount("");
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-4 border-card bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>

          {/* TO */}
          <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">You Receive</span>
              <span className="text-sm text-muted-foreground">Balance: {toBalance.uiAmount} {toToken.symbol}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.0"
                className="flex-1 min-w-0 bg-transparent text-3xl font-medium outline-none placeholder:text-muted-foreground/50"
              />
              <TokenSelector selected={toToken as any} onSelect={(t) => setToToken(t as any)} tokens={MOCK_TOKENS as any} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">

          {/* ✅ CONNECT BUTTON (FIXED) */}
          {!isConnected ? (
            <Button onClick={() => setShowLoginModal(true)} className="w-full h-12 text-base font-medium">
              Connect Wallet
            </Button>
          ) : !fromAmount ? (
            <Button disabled className="w-full h-12 text-base font-medium">Enter amount</Button>
          ) : swapState.isLoading ? (
            <Button disabled className="w-full h-12 text-base font-medium gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Swapping...
            </Button>
          ) : (
            <Button onClick={handleSwap} className="w-full h-12 text-base font-medium">
              Swap
            </Button>
          )}

        </CardFooter>
      </Card>

      {/* LOGIN MODAL */}
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  )
}