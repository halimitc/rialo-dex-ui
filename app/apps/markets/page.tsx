import { Suspense } from "react"
import { TradingViewChart } from "@/components/markets/tradingview-chart"
import { CryptoList } from "@/components/markets/crypto-list"
import { MarketStats } from "@/components/markets/market-stats"

export default function MarketsPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Market Stats Bar */}
      <Suspense fallback={<MarketStatsSkeleton />}>
        <MarketStats />
      </Suspense>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Chart Section - 70% on desktop */}
        <div className="flex-1 lg:w-[70%] min-h-[520px] h-[70vh] lg:h-auto border-b lg:border-b-0 lg:border-r border-border">
          <TradingViewChart />
        </div>

        {/* Sidebar - 30% on desktop */}
        <div className="lg:w-[30%] min-w-[300px] overflow-auto">
          <Suspense fallback={<CryptoListSkeleton />}>
            <CryptoList />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function MarketStatsSkeleton() {
  return (
    <div className="border-b border-border bg-card/30 px-4 py-3">
      <div className="flex items-center gap-8 overflow-x-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
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

function CryptoListSkeleton() {
  return (
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
  )
}
