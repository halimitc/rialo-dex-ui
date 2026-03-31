"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useWeb3 } from "@/components/providers/web3-provider"
import { Wallet, Loader2, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LoginModal } from "@/components/auth/login-modal"

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function ConnectWalletButton() {
  const { address, isConnected, isConnecting, disconnect, network } = useWeb3()
  const [showLoginModal, setShowLoginModal] = useState(false)

  if (isConnecting) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    )
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <Wallet className="h-4 w-4" />
            {formatAddress(address)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Wallet Info</p>
            <p className="text-sm font-mono mt-1 break-all">{address}</p>
            <p className="text-xs text-primary mt-2">Network: Solana {network.toUpperCase()}</p>
          </div>
          <div className="my-2 border-t"></div>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(address)} className="cursor-pointer">
            <span>Copy Address</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => window.open(`https://explorer.solana.com/address/${address}?cluster=Devnet`, "_blank")}
            className="cursor-pointer"
          >
            <span>View on Solana Explorer</span>
          </DropdownMenuItem>
          <div className="my-2 border-t"></div>
          <DropdownMenuItem onClick={disconnect} className="text-destructive cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <Button onClick={() => setShowLoginModal(true)} className="gap-2">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  )
}
