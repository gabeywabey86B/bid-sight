---
name: BidSight
description: A refined, Apple-inflected ledger for SMU BOSS module bidding.
colors:
  bg: "oklch(1 0 0)"
  surface: "oklch(0.98 0.003 250)"
  surface-raised: "oklch(0.955 0.005 250)"
  border: "oklch(0.9 0.005 250)"
  ink: "oklch(0.18 0.012 250)"
  muted: "oklch(0.5 0.012 250)"
  primary: "oklch(0.55 0.17 254)"
  primary-deep: "oklch(0.46 0.17 254)"
  accent: "oklch(0.62 0.19 150)"
  accent-deep: "oklch(0.52 0.18 150)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif"
    fontSize: "clamp(1.875rem, 3.5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.006em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.005em"
  numeric:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  numeric-lg:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
rounded:
  sm: "8px"
  md: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.sm}"
    padding: "11px 22px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.bg}"
    rounded: "{rounded.sm}"
    padding: "11px 22px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "11px 22px"
  badge-score-high:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    padding: "3px 12px"
  badge-score-low:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "3px 12px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "11px 14px"
---

# Design System: BidSight

## 1. Overview

**Creative North Star: "The Refined Ledger"**

BidSight keeps the discipline of a financial statement — white surface,
exact ink, numbers set in monospace so they line up like a ledger — but
now expressed with Apple's software polish rather than a bank's severity.
The previous pass (flat, sharp 4px corners, hard hairlines everywhere, zero
shadow) was correct in spirit but too austere to feel considered. This pass
keeps the same restraint — one accent color, monospace numerals, no
decorative clutter — and adds what Apple actually does: generous
whitespace, soft single-source shadows instead of hard borders, a livelier
systemBlue-family accent, SF Pro-first type, and smooth ease-out motion on
every interactive state. Depth is now felt, not drawn — most surfaces lose
their border entirely and gain a soft ambient shadow instead.

This still explicitly rejects the generic SaaS-dashboard look: no
cream/warm-tinted background, no uniform identical card grids, no tiny
uppercase eyebrows scaffolding every section, and — the specific failure
mode of the previous pass — no severe all-hairline, zero-shadow "spreadsheet
in a browser" look either. The target is macOS System Settings or a
well-made iOS app: calm, roomy, quietly confident.

**Key Characteristics:**
- Pure white background; elevation comes from soft, single-source shadows, not borders.
- A livelier systemBlue-family accent (oklch(0.55 0.17 254)) — lighter and more alive than the previous navy, still the only "act on this" color.
- Every bid, score, and error value renders in monospace with tabular figures.
- Generous spacing throughout — this system trades density for calm; the real data still all fits, it just breathes.
- SF Pro (via `-apple-system`) leads the font stack everywhere except numerals, with Inter as the cross-platform fallback.
- Motion is standard on every hover/focus/reveal — ease-out-expo, 120–220ms, never absent.

## 2. Colors

A soft near-white ramp carries structure; systemBlue and a muted green are the only saturated colors, each single-purpose.

### Primary
- **BidSight Blue** (oklch(0.55 0.17 254)): The one active-state color — primary buttons, active target toggle, active sort column, active nav underline, focus rings, checkbox accents. Lighter and more alive than a bank navy; closer to Apple's systemBlue. White text on top.

### Secondary
- **Ledger Green** (oklch(0.62 0.19 150)): Reserved for one meaning only — a strong score or a positive trend. Never a generic success checkmark. Bright enough to read unmistakably as "green" at a glance, not a muted sage that could be mistaken for gray.

### Neutral
- **Paper** (oklch(1 0 0)) — page background. Pure white.
- **Sheet** (oklch(0.98 0.003 250)) — input fills, ghost-button fills, subtle section backgrounds.
- **Sheet Raised** (oklch(0.955 0.005 250)) — hover states, open menus.
- **Hairline** (oklch(0.90 0.005 250)) — used sparingly now: table header rule, nav bottom edge, dropdown border. Most cards use shadow instead of hairline for their outer edge.
- **Ink** (oklch(0.18 0.012 250)) — primary text and every numeric value, ≥15:1 against Paper.
- **Muted** (oklch(0.50 0.012 250)) — secondary text, labels, meta lines. Clears 4.5:1 against Paper.

### Named Rules
**The One-Signal Rule.** BidSight Blue is the only color allowed to mean "act on this." Everything else is Ink or Muted.

**The Green Is Earned Rule.** Ledger Green only ever appears attached to a positive outcome.

**The Shadow-Over-Border Rule.** A surface gets *either* a soft shadow (cards, dropdowns, the round card) *or* a single hairline (table header rule, nav edge) — never both stacked on the same edge. This is what separates "refined" from the ghost-card look.

## 3. Typography

**Display/Body Font:** `-apple-system, BlinkMacSystemFont, 'SF Pro Display'/'SF Pro Text', Inter, sans-serif` — renders as actual San Francisco on Apple devices, Inter (visually close) everywhere else.
**Numeric Font:** JetBrains Mono.

**Character:** System font carries every label, heading, and sentence — exactly what macOS/iOS apps use, so it feels native rather than "designed to look like an app." JetBrains Mono still carries every number that matters: bids, scores, error %, table cells.

### Hierarchy
- **Display** (700, clamp(1.875rem, 3.5vw, 3rem), 1.1, -0.025em): Page-level headings.
- **Headline** (600, 1.3125rem, 1.25, -0.015em): Section headings.
- **Body** (400, 1rem, 1.55, -0.006em): Prose, instructions, form labels.
- **Label** (500, 0.8125rem, 1.3): Table headers, nav links, filter chips.
- **Numeric** (500, 1rem, 1.4, tabular-nums): Every bid/score/error value.
- **Numeric Large** (600, 2.75rem, 1, -0.02em): Reveal score, rolling average.

### Named Rules
**The Mono-For-Value Rule.** Any number the user compares, scans, or is judged on renders in JetBrains Mono with tabular-nums; every label stays in the system sans.

## 4. Elevation

No longer flat-by-default. BidSight now uses soft, single-source ambient shadows for anything that should read as "raised" — the round card, the history table, open dropdowns. Shadows are small and quiet (short blur, low opacity), never the wide diffuse glow of a marketing site.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px oklch(0.18 0.012 250 / 0.04), 0 4px 12px oklch(0.18 0.012 250 / 0.06)`): round card, history table, leaderboard/progress tables.
- **Raised** (`box-shadow: 0 4px 16px oklch(0.18 0.012 250 / 0.10)`): open multiselect dropdown, anything floating above page content.

### Named Rules
**The Shadow-Over-Border Rule** (see Colors) governs which surfaces use which. **The No-Wide-Glow Rule.** Blur stays ≤16px and opacity stays ≤0.10 — Apple's shadows are felt as a shift in the surface, never a spotlight.

## 5. Components

### Buttons
- **Shape:** 8px radius (`{rounded.sm}`). Full pill (`{rounded.pill}`) reserved for badges/tags.
- **Primary:** BidSight Blue background, white text, 11px/22px padding, 600 weight. Subtle scale (0.98) and shadow-lift on `:active` for tactile feedback.
- **Ghost:** Sheet background (not transparent), Ink text, no border — separated from the page by its own soft fill rather than an outline. Used for secondary actions.
- **Hover / Focus:** Primary hover deepens to Primary Deep; ghost hover lifts to Sheet Raised. Focus-visible gets a 2px BidSight Blue outline, offset 2px.

### Badges (score indicators)
- **High score / positive trend:** Ledger Green background, white text, pill radius.
- **Neutral / low score:** Sheet Raised background, Muted text.

### Tables (bid history)
- **Container:** 14px radius (`{rounded.md}`), Card shadow, no border — the shadow alone defines the edge.
- **Header row:** Label typography, Muted color, one hairline bottom rule (the exception to "no borders," since it separates header from body within the same shadowed container).
- **Body cells:** Numeric font for bid/vacancy values, generous 10px/14px cell padding (was 8px/10px) for the roomier feel. Row hover lifts to Sheet Raised.

### Inputs / Fields
- **Style:** Sheet background (not white-on-white), no border at rest, 8px radius.
- **Focus:** BidSight Blue 2px ring via `box-shadow`, background shifts to Paper.

### Navigation
- **Style:** Sticky top nav, translucent Paper background with `backdrop-filter: blur(20px)`, one hairline bottom edge. This is the one purposeful use of blur in the system — real sticky-nav material, not decoration. Active route gets Ink text + BidSight Blue underline.

### Sparkline (Progress page)
- **Signature component.** Thin (2.5px) Ink or Ledger Green line, rounded line-cap, subtle draw-in animation on mount, no fill/gradient/dots.

## 6. Do's and Don'ts

### Do:
- **Do** use soft single-source shadows (≤16px blur, ≤0.10 opacity) for cards, tables, and dropdowns instead of hairline borders.
- **Do** use the system font stack (`-apple-system` first) so the app feels native, with Inter as the fallback.
- **Do** give every interactive element a smooth ease-out transition (120–220ms) on hover/focus/active — motion should never be absent.
- **Do** render every bid, score, and error value in JetBrains Mono with tabular-nums.
- **Do** reserve Ledger Green exclusively for positive score/trend moments.
- **Do** use generous spacing (20–32px section gaps, 11-14px control padding) — this system trades density for calm.

### Don't:
- **Don't** use a cream, off-white, or warm-tinted background anywhere.
- **Don't** stack a hairline border AND a shadow on the same surface edge (the ghost-card pattern) — pick shadow for cards, hairline only for in-container dividers.
- **Don't** go back to zero-shadow, all-hairline severity — that read as a spreadsheet, not a refined app.
- **Don't** use `backdrop-filter` decoratively — it's reserved for the sticky nav only, a real material need, not an aesthetic flourish.
- **Don't** introduce a third saturated color beyond BidSight Blue and Ledger Green.
- **Don't** round buttons or containers past 14px — full-pill stays reserved for badges/tags only.
- **Don't** revert to the near-black terminal costume from two iterations ago.
