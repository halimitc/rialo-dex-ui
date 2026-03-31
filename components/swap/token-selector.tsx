"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ChevronDown, Search } from "lucide-react"

interface Token {
  symbol: string
  name: string
  icon?: string
  logo?: string
  balance: string
  mint?: string
}

// Helper to render token icons
const getTokenIcon = (icon: string) => {
  const iconMap: Record<string, string> = {
    SOL: "Ξ",
    USDC: "◆",
    USDT: "T",
    DAI: "◇",
    BTC: "₿",
  }
  return iconMap[icon] || "◇"
}

interface TokenSelectorProps {
  selected: Token
  onSelect: (token: Token) => void
  tokens: Token[]
}

export function TokenSelector({ selected, onSelect, tokens }: TokenSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(search.toLowerCase()) ||
      token.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 hover:bg-secondary/80 transition-colors">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
            {getTokenIcon(selected.icon || selected.symbol)}
          </div>
          <span className="font-medium text-foreground">{selected.symbol}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or symbol"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="mt-4 max-h-80 overflow-y-auto space-y-1">
          {filteredTokens.map((token) => (
            <button
              key={token.symbol}
              onClick={() => {
                onSelect(token)
                setOpen(false)
                setSearch("")
              }}
              className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-secondary transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
                {getTokenIcon(token.icon || token.symbol)}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">{token.symbol}</p>
                <p className="text-sm text-muted-foreground">{token.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">{token.balance}</p>
            </button>
          ))}
          {filteredTokens.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No tokens found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
