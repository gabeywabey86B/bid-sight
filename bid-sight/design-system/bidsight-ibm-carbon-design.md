# BidSight IBM Carbon Design System

## Overview
Professional, minimalist enterprise leaderboard app. Inspired by IBM Carbon's design principles: clarity, efficiency, and trust. Perfect for competitive academic bidding training.

---

## Design Principles (IBM Carbon-inspired)

### 1. **Clarity First**
- Clean, minimal interfaces with clear hierarchy
- Information-dense but never cluttered
- High contrast for readability

### 2. **Efficient Navigation**
- Predictable, logical navigation structure
- Breadcrumbs for drill-down analytics
- Keyboard accessibility throughout

### 3. **Trust & Authority**
- Professional color palette (blues + warm accents)
- Consistent, predictable interactions
- Real-time data transparency

### 4. **Enterprise Grade**
- Accessible (WCAG AAA compliant)
- Responsive across all breakpoints
- Dark mode support

---

## Color Palette

| Role | Color | Hex | CSS Var | Usage |
|------|-------|-----|---------|-------|
| **Primary** | IBM Blue | `#2563EB` | `--color-primary` | Buttons, links, active states |
| **On Primary** | White | `#FFFFFF` | `--color-on-primary` | Text on primary backgrounds |
| **Secondary** | Purple | `#7C3AED` | `--color-secondary` | Secondary actions, accents |
| **Accent/CTA** | Gold | `#F59E0B` | `--color-accent` | Call-to-action buttons, highlights |
| **Background** | Light Blue | `#EFF6FF` | `--color-background` | Page background (light mode) |
| **Surface** | White | `#FFFFFF` | `--color-surface` | Cards, containers |
| **Foreground** | Charcoal | `#0F172A` | `--color-foreground` | Primary text |
| **Muted** | Light Gray | `#F1F5FD` | `--color-muted` | Secondary text, disabled states |
| **Border** | Soft Gray | `#E4ECFC` | `--color-border` | Borders, dividers |
| **Destructive** | Red | `#DC2626` | `--color-destructive` | Errors, warnings |
| **Ring** | Blue | `#2563EB` | `--color-ring` | Focus indicators |
| **Success** | Green | `#22C55E` | `--color-success` | Success states, good predictions |

### Dark Mode Colors

| Role | Dark Hex | Usage |
|------|----------|-------|
| **Background** | `#0F1419` | Page background (dark mode) |
| **Surface** | `#1A1F2E` | Cards, containers |
| **Foreground** | `#F5F5F5` | Primary text |
| **Muted** | `#9CA3AF` | Secondary text |
| **Border** | `#2D3748` | Borders, dividers |

---

## Typography

### Font Pairing
- **Display**: **Jost** (sans-serif) - Modern, clean, minimal
- **Body**: **Jost** (sans-serif) - Consistent, professional, highly readable
- **Monospace**: **IBM Plex Mono** (for scores, numbers) - Data-focused

### Google Fonts Import
```css
@import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
```

### Type Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|------------|-------|
| **Display** | 2.5rem (40px) | 700 | 1.2 | Page titles, hero text |
| **H1** | 2rem (32px) | 700 | 1.25 | Section headers |
| **H2** | 1.5rem (24px) | 600 | 1.3 | Subsection headers |
| **H3** | 1.25rem (20px) | 600 | 1.35 | Card headers |
| **Body Large** | 1rem (16px) | 400 | 1.5 | Primary body text |
| **Body** | 0.9375rem (15px) | 400 | 1.6 | Secondary body text, table text |
| **Small** | 0.875rem (14px) | 400 | 1.5 | Helper text, captions |
| **Tiny** | 0.75rem (12px) | 500 | 1.4 | Labels, badges |

---

## Spacing Scale

Based on 8px baseline (IBM Carbon standard):

```css
--space-xs: 4px;   /* 0.5x )
--space-sm: 8px;   /* 1x baseline )
--space-md: 16px;  /* 2x )
--space-lg: 24px;  /* 3x )
--space-xl: 32px;  /* 4x )
--space-2xl: 48px; /* 6x )
--space-3xl: 64px; /* 8x )
```

### Standard Gaps
- **Grid gap**: 16px (--space-md)
- **Card padding**: 24px (--space-lg)
- **Element margin**: 16-24px
- **Section margin**: 48px (--space-2xl)

---

## Layout Grid

- **Desktop**: 12-column grid, max-width 1280px
- **Tablet**: 8-column grid
- **Mobile**: 4-column grid, full width with safe margins
- **Breakpoints**: 
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

---

## Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--color-primary);    /* #2563EB */
  color: var(--color-on-primary);      /* #FFFFFF */
  border: none;
  border-radius: 4px;                  /* --radius-sm */
  padding: 12px 24px;                  /* Increased for enterprise */
  font-weight: 600;
  font-size: 0.9375rem;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;                 /* Darker blue */
  transform: none;                     /* Enterprise: no transform */
}

.btn-primary:focus {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

#### Secondary Button (Ghost)
```css
.btn-ghost {
  background: var(--color-surface);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 0.9375rem;
  transition: all 200ms ease;
}

.btn-ghost:hover:not(:disabled) {
  background: var(--color-muted);
}
```

#### Accent Button (CTA)
```css
.btn-accent {
  background: var(--color-accent);     /* #F59E0B */
  color: #000000;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 200ms ease;
}

.btn-accent:hover {
  background: #d97706;                 /* Darker gold */
}
```

---

### Data Tables (Professional)

```css
table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

thead {
  background: var(--color-muted);      /* Light gray */
  border-bottom: 2px solid var(--color-border);
}

th {
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--color-foreground);
}

td {
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9375rem;
}

tbody tr:hover {
  background: var(--color-muted);
  transition: background 150ms ease;
}

tbody tr.own-row {
  background: rgba(37, 99, 235, 0.05);  /* Highlight user's own row */
  border-left: 4px solid var(--color-primary);
}

.num-col {
  text-align: right;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
}
```

---

### Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 200ms ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--color-primary);
}
```

---

### Navigation

#### Navbar (Sticky Header)
```css
.navbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.navbar .brand {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-right: auto;
  color: var(--color-foreground);
}

.navbar a {
  color: var(--color-foreground);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 150ms ease;
  position: relative;
}

.navbar a:hover {
  background: var(--color-muted);
}

.navbar a.active {
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
}
```

---

### Forms & Inputs

```css
input, textarea, select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-foreground);
  transition: all 200ms ease;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

input:disabled {
  background: var(--color-muted);
  cursor: not-allowed;
  opacity: 0.6;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--color-foreground);
}

.form-group {
  margin-bottom: 20px;
}
```

---

### Modals & Dialogs

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--color-foreground);
}

.modal-body {
  margin-bottom: 24px;
  color: var(--color-foreground);
  line-height: 1.6;
}
```

---

## Animations

### Duration Standards
```css
--duration-fast: 150ms;        /* Micro-interactions */
--duration-standard: 200ms;    /* Standard transitions */
--duration-slow: 300ms;        /* Reveal animations */
```

### Easing Functions
```css
--ease-standard: cubic-bezier(0.2, 0, 0.38, 0.9);      /* IBM Standard */
--ease-entrance: cubic-bezier(0, 0, 0.38, 0.9);        /* Entrance */
--ease-exit: cubic-bezier(0.2, 0, 1, 0.9);             /* Exit */
```

### Common Animations
- **Hover**: 150ms background/color change
- **Focus**: 200ms ring appearance
- **Transitions**: 200ms smooth state changes
- **Entrance**: 300ms fade/slide (optional)
- **Loading**: Subtle pulse animation (non-intrusive)

---

## Data Visualization

### Charts (Recharts)
- **Primary color**: #2563EB (blue)
- **Secondary color**: #7C3AED (purple)
- **Accent color**: #F59E0B (gold)
- **Grid lines**: var(--color-border) at 30% opacity
- **Tooltips**: Dark background with white text, 4px border-radius
- **Legend**: Positioned bottom, horizontal

### Leaderboard Scoring
- **Perfect (1.0)**: Green (#22C55E)
- **Good (0.7-0.99)**: Blue (#2563EB)
- **Fair (0.4-0.69)**: Yellow (#F59E0B)
- **Poor (<0.4)**: Red (#DC2626)

---

## Accessibility Checklist

- [ ] Contrast: Text vs. background ≥ 4.5:1 (AAA: 7:1)
- [ ] Focus indicators: Clear 2px blue ring
- [ ] Keyboard nav: Tab through all interactive elements
- [ ] ARIA labels: All buttons, icons, form fields
- [ ] Mobile touch: Min 44×44px tap targets
- [ ] Dark mode: Full support with adjusted colors
- [ ] Reduced motion: Respect `prefers-reduced-motion`
- [ ] Alt text: All images and icons

---

## Dark Mode Support

When `prefers-color-scheme: dark`:
- Invert backgrounds (dark backgrounds, light text)
- Adjust contrast ratios (7:1 minimum for AAA)
- Soften blue primary to #60A5FA for readability
- Increase padding slightly for visual separation
- Use semi-transparent overlays instead of solid colors

---

## Pre-Delivery Checklist

- [ ] All buttons have visible focus states
- [ ] No color-only information conveyance
- [ ] Tables have proper header markup
- [ ] Forms have associated labels
- [ ] Navigation is keyboard-accessible
- [ ] Mobile breakpoints tested (375px, 768px, 1024px, 1440px)
- [ ] Dark mode contrast verified
- [ ] SVG icons used (no emoji as UI)
- [ ] Animations respect reduced-motion
- [ ] Performance: Lighthouse score > 90

---

## References

- IBM Carbon Design System: https://www.carbondesignsystem.com/
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Material Design 3: https://m3.material.io/
- Recharts Documentation: https://recharts.org/
