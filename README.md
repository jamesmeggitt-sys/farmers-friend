# 🏚️ Who's Been In My Shed?! — Phase 1 Setup Guide

A production-ready farm equipment traceability SaaS built with React + Supabase.

---

## What's In Phase 1

- ✅ Secure login — each farm has isolated data (Row Level Security)
- ✅ Cloud sync — real-time across all devices on the farm
- ✅ Checkout & check-in with live camera + timestamp burned into photos
- ✅ Photos uploaded to Supabase Storage (per farm, private)
- ✅ Equipment catalogue per farm (seeded on signup)
- ✅ Multi-employee support — select who's taking what
- ✅ Overdue alerts — visual indicators when items are past due
- ✅ Dashboard with live stats + activity feed
- ✅ Full shed log with search, filter, pagination, CSV export
- ✅ Real-time updates — if someone else checks something out, your screen updates live

---

## Step 1 — Supabase Setup (10 minutes)

### 1.1 Create a free Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**
3. Name it `whos-been-in-my-shed`
4. Choose a strong database password (save it!)
5. Region: **ap-southeast-2** (Sydney — closest to AU farmers)
6. Wait ~2 minutes for it to provision

### 1.2 Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Open the file `src/lib/supabase.js` in this project
3. Copy everything inside the `SETUP_SQL` template literal (the big SQL block)
4. Paste it into the SQL editor and click **Run**

You should see all tables created with no errors.

### 1.3 Create the photo storage bucket

1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `shed-photos`
4. **Uncheck** "Public bucket" — photos are private per farm
5. Click **Save**

Then add a storage policy:
1. Click the `shed-photos` bucket → **Policies** → **New policy**
2. Choose **For full customization**
3. Policy name: `Farm members can manage their photos`
4. Operation: SELECT, INSERT, UPDATE, DELETE
5. Policy definition:
```sql
(bucket_id = 'shed-photos') AND 
(auth.uid() IN (
  SELECT user_id FROM farm_members 
  WHERE farm_id = (storage.foldername(name))[1]::uuid
))
```
6. Click **Review** then **Save**

### 1.4 Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy **Project URL** (looks like `https://abcdefgh.supabase.co`)
3. Copy **anon / public** key (long string starting with `eyJ...`)

---

## Step 2 — Local Development

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local

# Edit .env.local and paste your Supabase URL and anon key
# VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...

# Start dev server
npm run dev
```

Open http://localhost:5173 — you'll see the login screen.

**First time:** Click **New Farm**, fill in your farm name and your name, sign up. 
This creates your farm, your user account, and seeds a default equipment catalogue.

---

## Step 3 — Deploy to Production (Vercel — free)

```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
vercel

# When prompted:
# - Link to existing project? No
# - Project name: whos-been-in-my-shed
# - Framework: Vite
# - Build command: npm run build
# - Output dir: dist
```

Then in the Vercel dashboard:
1. Go to your project → **Settings → Environment Variables**
2. Add `VITE_SUPABASE_URL` = your Supabase URL
3. Add `VITE_SUPABASE_ANON_KEY` = your anon key
4. Redeploy: `vercel --prod`

Your app will be live at `https://whos-been-in-my-shed.vercel.app` (or your custom domain).

---

## Step 4 — Adding Team Members

Currently team members need to:
1. Sign up at your app URL
2. You then add them to your farm via the Supabase dashboard:
   - Go to **Table Editor → farm_members**
   - Insert a row with their `user_id`, your `farm_id`, their display name, and role

> **Phase 2** will add a proper invite-by-email flow via Supabase Edge Functions.

---

## Custom Domain (Optional)

1. Buy a domain — try `shedsync.com.au` or `farmshed.app` (~$20/yr)
2. In Vercel dashboard → **Settings → Domains** → add your domain
3. Follow the DNS instructions

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | React + Vite | Free |
| Backend / DB | Supabase | Free up to 500MB |
| Photo Storage | Supabase Storage | Free up to 1GB |
| Hosting | Vercel | Free |
| Total at launch | | **$0/month** |

At 100 farms paying $29/month = **$2,900 MRR** before infrastructure costs even matter.
Supabase Pro ($25/mo) handles ~10,000 farms. Vercel Pro ($20/mo) handles any traffic.

---

## Phase 2 Roadmap (Next Build)

- [ ] Email invite flow for team members
- [ ] Stripe billing integration (free/pro/enterprise tiers)
- [ ] Multi-farm support (one account, multiple properties)
- [ ] Overdue email/SMS alerts via Resend
- [ ] PDF compliance report export (the killer feature for insurance/WorkSafe audits)
- [ ] Equipment QR codes — print and stick to equipment for instant scan checkout
- [ ] Custom equipment catalogue management UI

---

## File Structure

```
src/
├── lib/
│   ├── supabase.js        # Supabase client + schema SQL
│   ├── AuthContext.jsx    # Auth state, farm context, sign up/in/out
│   └── ToastContext.jsx   # Toast notifications
├── components/
│   ├── AppHeader.jsx      # Header, nav tabs, clock, user menu
│   └── CameraCapture.jsx  # Camera, photo capture, Supabase upload
├── pages/
│   ├── AuthPage.jsx       # Login / signup
│   ├── CheckoutPage.jsx   # Check out items
│   ├── CheckinPage.jsx    # Return items (real-time list)
│   ├── LogPage.jsx        # Full searchable log + detail modal
│   └── DashboardPage.jsx  # Stats, currently-out, team activity
├── App.jsx                # Root with tab routing
├── main.jsx               # Entry point
└── index.css              # Global styles (all design tokens here)
```
