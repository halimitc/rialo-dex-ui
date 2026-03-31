"use client"

import { useState } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Droplets, ExternalLink, Loader2, CheckCircle, AlertCircle, Wallet } from "lucide-react"

type FaucetStatus = "idle" | "loading" | "success" | "error"

interface FaucetResponse {
  success: boolean
  txHash?: string
  message?: string
}

export function FaucetCard() {
  const { address, isConnected, chainId, connect } = useWeb3()
  const [status, setStatus] = useState<FaucetStatus>("idle")
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isCorrectNetwork = chainId === 11155111

  const requestFaucet = async () => {
    if (!address) return

    setStatus("loading")
    setTxHash(null)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/faucet/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: address }),
      })

      const data: FaucetResponse = await response.json()

      if (data.success && data.txHash) {
        setStatus("success")
        setTxHash(data.txHash)
      } else {
        setStatus("error")
        setErrorMessage(data.message || "Failed to request Devnet SOL")
      }
    } catch (error) {
      setStatus("error")
      setErrorMessage("Network error. Please try again later.")
    }
  }

  if (!isConnected) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Devnet Faucet
          </CardTitle>
          <CardDescription>Get free Devnet SOL for trading</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={connect} className="w-full sm:w-auto">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet to Request SOL
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          Devnet Faucet
        </CardTitle>
        <CardDescription>Request free Devnet SOL for testing. Limited to one request per 24 hours.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCorrectNetwork && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wrong Network</AlertTitle>
            <AlertDescription>Please switch to Devnet to request faucet funds.</AlertDescription>
          </Alert>
        )}

        {status === "success" && txHash && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Success!</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Devnet SOL has been sent to your wallet.</p>
              <a
                href={`https://Devnet.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
              >
                View transaction on Etherscan
                <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={requestFaucet}
            disabled={status === "loading" || !isCorrectNetwork}
            className="gap-2 flex-1 sm:flex-none"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Droplets className="h-4 w-4" />
                Request Devnet SOL
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Note: The faucet API endpoint (/api/faucet/request) needs to be configured with your backend. This UI is ready
          to integrate with the Rialo backend signer.
        </p>
      </CardContent>
    </Card>
  )
}
