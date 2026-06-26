<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Bid Sight Frontend Instructions

## Project Shape

- This is a Next.js app using the App Router, React, Tailwind CSS v4, and shadcn-style UI components.
- Application routes live in `src/app`.
- Reusable UI primitives live in `src/components/ui`.
- Shared helpers live in `src/lib`.
- Use the `@/` import alias for files under `src`.

## Before Changing Next.js Code

- This project uses a newer Next.js version. Before changing routing, metadata, server/client component behavior, config, or framework APIs, check the local Next.js docs in `node_modules/next/dist/docs/`.
- Prefer existing project patterns over older Next.js examples from memory.

## Components

- Put reusable base components in `src/components/ui`, such as `button.jsx`, `badge.jsx`, `card.jsx`, and `input.jsx`.
- Put larger app-specific components in `src/components`, outside `ui`, when they combine multiple primitives into a feature area.
- Export components by name.
- Keep component APIs small and predictable. Prefer props such as `variant`, `size`, `disabled`, and `className`.
- Use the existing `cn` helper from `@/lib/utils` when combining conditional classes.
- For variant-driven UI components, follow the existing `button.jsx` pattern using `class-variance-authority`.

Example:

```jsx
import { Button } from "@/components/ui/button"

export function BidActions() {
  return (
    <div className="flex items-center gap-2">
      <Button>Analyze Bid</Button>
      <Button variant="outline">Save Draft</Button>
    </div>
  )
}
```

## Styling

- Global design tokens live in `src/app/globals.css`.
- Prefer theme classes such as `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, and `rounded-lg`.
- Avoid hard-coded colors in components unless there is a specific one-off reason.
- Change app-wide colors, radii, and font aliases through CSS variables in `:root` and `.dark`.
- Keep light and dark mode values paired when adding new theme variables.

## Fonts

- Fonts are loaded in `src/app/layout.js` using `next/font`.
- Font variables should be mapped in `src/app/globals.css`.
- Use Tailwind font utilities like `font-sans`, `font-mono`, and `font-heading` rather than setting font families inside individual components.

## Component Preview Page

- If asked to view components by themselves, create a local preview route at `src/app/components/page.js`.
- Use that page as a simple component gallery for variants, sizes, states, and layout checks.
- Keep the preview page developer-facing; it does not need to be part of the production user flow.

Example route:

```jsx
import { Button } from "@/components/ui/button"

export default function ComponentsPage() {
  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Components</h1>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Delete</Button>
        </div>
      </section>
    </main>
  )
}
```

## UI Direction

- Bid Sight should feel like a focused bidding and analysis tool: clear, structured, and professional.
- Prefer dense but readable dashboards, tables, filters, cards for repeated records, and direct action controls.
- Avoid marketing-style landing pages unless specifically requested.
- Use lucide icons for icon buttons and common actions when icons are needed.

## Verification

- Run `npm run lint` after meaningful code changes.
- For visual changes, run the dev server and check the affected page in the browser.
