import { Button } from "@/components/ui/button"

const buttonVariants = [
  { label: "Default", props: {} },
  { label: "Outline", props: { variant: "outline" } },
  { label: "Secondary", props: { variant: "secondary" } },
  { label: "Ghost", props: { variant: "ghost" } },
  { label: "Destructive", props: { variant: "destructive" } },
  { label: "Link", props: { variant: "link" } },
]

const buttonSizes = ["xs", "sm", "default", "lg", "icon"]

const colors = [
  { name: "Background", className: "bg-background" },
  { name: "Foreground", className: "bg-foreground" },
  { name: "Primary", className: "bg-primary" },
  { name: "Secondary", className: "bg-secondary" },
  { name: "Muted", className: "bg-muted" },
  { name: "Accent", className: "bg-accent" },
  { name: "Destructive", className: "bg-destructive" },
  { name: "Border", className: "bg-border" },
]

export const metadata = {
  title: "Components | Bid Sight",
}

export default function ComponentsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="border-b border-border pb-5">
          <p className="text-sm font-medium text-muted-foreground">Bid Sight UI</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Components</h1>
        </header>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Buttons</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Variant and size checks for the shared button component.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="flex flex-wrap items-center gap-3">
              {buttonVariants.map(({ label, props }) => (
                <Button key={label} {...props}>
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="flex flex-wrap items-center gap-3">
              {buttonSizes.map((size) => (
                <Button key={size} size={size} variant="outline" aria-label={size === "icon" ? "Icon button" : undefined}>
                  {size === "icon" ? "B" : size}
                </Button>
              ))}
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Theme Tokens</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These swatches come from the global CSS variables in globals.css.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {colors.map((color) => (
              <div key={color.name} className="rounded-lg border border-border bg-card p-3">
                <div className={`h-16 rounded-md border border-border ${color.className}`} />
                <p className="mt-3 text-sm font-medium">{color.name}</p>
                <p className="text-xs text-muted-foreground">{color.className}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
