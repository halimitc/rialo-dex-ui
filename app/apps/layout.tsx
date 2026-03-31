import type { ReactNode } from "react"
import { AppsHeader } from "@/components/apps/apps-header"
import { AppsSidebar } from "@/components/apps/apps-sidebar"

export default function AppsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppsSidebar />
      {/* Main content area with sidebar offset */}
      <div className="lg:pl-64 transition-all duration-300">
        <AppsHeader />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  )
}
