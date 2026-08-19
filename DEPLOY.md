# HC Platform — Vercel Deployment Guide

## What you need
- A [Vercel](https://vercel.com) account (free)
- A [GitHub](https://github.com) account (free)
- 10 minutes

---

## Step 1 — Push to GitHub

1. Create a new **private** repository on GitHub (call it `hc-platform`)
2. On your machine, open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/hc-platform.git
git push -u origin main
```

---

## Step 2 — Create Vercel project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `hc-platform` GitHub repository
3. Framework preset: **Next.js** (should auto-detect)
4. Click **Deploy** — it will fail (no DB yet), that's fine

---

## Step 3 — Add Vercel Postgres

1. In your Vercel project, go to **Storage** tab
2. Click **Create Database** → **Postgres**
3. Name it `hc-platform-db`, select the region closest to you
4. Click **Connect** — this auto-adds the `POSTGRES_*` env vars to your project

---

## Step 4 — Initialise the database

1. Go to **Settings → Environment Variables** in Vercel
2. Confirm you see `POSTGRES_URL` and related vars (added automatically)
3. Go to your project's **Deployments** tab → click **Redeploy** on the latest deployment
4. Once live, visit: `https://your-app.vercel.app/api/settings`
   - This call auto-creates all tables on first load and generates a random passcode
   - You'll see your passcode in the response — copy it

---

## Step 5 — First login

1. Visit your Vercel URL (e.g. `https://hc-platform-abc.vercel.app`)
2. Enter the passcode from Step 4
3. Go to **Settings** to change the passcode to something memorable
4. Add your Google Calendar ICS URL in Settings → Calendar

---

## Custom domain (optional)

In Vercel → Settings → Domains, add `platform.heeneycapital.com` and follow the DNS instructions. Takes ~5 minutes.

---

## Branding

All colours, fonts, and radii are CSS custom properties in `app/globals.css` under `:root`.
Change `--brand-primary` and `--brand-accent` to rebrand the entire platform instantly.

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in POSTGRES_* values from Vercel dashboard → Storage → your DB → .env.local tab
npm run dev
# Open http://localhost:3000
```
