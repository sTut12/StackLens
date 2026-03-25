# StackLens 🔍
### AI-Powered Website Reverse Engineer
> **HackIndia Spark 4 · 2026 · Team Delvrixo Syndicate**  
> Team Leader: Nitin Raj · ID: HI002972

---

## What is StackLens?

**Paste any URL. StackLens tells you exactly how it was built — in under 60 seconds.**

StackLens is an AI-powered developer tool that reverse-engineers any website and reveals:
- ✅ Full **Tech Stack** (framework, CDN, analytics, auth, payments — 1500+ signatures)
- ✅ **Component Tree** (Navbar → Hero → Features → Footer structure)
- ✅ **AI-Generated Code Skeleton** (folder structure + install commands)
- ✅ **Architectural Explanation** (WHY those tech choices were made)
- ✅ **Performance Snapshot** (load time, page size, HTTPS, compression)
- ✅ **UI Component Detection** (buttons, modals, carousels, pricing tables)

---

## Problem Statement

Developers waste hours manually inspecting websites to understand how they're built — opening DevTools, reading minified source code, guessing frameworks, checking HTTP headers one by one.

**Existing tools (Wappalyzer, BuiltWith) only detect ~30% of the stack and give you a list of logos. They don't explain architecture, generate code, or use AI.**

StackLens solves this entirely — one URL, full breakdown, AI explanation, in 60 seconds.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Authentication | Firebase Auth (email/password + reset) |
| Backend | FastAPI (Python) |
| Web Scraper | Playwright (headless Chromium) |
| AI Engine | Ollama · Mistral 7B (runs fully locally) |
| Database/Cache | Firebase Firestore |
| Styling | Light Industrial / Neobrutalist UI |

---

## The 4-Layer Intelligence Engine

This is the core technical differentiator. We **always** return results — never a blank screen.

```
Layer 1 — Playwright (JS Render)
  ├── Headless Chromium fully renders the page
  ├── Catches React, Next.js, Vue, Angular perfectly
  └── Best accuracy — used whenever possible

Layer 2 — Requests + BeautifulSoup (HTML Scrape)
  ├── Direct HTTP request + HTML parsing
  ├── Fallback if Playwright is blocked
  └── Works on static sites, WordPress, CMS

Layer 3 — HTTP Headers Only
  ├── Reads response headers without loading the page
  ├── Detects CDN (Cloudflare, Fastly), hosting, server
  └── Works even if scraping is fully blocked

Layer 4 — Ollama AI Inference (Mistral 7B)
  ├── Local AI makes educated guess from domain + context
  ├── Final fallback — guarantees a result every time
  └── 100% offline, no API costs, no data leaks
```

---

## Project Structure

```
stacklens/
├── frontend/                    # Next.js App
│   ├── app/
│   │   ├── page.tsx             # Landing page + inline auth
│   │   ├── dashboard/           # Search tool (auth-guarded)
│   │   ├── analyze/[id]/        # Results page
│   │   ├── history/             # Analysis history
│   │   ├── login/               # Standalone login
│   │   ├── signup/              # Standalone signup
│   │   └── forgot-password/     # Password reset
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthCard.tsx     # Shared auth card UI
│   │   │   └── AuthGuard.tsx    # Route protection
│   │   └── tabs/                # Result tab components
│   ├── lib/
│   │   ├── firebase.ts          # Firebase init
│   │   ├── auth-context.tsx     # Global auth state
│   │   └── api.ts               # Backend API calls
│   └── .env.local               # Firebase keys (fill this in)
│
├── backend/                     # FastAPI Server
│   ├── main.py                  # API routes
│   ├── scraper/engine.py        # 4-layer scraping engine
│   ├── ai/engine.py             # Ollama integration
│   ├── db/firebase.py           # Firestore cache + history
│   ├── utils/precache.py        # Pre-cache demo sites
│   └── .env                     # Backend config
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- Python 3.10+
- [Ollama](https://ollama.ai) installed
- Firebase project created

### Step 1 — Pull the AI Model (one time, ~4GB)
```bash
ollama pull mistral:7b
```

### Step 2 — Backend Setup
```bash
cd stacklens/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium
```

### Step 3 — Frontend Setup
```bash
cd stacklens/frontend
npm install
```

### Step 4 — Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project → Enable **Authentication** → **Email/Password**
3. Enable **Firestore Database**
4. Project Settings → Your Apps → Web App → Copy config
5. Fill in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

## Running the App — Every Session

### Terminal 1 — Ollama
```bash
ollama serve
```

### Terminal 2 — Backend
```bash
cd stacklens/backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
Verify → `http://localhost:8000` must show `{"ollama": true}`

### Terminal 3 — Frontend
```bash
cd stacklens/frontend
npm run dev
```
Opens at → `http://localhost:3000`

### Terminal 4 — Pre-cache (run once before demo)
```bash
cd stacklens/backend
python utils/precache.py
```
Pre-caches: stripe.com · vercel.com · linear.app · notion.so · github.com

---

## API Reference

### Analyze a URL
```http
POST http://localhost:8000/api/analyze
Content-Type: application/json

{ "url": "https://stripe.com" }
```

### Get History
```http
GET http://localhost:8000/api/history
```

### Health Check
```http
GET http://localhost:8000/health
```

---

## App Flow

```
/ (Landing)
  ├── Not logged in → Auth Modal (real Firebase)
  └── Logged in    → URL input → Analyze

/dashboard → search tool → /analyze/[url] → results

/analyze/[url]
  ├── Calls backend
  ├── Animated loading (4 steps)
  └── Shows: Stack | AI Explanation | Skeleton | Performance | Structure Map

/history    → all past analyses (Firestore)
/login      → Firebase email/password
/signup     → Firebase create account
/forgot-password → Firebase reset email
```

---

## Demo Script (90 seconds)

1. Open `http://localhost:3000`
2. Click **Get Started** → sign in or create account
3. Type `stripe.com` → click **Analyze**
4. Walk through results:
   - **Tech Stack** → "Detected Next.js, React, Tailwind..."
   - **AI Explanation** → "Mistral 7B explains WHY Stripe chose these technologies..."
   - **Code Skeleton** → "Ready-to-use folder structure you can clone..."
   - **Performance** → "Load time 820ms, 245KB payload, Fast rating..."
5. Click **New Scan** → try `vercel.com`

---

## Judge Q&A

| Question | Answer |
|---|---|
| Different from Wappalyzer? | Full headless render, 4 fallback layers, AI explanations, code generation |
| Site blocks scraping? | 4-layer fallback — Layer 4 is local AI inference, always returns something |
| Why Ollama not OpenAI? | Zero cost, zero data leaks, works offline |
| Is it working now? | Yes — live demo, give me any URL |
| Business model? | SaaS free tier + paid API. BuiltWith Pro = $295/month. We do more |

---

## Pre-Cached Sites (Instant Demo)

stripe.com · vercel.com · linear.app · notion.so · github.com · tailwindcss.com

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `"ollama": false` in health check | Run `ollama serve` |
| Backend won't start | Activate venv first |
| Playwright fails | Run `playwright install chromium` |
| Firebase auth errors | Check `.env.local` keys + enable Email/Password in Firebase Console |
| Analysis too slow | Run `python utils/precache.py` first |

---

## Team

**Team Name:** Delvrixo Syndicate  
**Team Leader:** Nitin Raj  
**Team ID:** HI002972  
**Event:** HackIndia Spark 4 · 2026  
**Category:** Open Innovation  

---

*Built with ❤️ in 36 hours at HackIndia Spark 4*
