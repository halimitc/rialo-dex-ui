"use client"

import { useState, useEffect } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { useRequestFaucet } from "@/hooks/solana/useRequestFaucet"
import { getSolscanUrl } from "@/lib/solana/config"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Droplets, ExternalLink, Loader2, CheckCircle, AlertCircle, Wallet, Shield, Clock } from "lucide-react"
import { LoginModal } from "@/components/auth/login-modal"

type FaucetStatus = "idle" | "loading" | "success" | "error"

export function FaucetPanel() {
  const { address, isConnected, network } = useWeb3()
  const { user, request2FAConfirmation } = useAuth()
  const { isLoading, error, txHash, cooldownRemaining, requestFaucet, reset } = useRequestFaucet(address)
  const [status, setStatus] = useState<FaucetStatus>("idle")
  const [showLoginModal, setShowLoginModal] = useState(false)

  const isCorrectNetwork = network === "devnet" || network === "testnet"
  const isCooldownActive = cooldownRemaining > 0

  // Update status based on faucet hook state
  useEffect(() => {
    if (isLoading) {
      setStatus("loading")
    } else if (txHash) {
      setStatus("success")
    } else if (error) {
      setStatus("error")
    }
  }, [isLoading, txHash, error])

  const formatCooldown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const COOLDOWN_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  const cooldownProgress = ((COOLDOWN_DURATION - cooldownRemaining) / COOLDOWN_DURATION) * 100

  const handleRequestFaucet = async () => {
    if (!address) {
      setShowLoginModal(true)
      return
    }

    // Request 2FA confirmation if enabled
    if (user?.is2FAEnabled) {
      const confirmed = await request2FAConfirmation("Request RIAL Tokens from Faucet")
      if (!confirmed) return
    }

    try {
      await requestFaucet(network)
    } catch (err) {
      console.error("[v0] Faucet request error:", err)
    }
  }

  const canRequest = isConnected && isCorrectNetwork && !isCooldownActive && status !== "loading"

  return (
    <>
      <Card className="w-full max-w-lg border-border bg-card shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Droplets className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Solana {network === "testnet" ? "Testnet" : "Devnet"} Faucet</CardTitle>
          <CardDescription>Request free SOL for testing on Rialo DEX</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Wallet Status */}
          {isConnected && address && (
            <div className="rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Connected Wallet</span>
                <span className="text-sm font-mono text-foreground">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            </div>
          )}

          {/* Network Warning */}
          {isConnected && network === "mainnet-beta" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Wrong Network</AlertTitle>
              <AlertDescription>Faucets are not available on Mainnet. Please switch to Devnet or Testnet.</AlertDescription>
            </Alert>
          )}

          {/* Cooldown Timer */}
          {isCooldownActive && (
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cooldown Active</span>
                </div>
                <span className="text-lg font-mono font-medium text-primary">{formatCooldown(cooldownRemaining)}</span>
              </div>
              <Progress value={cooldownProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">You can request again when the timer expires</p>
            </div>
          )}

          {/* Success Message */}
          {status === "success" && txHash && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Success!</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Native SOL and 100 RIAL have been airdropped to your wallet.</p>
                <a
                  href={getSolscanUrl(txHash, network)}
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

          {/* Error Message */}
          {status === "error" && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <div className="rounded-lg bg-secondary/30 p-4 space-y-2">
            <h4 className="text-sm font-medium text-foreground">How it works</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>1. Connect Phantom Wallet</li>
              <li>2. Ensure network is set to Devnet or Testnet</li>
              <li>3. Click &quot;Request SOL & RIAL&quot;</li>
              <li>4. Wait 24 hours before requesting again</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {!isConnected ? (
            <Button onClick={() => setShowLoginModal(true)} className="w-full h-12 text-base gap-2">
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </Button>
          ) : (
            <Button onClick={handleRequestFaucet} disabled={!canRequest} className="w-full h-12 text-base gap-2">
              {status === "loading" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Requesting...
                </>
              ) : isCooldownActive ? (
                <>
                  <Clock className="h-5 w-5" />
                  Cooldown Active
                </>
              ) : (
                <>
                  <Droplets className="h-5 w-5" />
                  Request SOL & RIAL
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
