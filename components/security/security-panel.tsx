"use client"

import { useState } from "react"
import { useWeb3 } from "@/components/providers/web3-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Shield,
  Wallet,
  Mail,
  Smartphone,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Lock,
  RefreshCw,
} from "lucide-react"
import { LoginModal } from "@/components/auth/login-modal"

export function SecurityPanel() {
  const { isConnected, address } = useWeb3()
  const { user, isAuthenticated, enable2FA, disable2FA } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isToggling2FA, setIsToggling2FA] = useState(false)

  const handle2FAToggle = async () => {
    setIsToggling2FA(true)
    try {
      if (user?.is2FAEnabled) {
        await disable2FA()
      } else {
        await enable2FA()
      }
    } catch {
      console.error("Failed to toggle 2FA")
    }
    setIsToggling2FA(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Security Center</h2>
          <p className="text-muted-foreground max-w-md">
            Sign in to access your security settings and enable Rialo Native 2FA protection.
          </p>
        </div>
        <Button onClick={() => setShowLoginModal(true)} size="lg" className="gap-2">
          <Wallet className="h-5 w-5" />
          Sign In to Continue
        </Button>
        <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Security Score Card */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Status
          </CardTitle>
          <CardDescription>Your account security overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Wallet Status */}
            <div className="rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Wallet</p>
                  <p className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Not Connected"}</p>
                </div>
              </div>
            </div>

            {/* Google Status */}
            <div className="rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center gap-3">
                {user?.googleEmail ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Google</p>
                  <p className="text-xs text-muted-foreground">{user?.googleEmail ? "Linked" : "Not Linked"}</p>
                </div>
              </div>
            </div>

            {/* 2FA Status */}
            <div className="rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center gap-3">
                {user?.is2FAEnabled ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">2FA</p>
                  <p className="text-xs text-muted-foreground">{user?.is2FAEnabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rialo 2FA Card */}
      <Card className={`border-2 ${user?.is2FAEnabled ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${user?.is2FAEnabled ? "bg-primary/20" : "bg-secondary"}`}
              >
                <Shield className={`h-6 w-6 ${user?.is2FAEnabled ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Rialo Native 2FA</CardTitle>
                <CardDescription>Protocol-level security for all transactions</CardDescription>
              </div>
            </div>
            <Switch checked={user?.is2FAEnabled || false} onCheckedChange={handle2FAToggle} disabled={isToggling2FA} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.is2FAEnabled ? (
            <Alert className="border-primary/30 bg-primary/10">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">2FA Protection Active</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                All sensitive actions (swaps, bridges, faucet requests) require 2FA confirmation.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertTitle className="text-yellow-500">2FA Not Enabled</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Enable 2FA to add an extra layer of security to your transactions.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3">
              <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Swap Protection</p>
                <p className="text-xs text-muted-foreground">Confirm all token swaps</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3">
              <RefreshCw className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Bridge Protection</p>
                <p className="text-xs text-muted-foreground">Secure cross-chain transfers</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3">
              <Key className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Faucet Protection</p>
                <p className="text-xs text-muted-foreground">Verify faucet requests</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-3">
              <Smartphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Mobile Ready</p>
                <p className="text-xs text-muted-foreground">Works on all devices</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Connected Accounts</CardTitle>
          <CardDescription>Manage your linked accounts and authentication methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Wallet className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Wallet</p>
                {isConnected && address ? (
                  <p className="text-xs text-muted-foreground font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://Devnet.etherscan.io/address/${address}`, "_blank")}
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
                <span className="text-xs text-green-500 font-medium">Connected</span>
              </div>
            ) : (
              <Button size="sm" onClick={() => setShowLoginModal(true)}>
                Connect
              </Button>
            )}
          </div>

          {/* Google */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <Mail className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Google Account</p>
                {user?.googleEmail ? (
                  <p className="text-xs text-muted-foreground">{user.googleEmail}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not linked</p>
                )}
              </div>
            </div>
            {user?.googleEmail ? (
              <span className="text-xs text-green-500 font-medium">Linked</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowLoginModal(true)}>
                Link Google
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Security Best Practices</CardTitle>
          <CardDescription>Keep your account safe with these recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Enable Rialo 2FA</p>
                <p className="text-xs text-muted-foreground">
                  Add an extra layer of protection to all your transactions
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Link your Google account</p>
                <p className="text-xs text-muted-foreground">Enables account recovery and additional verification</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Never share your private keys</p>
                <p className="text-xs text-muted-foreground">
                  Rialo will never ask for your private key or seed phrase
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Verify transaction details</p>
                <p className="text-xs text-muted-foreground">Always review swap and bridge details before confirming</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </div>
  )
}
