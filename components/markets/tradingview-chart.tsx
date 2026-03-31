"use client"

import { useEffect, useRef, memo } from "react"

function TradingViewChartComponent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous content
    containerRef.current.innerHTML = ""

    // Create widget container
    const widgetContainer = document.createElement("div")
    widgetContainer.className = "tradingview-widget-container"
    widgetContainer.style.height = "100%"
    widgetContainer.style.width = "100%"

    const widgetDiv = document.createElement("div")
    widgetDiv.className = "tradingview-widget-container__widget"
    widgetDiv.style.height = "calc(100% - 32px)"
    widgetDiv.style.width = "100%"

    widgetContainer.appendChild(widgetDiv)
    containerRef.current.appendChild(widgetContainer)

    // Create and load script
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BINANCE:BTCUSDT",
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(1, 1, 1, 1)",
      gridColor: "rgba(42, 42, 42, 0.5)",
      allow_symbol_change: true,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    })

    scriptRef.current = script
    widgetContainer.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="h-full w-full bg-background">
      {/* Loading state */}
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart...</div>
      </div>
    </div>
  )
}

export const TradingViewChart = memo(TradingViewChartComponent)
