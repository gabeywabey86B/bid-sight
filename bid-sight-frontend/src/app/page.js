export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-12">
        <section className="w-full rounded-lg border border-border bg-card p-10 text-card-foreground shadow-sm">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-medium text-muted-foreground">BidSight frontend</p>
            <h1 className="text-3xl font-semibold tracking-tight">Blank slate</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              This page has been reset to a minimal shadcn-style canvas so you can rebuild the interface from scratch.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
