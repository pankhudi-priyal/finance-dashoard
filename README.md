# FinanceDash

A personal stock watchlist and portfolio dashboard with real-time quotes, price history charts, and dark mode.

**Live demo:** [your-demo-link-here](#)

---

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&labelColor=20232a)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&labelColor=1a1a2e)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white&labelColor=0f172a)
![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_DB-3ECF8E?logo=supabase&logoColor=white&labelColor=1c1c1c)
![Recharts](https://img.shields.io/badge/Recharts-3-22b5bf?logoColor=white&labelColor=1c1c1c)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-black?logo=framer&logoColor=white)

---

## Features

- **Live stock quotes** — real-time price, day change, high/low via Finnhub API
- **Watchlist** — add/remove symbols, persisted to Supabase with Row Level Security
- **Price history chart** — 30-day chart anchored to the real current price
- **Dark mode** — system preference detection + manual toggle, persisted to localStorage
- **Authentication** — email/password login via Supabase Auth with protected routes
- **Loading skeletons** — skeleton placeholders for all async states (no spinners)
- **Entrance animations** — Framer Motion animations on dashboard cards

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| Auth & DB | Supabase |
| Charts | Recharts |
| Animations | Framer Motion |
| Stock Data | Finnhub API |
| Routing | React Router v7 |

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/finance-dashboard.git
cd finance-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FINNHUB_API_KEY=your-finnhub-key
```

- **Supabase** — create a free project at [supabase.com](https://supabase.com), find credentials under *Project Settings → API*
- **Finnhub** — get a free API key at [finnhub.io](https://finnhub.io/register)

### 4. Set up the database

Run the following in your Supabase **SQL Editor**:

```sql
CREATE TABLE watchlist (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol     TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own" ON watchlist FOR DELETE USING (auth.uid() = user_id);
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Notes

- **Historical chart data** — Finnhub's candle endpoint is restricted on the free tier. Price history is simulated using a seeded random walk anchored to the real current price, so the chart endpoint and final price point are always accurate.
- **Rate limiting** — the Finnhub API wrapper includes a 1-minute in-memory cache to stay within free tier limits.
