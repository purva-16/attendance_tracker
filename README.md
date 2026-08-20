# Attendance Ledger

A tiny attendance tracker. Log each class as present/absent per course and
it works out:
- current attendance %
- how many more classes can be missed and stay ≥ 80% (editable threshold)
- how many classes must be attended in a row to climb back to 80%

The site sits behind a styled login page (username + password, checked
server-side, session kept in a cookie) so it isn't public. Built
mobile-first.

## Deploy on Vercel (5 minutes)

1. Push this folder to a **new GitHub repo** (can be private).
   ```bash
   cd attendance-tracker
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin <your-empty-repo-url>
   git push -u origin main
   ```
2. Go to https://vercel.com/new, import that repo. Framework preset
   "Next.js" is auto-detected — leave build settings as-is.
3. Before the first deploy (or right after, then redeploy), go to
   **Project → Settings → Environment Variables** and add:
   - `APP_USERNAME` — whatever username you want her to type
   - `APP_PASSWORD` — the real password (pick something only she knows)

   Do **not** put these in the code or in `.env.local` if that file ever
   gets committed — keep the real values only in Vercel's dashboard.
4. Deploy. Visiting the site shows a styled "Sign In" page asking for that
   username/password before anything loads. A "Sign out" link sits top
   right of the ledger once logged in.

## Add free cloud storage (so data survives losing the browser/device)

Without this step, data is saved only in `localStorage` on whichever
browser she's using — fine day-to-day, but wiped if she clears browser
data, switches phones, or reinstalls. Attaching a free Redis store fixes
that, and the app will say "☁ Synced" at the bottom once it's live.

1. In the Vercel dashboard, open your project → **Storage** tab.
2. **Create Database → Redis** (via the "Upstash" option in Vercel
   Marketplace) → pick the free tier → **Connect** it to this project.
   Vercel automatically adds two environment variables for you —
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — nothing to
   type in by hand.
3. Redeploy (Vercel usually does this automatically after connecting
   storage; if not, trigger one from the Deployments tab).
4. That's it. The app checks for those two variables on load — if present,
   every course/mark is read from and written to Redis instead of just the
   browser, so it's the same data on her phone, her laptop, anywhere she
   logs in.

For local testing with the same cloud data, copy those two variable names
and values from Vercel (Project → Settings → Environment Variables) into
your local `.env.local`.

## How marking and editing work

- Each lecture type (Theory/Tutorial/Practicum) has its own **date picker**
  next to the Present/Absent buttons — defaults to today, but she can set
  it to yesterday or any past date to backdate a class she forgot to log.
  It won't let her pick a future date.
- Every logged entry shows as a small date chip with an **×** to delete
  it — click that to remove a specific mistaken entry (not just the most
  recent one). Deleting adjusts the attended/total counts automatically.
- Only the last 12 entries per lecture type are kept as editable chips (to
  keep things lightweight). Older history still counts toward the total —
  if it ever needs correcting, use "Correct the count" under that lecture
  type to set the attended/total numbers directly.
- The "Required %" field (top of the page) defaults to 80 but is editable
  in case a course has a different rule.

## Local dev

```bash
npm install
npm run dev
```
