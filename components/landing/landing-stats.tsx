export function LandingStats() {
  const stats = [
    { value: "$2.4B+", label: "Trading Volume" },
    { value: "150K+", label: "Active Traders" },
    { value: "99.9%", label: "Uptime" },
    { value: "<0.1s", label: "Execution Speed" },
  ]

  return (
    <section className="py-20 border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">{stat.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
