"use client"

import { TrendingUp, TrendingDown, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface CoinData {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
  image: string
  market_cap_rank: number
  market_cap: number
  total_volume: number
}

export function CryptoList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [data, setData] = useState<CoinData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false"
        )
        if (!response.ok) throw new Error("Failed to fetch")
        const coins = await response.json()
        setData(coins)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch market data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const filteredCoins =
    data?.filter(
      (coin) =>
        coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || []

  if (error) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Failed to load market data</p>
        <p className="text-xs mt-1">Please try again later</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">Top 50 Cryptocurrencies</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-secondary" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-20 bg-secondary rounded" />
                  <div className="h-3 w-16 bg-secondary rounded" />
                </div>
                <div className="text-right space-y-1">
                  <div className="h-4 w-24 bg-secondary rounded" />
                  <div className="h-3 w-16 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCoins.map((coin) => {
              const isPositive = coin.price_change_percentage_24h >= 0
              return (
                <div
                  key={coin.id}
                  className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-center w-6 text-xs text-muted-foreground">
                    {coin.market_cap_rank}
                  </div>
                  <img
                    src={coin.image || "/placeholder.svg"}
                    alt={coin.name}
                    className="h-10 w-10 rounded-full"
                    crossOrigin="anonymous"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{coin.name}</div>
                    <div className="text-xs text-muted-foreground">{coin.symbol.toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      ${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </div>
                    <div
                      className={`flex items-center justify-end gap-0.5 text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}
                    >
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredCoins.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No coins found matching your search</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
