import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap } from "lucide-react"

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(169,221,211,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(169,221,211,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(169,221,211,0.08)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8">
            <Shield className="h-4 w-4" />
            Protocol-Level 2FA Security
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground text-balance max-w-4xl mx-auto">
            Trade with <span className="text-primary">Confidence</span> on the Next-Gen DEX
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Experience institutional-grade security with Rialo&apos;s innovative 2FA architecture. Built for traders who
            demand both speed and protection.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/apps/markets">
              <Button size="lg" className="gap-2 text-base px-8">
                Start Trading
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 bg-transparent">
                <Zap className="h-4 w-4" />
                Learn More
              </Button>
            </Link>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-xl border border-border bg-card/50 backdrop-blur overflow-hidden shadow-2xl shadow-primary/5">
              <div className="aspect-[16/9] max-h-[500px] bg-gradient-to-br from-card via-card to-secondary/20 flex items-center justify-center">
                {/* Trading Interface Preview */}
                <div className="w-full h-full p-4 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                    {/* Chart Area */}
                    <div className="lg:col-span-2 rounded-lg border border-border bg-background/50 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/20" />
                          <div>
                            <div className="text-sm font-medium text-foreground">BTC/USD</div>
                            <div className="text-xs text-muted-foreground">Bitcoin</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-foreground">$67,432.00</div>
                          <div className="text-xs text-green-500">+2.34%</div>
                        </div>
                      </div>
                      {/* Mock Chart */}
                      <div className="h-32 sm:h-48 flex items-end gap-1">
                        {[40, 55, 45, 60, 50, 70, 65, 80, 75, 85, 70, 90, 85, 95, 80, 100].map((height, i) => (
                          <div key={i} className="flex-1 bg-primary/30 rounded-t" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </div>

                    {/* Order Panel */}
                    <div className="rounded-lg border border-border bg-background/50 p-4">
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <div className="flex-1 py-2 rounded bg-green-500/20 text-green-500 text-sm font-medium text-center">
                            Buy
                          </div>
                          <div className="flex-1 py-2 rounded bg-secondary text-muted-foreground text-sm font-medium text-center">
                            Sell
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Amount</div>
                          <div className="h-10 rounded bg-secondary border border-border" />
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Price</div>
                          <div className="h-10 rounded bg-secondary border border-border" />
                        </div>
                        <div className="h-10 rounded bg-primary flex items-center justify-center text-sm font-medium text-primary-foreground">
                          Place Order
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
