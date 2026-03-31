import { Shield, Zap, Lock, BarChart3, Wallet, Code } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Protocol-Level 2FA",
    description:
      "Every sensitive action requires cryptographic proof from our trusted backend signer, eliminating single points of failure.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Sub-second trade execution with optimized smart contracts designed for minimal gas consumption.",
  },
  {
    icon: Lock,
    title: "Non-Custodial",
    description:
      "Your keys, your crypto. We never hold your funds - trade directly from your wallet with full control.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Charts",
    description: "Professional TradingView integration with advanced charting tools and technical indicators.",
  },
  {
    icon: Wallet,
    title: "Multi-Wallet Support",
    description: "Connect with MetaMask, WalletConnect, and other popular wallets seamlessly.",
  },
  {
    icon: Code,
    title: "Open Architecture",
    description: "Built on transparent, auditable smart contracts with a developer-friendly API for integrations.",
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Built for Serious Traders</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Combining the security of centralized exchanges with the freedom of DeFi
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/80"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
