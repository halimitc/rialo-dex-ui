"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { useState, useEffect } from "react"

interface CoinData {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
  image: string
}

const MOCK_COINS: CoinData[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 43250, price_change_percentage_24h: 2.5, image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400" },
  { id: "solana", symbol: "sol", name: "Solana", current_price: 145.50, price_change_percentage_24h: 5.2, image: "https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756" },
  { id: "ripple", symbol: "xrp", name: "XRP", current_price: 2.85, price_change_percentage_24h: -1.3, image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442" },
]

export function MarketStats() {
  const [data, setData] = useState<CoinData[]>(MOCK_COINS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to fetch from CoinGecko API
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=solana,bitcoin,ripple&order=market_cap_desc",
          { signal: controller.signal }
        )
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const coins = await response.json()
          setData(coins)
          console.log("[v0] Market stats fetched successfully")
        } else {
          console.warn("[v0] Market stats API returned error, using mock data")
        }
      } catch (err) {
        console.warn("[v0] Failed to fetch market stats, using mock data:", err instanceof Error ? err.message : String(err))
        // Keep using mock data
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading || !data) {
    return (
      <div className="border-b border-border bg-card/30 px-4 py-3">
        <div className="flex items-center gap-8 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse shrink-0">
              <div className="h-8 w-8 rounded-full bg-secondary" />
              <div className="space-y-1">
                <div className="h-4 w-16 bg-secondary rounded" />
                <div className="h-3 w-20 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-border bg-card/30 px-4 py-3">
      <div className="flex items-center gap-8 overflow-x-auto">
        {data.map((coin) => {
          const isPositive = coin.price_change_percentage_24h >= 0
          return (
            <div key={coin.id} className="flex items-center gap-3 shrink-0">
              <img
                src={coin.image || "/placeholder.svg"}
                alt={coin.name}
                className="h-8 w-8 rounded-full"
                crossOrigin="anonymous"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{coin.symbol.toUpperCase()}</span>
                  <span
                    className={`flex items-center gap-0.5 text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}
                  >
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
