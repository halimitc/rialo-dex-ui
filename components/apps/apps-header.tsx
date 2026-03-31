"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWeb3 } from "@/components/providers/web3-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Wallet, Loader2, LogOut, ChevronDown, Copy, ExternalLink, UserCircle } from "lucide-react"

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const pageTitles: Record<string, string> = {
  "/apps/markets": "Markets",
  "/apps/swap": "Swap",
  "/apps/bridge": "Bridge",
  "/apps/faucet": "Faucet",
  "/apps/profile": "Profile",
  "/apps/security": "Security",
}

export function AppsHeader() {
  const pathname = usePathname()

  // 🔥 PAKAI WEB3 BARU
  const { address, isConnected, connectWallet, disconnectWallet, network, switchNetwork } = useWeb3()

  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (!address) {
      setProfileAvatar(null)
      return
    }

    const loadProfile = () => {
      try {
        const savedProfile = localStorage.getItem(`rialo-profile-${address}`)
        if (savedProfile) {
          const profile = JSON.parse(savedProfile)
          setProfileAvatar(profile.avatar || null)
        } else {
          setProfileAvatar(null)
        }
      } catch (e) {
        setProfileAvatar(null)
      }
    }

    loadProfile()

    window.addEventListener("profileUpdated", loadProfile)
    return () => window.removeEventListener("profileUpdated", loadProfile)
  }, [address])

  const pageTitle = pageTitles[pathname] || "Dashboard"

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Title */}
        <h1 className="text-xl font-semibold">{pageTitle}</h1>

        <div className="flex items-center gap-3">

          {/* NETWORK SWITCHER */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden sm:flex items-center gap-2 h-9 px-3 py-1.5 rounded-full bg-secondary text-xs border-0 outline-none hover:bg-secondary/80 focus:ring-0">
                <span className={`h-2 w-2 rounded-full animate-pulse ${network === 'mainnet-beta' ? 'bg-green-500' : network === 'testnet' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                {network === 'mainnet-beta' ? 'Solana Mainnet' : network === 'testnet' ? 'Solana Testnet' : 'Solana Devnet'}
                <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => switchNetwork('mainnet-beta')} className="cursor-pointer">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-3" />
                Solana Mainnet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchNetwork('testnet')} className="cursor-pointer">
                <span className="h-2 w-2 rounded-full bg-orange-500 mr-3" />
                Solana Testnet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchNetwork('devnet')} className="cursor-pointer">
                <span className="h-2 w-2 rounded-full bg-blue-500 mr-3" />
                Solana Devnet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* WALLET */}
          {isConnected && address ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Wallet className="h-4 w-4" />
                  {formatAddress(address)}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2 text-sm">
                  <p className="font-medium">{formatAddress(address)}</p>
                  <p className="text-xs text-muted-foreground">Connected Wallet</p>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(address)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `https://explorer.solana.com/address/${address}?cluster=devnet`,
                      "_blank"
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Explorer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 🔥 DISCONNECT FIX */}
                <DropdownMenuItem
                  onClick={disconnectWallet}
                  className="text-red-500 focus:text-red-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={connectWallet} className="gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}

          {/* PROFILE ICON */}
          {isConnected && address && (
            <Link href="/apps/profile">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-secondary hover:bg-secondary/80 overflow-hidden">
                {profileAvatar ? (
                  <Avatar className="h-full w-full">
                    <AvatarImage src={profileAvatar} alt="Profile" className="object-cover" />
                    <AvatarFallback><UserCircle className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <UserCircle className="h-5 w-5" />
                )}
                <span className="sr-only">Profile</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}