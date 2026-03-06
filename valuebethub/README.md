# ValueBetHub — Deployment Guide

## What You Have
- A complete React app with AI-powered bet slip generator
- A Netlify serverless function that fetches real match data from API-Football
- Smart caching so you don't burn through API requests

## Step-by-Step Deployment

### 1. Create a GitHub Account (if you don't have one)
- Go to https://github.com
- Sign up for free
- Verify your email

### 2. Create a New Repository
- Click the **+** icon (top right) → **New repository**
- Name it: `valuebethub`
- Keep it **Public** (free hosting)
- Click **Create repository**

### 3. Upload Project Files
- On the new repo page, click **"uploading an existing file"**
- Drag ALL the project files and folders into the upload area:
  - `package.json`
  - `vite.config.js`
  - `netlify.toml`
  - `index.html`
  - `src/` folder (with main.jsx, App.jsx, api.js)
  - `netlify/` folder (with functions/get-data.mjs)
- Click **Commit changes**

### 4. Connect GitHub to Netlify
- Go to https://app.netlify.com
- Click **"Add new site"** → **"Import an existing project"**
- Click **GitHub** and authorize Netlify
- Select your `valuebethub` repository
- Netlify will auto-detect the build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`
- Click **Deploy site**

### 5. Set Your API Key (IMPORTANT!)
- In Netlify, go to **Site settings** → **Environment variables**
- Click **Add a variable**
- Key: `API_FOOTBALL_KEY`
- Value: `[your API-Football key]`
- Click **Save**
- Go to **Deploys** → **Trigger deploy** → **Deploy site** (to rebuild with the key)

### 6. Connect Your Domain
- In Netlify, go to **Domain management** → **Add custom domain**
- Enter: `valuebethub.com`
- Netlify will give you nameserver addresses
- Go to your domain registrar (where you bought valuebethub.com)
- Update the nameservers to Netlify's addresses
- Wait 10-30 minutes for DNS to propagate
- Netlify automatically sets up HTTPS (free SSL)

### 7. Regenerate Your API Key
- Since your original API key was shared in chat, go to your API-Football dashboard
- Generate a new key
- Update it in Netlify's environment variables
- Trigger a new deploy

## How It Works

```
User visits ValueBetHub.com
        ↓
    React app loads
        ↓
    Calls /api/get-data (Netlify function)
        ↓
    Function checks cache (6-hour TTL)
        ↓
    If stale: fetches from API-Football
    - Today's fixtures
    - Predictions (form, H2H, stats)
    - Bookmaker odds
    - Injuries
        ↓
    Returns combined data to app
        ↓
    User generates smart bet slip
```

## API Request Budget (Free Tier: 100/day)
- 1 request: Fetch today's fixtures
- 1 request per fixture: Predictions (includes form + H2H)
- 1 request per fixture: Injuries
- 1 request per fixture: Odds
- ~15 fixtures × 3 = 45 requests + 1 = 46 requests per refresh
- With 6-hour cache: max 4 refreshes/day = ~184 requests

⚠️ This is above the free 100/day limit! Options:
- Limit to 8-10 fixtures per refresh (stays under 100)
- Or upgrade to the €20/month plan (7,500 requests/day)
- The function already limits to 15 fixtures max

## Future Upgrades
- Upgrade API plan for more requests
- Add more leagues and fixtures
- Add premium tier with Firebase auth
- Add Google AdSense
- Add affiliate links to bookmakers
- Add bet tracking and history

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Netlify Functions (serverless)
- **API**: API-Football (via api-sports.io)
- **Hosting**: Netlify (free tier)
- **Domain**: ValueBetHub.com
