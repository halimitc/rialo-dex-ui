"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SlippageSettingsProps {
  slippage: string
  setSlippage: (value: string) => void
}

const PRESETS = ["0.1", "0.5", "1.0"]

export function SlippageSettings({ slippage, setSlippage }: SlippageSettingsProps) {
  const isCustom = !PRESETS.includes(slippage)

  return (
    <div className="rounded-lg bg-secondary/50 p-4">
      <p className="text-sm font-medium text-foreground mb-3">Slippage Tolerance</p>
      <div className="flex items-center gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            variant="secondary"
            size="sm"
            onClick={() => setSlippage(preset)}
            className={cn("flex-1", slippage === preset && "bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            {preset}%
          </Button>
        ))}
        <div className="relative flex-1">
          <Input
            type="number"
            value={isCustom ? slippage : ""}
            onChange={(e) => setSlippage(e.target.value)}
            placeholder="Custom"
            className={cn("h-9 pr-6 text-sm", isCustom && "border-primary")}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
        </div>
      </div>
      {Number(slippage) > 5 && (
        <p className="mt-2 text-xs text-yellow-500">High slippage tolerance. Your transaction may be frontrun.</p>
      )}
    </div>
  )
}
