import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function LandingCTA() {
  return (
    <section id="security" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(169,221,211,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(169,221,211,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-20 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground text-balance">
              Ready to Experience the Future of Trading?
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of traders who trust Rialo for secure, fast, and transparent decentralized trading on
              Devnet.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/apps/markets">
                <Button size="lg" className="gap-2 text-base px-8">
                  Launch Trading App
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/apps/profile">
                <Button size="lg" variant="outline" className="text-base px-8 bg-transparent">
                  Get Devnet SOL
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
