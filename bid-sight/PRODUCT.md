# Product

## Register

product

## Users

SMU students who are about to bid for BOSS modules and want to walk in with a
sharper sense of what a section's median or minimum winning bid will be.
They're using Training Mode to build intuition against real historical data
before real credits (their actual bidding budget) are on the line. Sessions
are likely short and repeated — a handful of guesses at a time, often in the
run-up to an actual bidding round — not long browsing sessions.

## Product Purpose

BidSight turns SMU's historical BOSS bidding data into a skill-training game.
Users are shown a real (anonymized-of-outcome) section and guess its median
or minimum bid; the score reflects how close they got. The goal is that
repeated training produces measurably better real bidding decisions — smaller
winning bids, less wasted credit. A secondary Live Mode lets users predict
upcoming real rounds and see crowd consensus after results are published.

Success looks like: users' rolling average score improving over sessions,
and (eventually, per BUILD_NOTES.md's open pitch item) evidence that trained
users bid more efficiently in real BOSS rounds.

## Brand Personality

Sharp, precise, competitive. This should feel closer to a trading terminal
or a skill-testing tool than a course-registration helper — exact numbers,
dense real data, a scoreboard/leaderboard energy that rewards getting closer
to the true number. Not playful or gamified-cute; not soft or academic-quiet.
Confidence comes from precision (two-decimal bids, visible error %, visible
score) not from decoration.

## Anti-references

Explicitly not a generic SaaS dashboard: no cream/near-white body background,
no uniform rounded card grids, no soft ghost-card shadows, no tiny uppercase
eyebrows over every section. BidSight's content (course sections, bid
history, scores) is the substance; the UI should get out of its way rather
than dress it up with template SaaS chrome.

## Design Principles

- **Numbers are the interface.** Bids, errors, and scores are the product —
  typography and layout should make exact values easy to scan and compare,
  not bury them in decoration.
- **Reward precision, visually.** A near-perfect guess should *feel*
  different from a mediocre one (color, weight, motion) — the scoring
  moment is the emotional payoff of the whole loop.
- **Dense but not cluttered.** Real historical data (tables, filters) is a
  feature, not a liability — organize it so it's scannable, don't hide it
  behind vague summaries.
- **Respect repeat, short sessions.** Users come back for a handful of
  guesses, often stressed and time-pressured before a real bidding round —
  minimize friction between "load a section" and "get your score."
- **Show the trend, not just the moment.** Progress (rolling average score)
  is as central to the pitch as any single prediction — make improvement
  visible.

## Accessibility & Inclusion

Standard WCAG AA: body text ≥4.5:1 contrast, large/bold text ≥3:1,
keyboard-navigable interactive elements (including the filter dropdowns and
sort controls), and all motion/animation must respect
`prefers-reduced-motion`.
