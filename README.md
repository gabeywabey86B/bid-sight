# BidSight

BidSight is an SMU BOSS bidding training and forecasting project.

## Supabase Auth

The auth foundation lives in [`supabase/`](supabase/). It includes the profile
table migration, RLS policies, and setup notes for email/password sign-in.

----

BidSight: Feature Breakdown + Three Execution Plans
---
What is Training Mode?
You load a historical BOSS bidding round. The real outcome (what the minimum or median bid actually was) is hidden. You see:
Course code + section
Professor name
Class timing
Past trend (what did this same course cost last semester, 2 semesters ago?)
Number of spots available
You predict: Will the minimum bid go over e$25? (or whatever threshold). You click submit. The screen reveals the actual bid and tells you if you were right or wrong. Your accuracy gets recorded.
Example flow:
[HIDDEN OUTCOME MODE]
CS101-A, Dr. Smith, 8:15 AM, 40 spots
Last semester min: e$18.50, last year min: e$17.00
Your prediction: [Over e$25?] [YES] [NO]
(You click YES)
[REVEAL]
Actual minimum bid: e$22.40
You were WRONG. (-1 accuracy)
Your streak: 3 correct, 1 incorrect. Accuracy: 75%
[NEXT ROUND] [VIEW LEADERBOARD]
That's it. One screen. One interaction. One immediate feedback loop.
---
Features Ranked by Priority
Tier 1: Core (must have, makes the idea work)
Feature	What it does	Why it matters
Training Mode	Pick a historical round, hide outcome, predict over/under threshold, reveal + score	This IS the product. Everything else is supporting structure.
Dataset	~50-100 historical course sections with real min/median bid data	Training Mode has nothing to play without this.
Prediction scoring	Compare your prediction against the real bid, mark right/wrong, track accuracy	Feedback is the entire mechanism. No feedback = no skill building.
Tier 2: Engagement (significantly better UX, necessary for a real product, optional for a tight demo)
Feature	What it does	Why it matters
Running accuracy tracker	Shows you "3/4 correct, 75% accuracy" as you play	Lets you see your improvement in real time. Addictive.
Accounts + sign-in (Supabase Auth)	You log in, your predictions persist across sessions	Without this, every time you reload the page your score resets. Kills replay value.
Leaderboard	Global ranking by accuracy, plus your personal stats over time	Creates a reason to come back. Small friction to build habit.
Streak counter	"X predictions in a row correct"	Psychological hook. People chase streaks.
Tier 3: Nice-to-have (polish, cut if time pressure)
Feature	What it does	Why it matters
Accuracy by course category	You can see "I'm 80% accurate on CS, 60% on humanities"	Helps you understand where your intuition is sharp and where it's soft.
AI coach (optional)	Simple explanation: "This went high because morning classes are always expensive"	Makes you learn why, not just that. Anthropic API call, treat as optional.
Difficulty selector	Easy = use median bid, Hard = use minimum bid	Lets you pick your skill level. Nice but not necessary.
Tier 4: Vision only (do NOT build for HEAP)
Feature	What it does	Why it matters	Status
Live Round Mode	Real upcoming BOSS round opens, live predictions, crowd consensus	The full product idea.	Vision slide only. Not built.
Anonymous data collection	Users submit grades, internship placements, LOA, exchange info	Broadens the platform.	Cut entirely. No ground truth, no enforcement.
---
Three Execution Plans: Pick One Based on Your Deadline
How to pick:
If you have 3+ weeks: Plan A
If you have 2 weeks: Plan B
If you have 1 week or less, or you're doing this solo: Plan C
---
Plan A: Ambitious (3+ weeks, team of 2+)
What ships:
Training Mode (100% done, polished)
Accounts + sign-in (Supabase Auth)
Global + personal leaderboard (accuracy ranking, your stats)
Streak counter + accuracy tracker
Accuracy breakdown by course category (optional, cut if tight)
Optional: simple AI coach explaining why a bid went high
Polish: animations on reveal, smooth transitions, mobile-responsive
Tech stack:
Frontend: React + Vite (Tailwind for styling)
Backend: Supabase (Auth, Postgres for predictions + leaderboard)
Hosting: Vercel (frontend), Supabase (backend)
Data: 100-150 curated historical rounds (JSON, then loaded into Supabase)
Demo narrative:
Judge logs in, plays 3 rounds live, sees their name pop on the leaderboard, realizes they're 33% accurate. "Oh, this is harder than I thought." Boom. Then show the global leaderboard with your test predictions already on it (make it look active). Close with: "Imagine this at scale—every student in SMU training before their first bid."
Scope commitment:
Everything in Tier 1 + Tier 2. Cut all of Tier 3 except the AI coach if you want it.
Build order:
Data curation (done before code)
Database schema design (users, predictions, leaderboard queries)
Frontend: Training Mode UI
Supabase setup: Auth, RLS, prediction storage
Leaderboard queries + frontend
Polish + test on a real judge
---
Plan B: Realistic (2 weeks, team of 1-2)
What ships:
Training Mode (100% done, polished)
Accounts + sign-in (Supabase Auth, keep it simple)
Personal accuracy history (you see your own past predictions + accuracy)
Global leaderboard (top 10 all-time, you see where you rank)
Streak counter + running accuracy
No AI coach, no category breakdown, no fancy animations
Tech stack:
Frontend: React + Vite (Tailwind)
Backend: Supabase (Auth, Postgres)
Hosting: Vercel + Supabase
Data: 50-75 curated historical rounds
Demo narrative:
Same as Plan A, but simpler. Judge logs in, plays 3-4 rounds, you show their accuracy and their spot on the leaderboard. "Each round teaches you to read demand better. Next semester, students use this before bidding, not after."
Scope commitment:
Everything in Tier 1 + Tier 2. Cut Tier 3 entirely.
Build order:
Data curation
Database schema (simpler than Plan A: users, predictions, leaderboard)
Frontend: Training Mode
Supabase Auth + prediction storage
Leaderboard (just a simple sorted table)
Test + ship
---
Plan C: Minimum Viable (1 week, solo, highest risk)
What ships:
Training Mode only
No accounts, no backend
Static JSON dataset (just one .json file in the React app)
Running score + accuracy tracker in browser local state
Score resets on page reload (but judge won't reload during demo)
Tech stack:
Frontend: React + Vite (Tailwind)
Data: One JSON file with 20-30 rounds, shipped in the repo
Hosting: Vercel (no backend needed)
Demo narrative:
"Here's Training Mode. You pick a round, make a prediction, get immediate feedback. One of our teammates played 30 rounds yesterday; they went from 45% to 68% accuracy." You play one live round very confidently and nail it. Then pull up a screenshot of the leaderboard mockup (not real, just Figma) and say, "This is the full product with accounts."
The mockup buys you credibility for the second half. You do not need a real backend to pitch a leaderboard.
Scope commitment:
Tier 1 only, plus a Figma mockup of leaderboard + AI coach (those are vision).
Build order:
Data curation (20-30 rounds in JSON)
Frontend: Training Mode UI
Local state for score tracking
Ship to Vercel
Create leaderboard mockup in Figma (1 hour, it sells)
---
Feature comparison table
Feature	Plan A	Plan B	Plan C
Training Mode	✅ Full	✅ Full	✅ Full
Accounts + sign-in	✅ Real	✅ Real	❌ Mockup
Global leaderboard	✅ Real	✅ Real (top 10)	❌ Mockup
Personal stats	✅ Detailed	✅ Basic	❌ None
Streak counter	✅	✅	✅
AI coach	✅ Optional	❌	❌ Mockup
Accuracy by category	✅ Optional	❌	❌
Time to build	3-4 weeks	2 weeks	5-7 days
Risk level	Medium	Low	Low (but talks to a mockup)
Judge reaction	"Wow, this is a real product"	"This is solid, I'd use it"	"The demo is tight, the mockup shows the full vision"
---
If you're torn between B and C
Pick Plan B if:
You have any teammates helping
You have a real deadline further out than 1 week
You want the leaderboard to be real (judges notice, it looks 10x more impressive)
You're willing to spend 3-4 days on Supabase setup
Pick Plan C if:
You're doing this solo
Your deadline is 5-7 days
You're confident in your pitch (the mockup has to be really good)
You have a strong video or screenshot of a real leaderboard from a teammates' local machine
---
The stuff you do no matter what (before any plan starts)
Data curation (1-2 days). Grab the BOSS dataset, clean it, structure it as JSON. You cannot start coding without this.
10 validation interviews (done in parallel, 1-2 days of outreach). This gates go/no-go. Do not skip.
Design the prediction target (1 day). Decide: are you predicting over/under minimum bid, or median? What thresholds make sense per course? This has to be decided before you write the Training Mode UI.
---
My recommendation
Go with Plan B.
Why:
You get a real, demoable product with accounts and leaderboard (Tier 2 stuff is what makes judges think "oh, this is a real company")
Supabase is simple enough that 3-4 days is realistic for setup + integration
You have a safety net: if you run out of time, drop the accuracy-by-category breakdown and ship with what you have
If you're in a team, this is very doable in 2 weeks with deliberate work
Plan A is greedy (you probably will not finish the AI coach) and Plan C is risky (a mockup can feel like BS if it's not exceptionally well-designed).
---
Next steps
Confirm your HEAP deadline and team size (solo? 2? 3?)
Pick your plan (A/B/C)
I will write a dated sprint plan (Day 1-2: data + interviews, Day 3-4: schema + setup, etc.)
We start building
What's your deadline and team size?