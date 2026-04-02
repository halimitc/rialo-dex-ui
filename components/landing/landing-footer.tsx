import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div>
                <img
                  src="https://dex.rialo.my.id/logo.png?v=2"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'><path d='M12 2L2 22h20L12 2z'/></svg>";
                  }}
                  alt="Rialo Logo"
                  fetchPriority="high"
                  loading="eager"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="text-xl font-semibold text-foreground">Rialo</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">Protocol-level 2FA security for decentralized trading.</p>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Products</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/apps/markets"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Markets
                </Link>
              </li>
              <li>
                <Link
                  href="/apps/profile"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/apps/faucet"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Faucet
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://docs.rialo.my.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/halimitc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://solscan.io?cluster=Devnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Solscan
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} Rialo. All rights reserved. Built on Solana Devnet.
          </p>
        </div>
      </div>
    </footer>
  )
}
