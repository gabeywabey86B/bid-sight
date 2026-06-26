import {
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Database,
  GraduationCap,
  Layers3,
  ListChecks,
  LockKeyhole,
  Trophy,
  Users,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const sidebarItems = [
  { label: "Training Mode", icon: GraduationCap, active: true },
  { label: "Dataset", icon: Database },
  { label: "Leaderboard", icon: Trophy },
  { label: "Personal Stats", icon: BarChart3 },
]

const courseDetails = [
  { label: "Course", value: "CS101-A" },
  { label: "Professor", value: "Dr. Smith" },
  { label: "Timing", value: "Mon/Wed 8:15 AM" },
  { label: "Available spots", value: "40" },
]

const bidHistory = [
  { term: "Last semester", minimum: "e$18.50", median: "e$23.10" },
  { term: "2 semesters ago", minimum: "e$17.00", median: "e$21.80" },
  { term: "3 semesters ago", minimum: "e$26.20", median: "e$31.40" },
]

const sessionStats = [
  { label: "Correct", value: "3" },
  { label: "Incorrect", value: "1" },
  { label: "Accuracy", value: "75%" },
  { label: "Streak", value: "3" },
]

export default function Home() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Layers3 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">BidSight</p>
              <p className="text-xs text-muted-foreground">SMU BOSS trainer</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon

            return (
              <a
                key={item.label}
                href="#"
                className={
                  item.active
                    ? "flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground"
                    : "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }
              >
                <Icon className="size-4" />
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-4">
          <div className="rounded-md border border-sidebar-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Current session</p>
            <p className="mt-2 text-2xl font-semibold">3 / 4</p>
            <p className="mt-1 text-xs text-muted-foreground">75% accuracy</p>
          </div>
          <div className="rounded-md border border-sidebar-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Prediction target</p>
            <p className="mt-2 text-lg font-semibold">Over e$25?</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-card">
              <Layers3 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">BidSight</p>
              <p className="text-xs text-muted-foreground">Training Mode</p>
            </div>
          </div>

          <section className="rounded-md border border-border bg-card p-5 text-card-foreground sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <LockKeyhole className="size-3.5" />
                  Hidden outcome mode
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-normal">Will this section clear above e$25?</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Study the course details and historical trends, make one prediction, then reveal the real BOSS result and update your accuracy.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[360px] lg:grid-cols-2">
                {sessionStats.map((stat) => (
                  <div key={stat.label} className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <section className="space-y-6">
              <div className="rounded-md border border-border bg-card p-5 text-card-foreground sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Round 05 of 20</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-normal">CS101-A</h2>
                  </div>
                  <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium">
                    Outcome hidden
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {courseDetails.map((detail) => (
                    <div key={detail.label} className="rounded-md border border-border bg-background p-4">
                      <p className="text-xs font-medium text-muted-foreground">{detail.label}</p>
                      <p className="mt-2 text-sm font-semibold">{detail.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-md border border-border bg-background">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Clock3 className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Past trend</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {bidHistory.map((history) => (
                      <div key={history.term} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-3">
                        <p className="font-medium">{history.term}</p>
                        <p className="text-muted-foreground">Minimum: {history.minimum}</p>
                        <p className="text-muted-foreground">Median: {history.median}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-5 text-card-foreground sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <ListChecks className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-normal">Your prediction</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Choose whether the real minimum bid was over the training threshold.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button className="h-16 justify-start px-5 text-base" size="lg">
                    <CheckCircle2 />
                    Yes, over e$25
                  </Button>
                  <Button className="h-16 justify-start px-5 text-base" variant="outline" size="lg">
                    <XCircle />
                    No, e$25 or under
                  </Button>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-md border border-border bg-card p-5 text-card-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                    <BookOpenCheck className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Reveal panel</h2>
                    <p className="text-sm text-muted-foreground">Appears after you submit.</p>
                  </div>
                </div>

                <div className="mt-5 rounded-md border border-dashed border-border bg-background p-4">
                  <p className="text-sm font-medium">Actual minimum bid</p>
                  <p className="mt-3 text-3xl font-semibold text-muted-foreground">Hidden</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    After prediction, this changes to the actual result, marks right or wrong, and updates your streak.
                  </p>
                </div>
              </section>

              <section className="rounded-md border border-border bg-card p-5 text-card-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Why this mode works</h2>
                    <p className="text-sm text-muted-foreground">One fast feedback loop.</p>
                  </div>
                </div>

                <ol className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <li className="rounded-md border border-border bg-background p-3">1. Read course context and historical bid trend.</li>
                  <li className="rounded-md border border-border bg-background p-3">2. Predict over or under the threshold.</li>
                  <li className="rounded-md border border-border bg-background p-3">3. Reveal the result and track accuracy.</li>
                </ol>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
