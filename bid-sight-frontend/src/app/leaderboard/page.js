export default function CoursesPage() {
  return (
    <section className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Competition</p>
          <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Placeholder for leaderboard page.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
          <p className="text-sm leading-6 text-muted-foreground">
            Ready for player names and such.
          </p>
        </div>
      </div>
    </section>
  );
}
