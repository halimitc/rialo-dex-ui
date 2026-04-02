"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/auth-provider"
import { LoginModal } from "@/components/auth/login-modal"
import {
  BarChart3,
  ArrowLeftRight,
  Droplets,
  ArrowRightLeft,
  User,
  Shield,
  Home,
  Menu,
  X,
  LogIn,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/apps/markets", label: "Markets", icon: BarChart3 },
  { href: "/apps/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/apps/bridge", label: "Bridge", icon: ArrowRightLeft },
  { href: "/apps/faucet", label: "Faucet", icon: Droplets },
  { href: "/apps/profile", label: "Profile", icon: User },
  { href: "/apps/security", label: "Security", icon: Shield },
]

export function AppsSidebar() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full border-r border-border bg-card transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div
            className={cn(
              "flex h-16 items-center border-b border-border px-4",
              isCollapsed ? "justify-center" : "justify-between",
            )}
          >
            {!isCollapsed && (
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
            )}
            {isCollapsed && (
              <Link href="/">
                <span className="text-lg font-bold text-primary-foreground">
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
                </span>
              </Link>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "hidden lg:flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
                isCollapsed && "absolute -right-3 top-5 bg-card border border-border rounded-full",
              )}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  isCollapsed && "justify-center px-0",
                )}
              >
                <Home className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Home</span>}
              </Link>

              <div className={cn("py-2", !isCollapsed && "px-3")}>
                {!isCollapsed && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trading</p>
                )}
                {isCollapsed && <div className="h-px bg-border mx-2" />}
              </div>

              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                      isCollapsed && "justify-center px-0",
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className={cn("border-t border-border p-3", isCollapsed && "flex justify-center")}>
            {!isAuthenticated ? (
              <Button
                onClick={() => setShowLoginModal(true)}
                className={cn("w-full gap-2", isCollapsed && "w-10 h-10 p-0")}
                size={isCollapsed ? "icon" : "default"}
              >
                <LogIn className="h-4 w-4" />
                {!isCollapsed && "Sign In"}
              </Button>
            ) : (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-2",
                  isCollapsed && "p-1",
                )}
              >
                <Shield className="h-4 w-4 text-primary shrink-0" />
                {!isCollapsed && (
                  <div className="text-xs">
                    <p className="font-medium text-primary">2FA Active</p>
                    <p className="text-muted-foreground">Rialo Protocol</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  )
}
