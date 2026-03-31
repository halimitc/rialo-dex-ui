"use client"

import { useWeb3 } from "@/components/providers/web3-provider"
import { useTokenBalance } from "@/hooks/solana/useTokenBalance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Wallet } from "lucide-react"
import { useState } from "react"
import { RIAL_MINT } from "@/lib/solana/config"

export function WalletInfoCard() {
  const { address, isConnected, network, connect } = useWeb3()
  const rialBalance = useTokenBalance(address, RIAL_MINT)
  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isCorrectNetwork = network === "devnet"

  if (!isConnected) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Wallet
          </CardTitle>
          <CardDescription>Connect Phantom wallet to access your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={connect} className="w-full sm:w-auto">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Phantom Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Wallet
            </CardTitle>
            <CardDescription>Your Solana Devnet wallet information</CardDescription>
          </div>
          <Badge variant={isCorrectNetwork ? "default" : "destructive"} className="shrink-0">
            {isCorrectNetwork ? "Solana Devnet" : "Wrong Network"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-secondary text-sm font-mono text-foreground truncate">
              {address}
            </code>
            <Button variant="outline" size="icon" onClick={copyAddress}>
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy address</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(`https://explorer.solana.com/address/${address}?cluster=devnet`, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">View on Solana Explorer</span>
            </Button>
          </div>
          {copied && <p className="text-xs text-primary mt-1">Address copied!</p>}
        </div>

        {/* Network */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Network</label>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${isCorrectNetwork ? "bg-green-500" : "bg-red-500"} animate-pulse`}
            />
            <span className="text-sm text-foreground">
              {isCorrectNetwork ? "Solana Devnet" : "Wrong Network"}
            </span>
          </div>
          {!isCorrectNetwork && (
            <p className="text-xs text-destructive mt-1">Please switch to Solana Devnet to use this app</p>
          )}
        </div>

        {/* RIAL Balance */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">RIAL Balance</label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">
              {rialBalance.isLoading ? "..." : rialBalance.uiAmount}
            </span>
            <span className="text-sm text-muted-foreground">RIAL</span>
          </div>
          {rialBalance.error && (
            <p className="text-xs text-destructive mt-1">Failed to load balance: {rialBalance.error}</p>
          )}
        </div>

        {/* Refresh Balance Button */}
        <Button 
          onClick={() => rialBalance.refresh()} 
          disabled={rialBalance.isLoading}
          variant="outline"
          className="w-full"
        >
          Refresh Balance
        </Button>
      </CardContent>
    </Card>
  )
}
