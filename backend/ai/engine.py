import os, json
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
MODEL = os.getenv("OLLAMA_MODEL", "mistral:7b")

def available() -> bool:
    try:
        import ollama
        ollama.Client(host=HOST).list()
        return True
    except:
        return False

def _call(prompt: str, max_tokens: int = 700) -> Optional[str]:
    try:
        import ollama
        r = ollama.Client(host=HOST).chat(
            model=MODEL,
            messages=[{"role":"user","content":prompt}],
            options={"num_predict": max_tokens, "temperature": 0.3}
        )
        return r["message"]["content"]
    except Exception as e:
        print(f"⚠️  Ollama: {e}")
        return None


# ── Well-known site knowledge base (instant answers, no AI needed) ──────────
KNOWN_STACKS: dict[str, dict] = {
    "stripe.com":        {"framework":"Next.js","styling":"Tailwind CSS","hosting":"AWS","cdn":"Cloudflare","analytics":"Segment","auth":"Custom","payments":"Stripe","language":"TypeScript"},
    "vercel.com":        {"framework":"Next.js","styling":"CSS Modules","hosting":"Vercel","cdn":"Vercel Edge","analytics":"Vercel Analytics","language":"TypeScript"},
    "linear.app":        {"framework":"React","styling":"Stitches","hosting":"AWS","cdn":"Cloudflare","database":"PostgreSQL","language":"TypeScript"},
    "notion.so":         {"framework":"React","styling":"CSS-in-JS","hosting":"AWS","cdn":"Cloudflare","database":"PostgreSQL","language":"TypeScript"},
    "github.com":        {"framework":"React","styling":"Primer CSS","hosting":"GitHub (Azure)","cdn":"Fastly","language":"TypeScript","auth":"GitHub OAuth"},
    "tailwindcss.com":   {"framework":"Next.js","styling":"Tailwind CSS","hosting":"Vercel","cdn":"Vercel Edge","language":"TypeScript"},
    "nextjs.org":        {"framework":"Next.js","styling":"Tailwind CSS","hosting":"Vercel","language":"TypeScript"},
    "supabase.com":      {"framework":"Next.js","styling":"Tailwind CSS","hosting":"Fly.io","database":"Supabase","language":"TypeScript"},
    "figma.com":         {"framework":"React","styling":"CSS Modules","hosting":"AWS","cdn":"Cloudflare","language":"TypeScript"},
    "shopify.com":       {"framework":"React","styling":"Polaris","hosting":"Shopify Cloud","cdn":"Fastly","payments":"Shopify Payments","language":"TypeScript"},
    "airbnb.com":        {"framework":"React","styling":"CSS-in-JS","hosting":"AWS","cdn":"CloudFront","analytics":"Google Analytics","language":"JavaScript"},
    "netlify.com":       {"framework":"React","styling":"Styled Components","hosting":"Netlify","cdn":"Netlify Edge","language":"TypeScript"},
    "discord.com":       {"framework":"React","styling":"CSS Modules","hosting":"GCP","cdn":"Cloudflare","language":"TypeScript"},
    "twitch.tv":         {"framework":"React","styling":"Styled Components","hosting":"AWS","cdn":"Akamai","language":"TypeScript"},
    "trello.com":        {"framework":"React","styling":"CSS Modules","hosting":"AWS","cdn":"Cloudflare","language":"TypeScript"},
    "atlassian.com":     {"framework":"React","styling":"Atlaskit","hosting":"AWS","cdn":"Cloudflare","language":"TypeScript"},
    "dropbox.com":       {"framework":"React","styling":"CSS Modules","hosting":"AWS","cdn":"Akamai","language":"TypeScript"},
    "salesforce.com":    {"framework":"LWC","styling":"SLDS","hosting":"Salesforce Cloud","cdn":"Akamai","language":"JavaScript"},
    "hubspot.com":       {"framework":"React","styling":"CSS Modules","hosting":"AWS","cdn":"Cloudflare","analytics":"HubSpot","language":"JavaScript"},
    "intercom.com":      {"framework":"Ember.js","styling":"Tailwind CSS","hosting":"AWS","cdn":"Cloudflare","language":"TypeScript"},
    "zendesk.com":       {"framework":"React","styling":"Garden","hosting":"AWS","cdn":"Cloudflare","language":"TypeScript"},
    "tryhackme.com":     {"framework":"React","styling":"Tailwind CSS","hosting":"AWS","cdn":"Cloudflare","auth":"JWT","language":"TypeScript"},
    "hackthebox.com":    {"framework":"Vue.js","styling":"Tailwind CSS","hosting":"AWS","cdn":"Cloudflare","language":"TypeScript"},
    "medium.com":        {"framework":"React","styling":"CSS-in-JS","hosting":"AWS","cdn":"Fastly","analytics":"Google Analytics","language":"TypeScript"},
    "substack.com":      {"framework":"React","styling":"Tailwind CSS","hosting":"AWS","cdn":"Cloudflare","payments":"Stripe","language":"TypeScript"},
    "telegram.org":      {"framework":"React","styling":"CSS Modules","hosting":"Telegram Cloud","cdn":"Cloudflare","language":"TypeScript"},
    "whatsapp.com":      {"framework":"React","styling":"Styled Components","hosting":"Meta Cloud","cdn":"Meta CDN","language":"TypeScript"},
}

def _get_known_stack(domain: str) -> Optional[dict]:
    """Return pre-known stack for popular sites."""
    # Try exact match, then subdomain strip
    domain = domain.lower().replace("www.", "")
    if domain in KNOWN_STACKS:
        return KNOWN_STACKS[domain]
    # Try partial match (e.g. "app.stripe.com" → "stripe.com")
    for key in KNOWN_STACKS:
        if domain.endswith(key) or key.endswith(domain):
            return KNOWN_STACKS[key]
    return None


def enhance_stack(data: dict) -> dict:
    """
    Enhance detected stack using:
    1. Known site database (instant, no AI)
    2. AI inference from page content
    3. AI inference from domain name alone (last resort)
    """
    existing = data.get("stack", {})
    domain   = data.get("domain", "")
    scripts  = "\n".join(data.get("raw", {}).get("scripts", [])[:12])
    html_snip= data.get("raw", {}).get("html_snippet", "")[:2000]
    method   = data.get("method", "")

    # Step 1 — Known site database
    known = _get_known_stack(domain)
    if known:
        # Merge: known fills gaps, existing (scraped) takes priority
        merged = {**known, **existing}
        # If scraping gave us nothing, use full known stack
        if not existing:
            print(f"  📚 Using known stack for {domain}")
            return known
        return merged

    # Step 2 — AI inference from page content
    if scripts or html_snip:
        prompt = f"""You are a web tech expert. Identify the tech stack from this webpage data.

Domain: {domain}
Scripts/Imports found: {scripts}
HTML snippet: {html_snip[:1200]}
Already detected by scraper: {json.dumps(existing)}

Return ONLY a JSON object, no markdown, no explanation:
{{"framework":"","styling":"","hosting":"","cdn":"","analytics":"","auth":"","database":"","payments":"","language":""}}

Rules:
- Only include keys you are CONFIDENT about based on the evidence
- framework: React/Next.js/Vue/Angular/Svelte/etc
- language: TypeScript or JavaScript
- Leave key empty string if unsure"""

        r = _call(prompt, 300)
        if r:
            try:
                clean = r.strip().strip("```json").strip("```").strip()
                # Find JSON object in response
                start = clean.find("{")
                end   = clean.rfind("}") + 1
                if start >= 0 and end > start:
                    ai = json.loads(clean[start:end])
                    # Remove empty values
                    ai = {k: v for k, v in ai.items() if v and v.strip()}
                    merged = {**ai, **existing}  # scraped wins over AI
                    if merged:
                        return merged
            except:
                pass

    # Step 3 — AI domain inference (always runs as last resort)
    if not existing or len(existing) < 2:
        prompt = f"""You are a web tech expert. Based ONLY on the domain name and what you know about this website, what tech stack does it use?

Domain: {domain}

Return ONLY a JSON object, no markdown, no explanation:
{{"framework":"","styling":"","hosting":"","cdn":"","language":"","analytics":""}}

Be specific. Use your knowledge about this specific website/company.
Only include keys you are reasonably confident about."""

        r = _call(prompt, 200)
        if r:
            try:
                clean = r.strip().strip("```json").strip("```").strip()
                start = clean.find("{")
                end   = clean.rfind("}") + 1
                if start >= 0 and end > start:
                    ai = json.loads(clean[start:end])
                    ai = {k: v for k, v in ai.items() if v and v.strip()}
                    if ai:
                        print(f"  🤖 AI domain-inferred stack for {domain}")
                        return {**ai, **existing}
            except:
                pass

    # Final fallback — at least return something
    if not existing:
        print(f"  ⚠️  No stack detected for {domain}, using minimal fallback")
        return {"framework": "Unknown", "language": "JavaScript", "hosting": "Cloud"}

    return existing


def explain(data: dict) -> str:
    stack    = data.get("stack", {})
    structure= data.get("structure", [])
    domain   = data.get("domain", "")
    ui       = data.get("ui_components", [])
    method   = data.get("method", "")

    prompt = f"""You are a senior frontend architect reviewing a website for a developer audience.

Website: {domain}
Tech Stack: {json.dumps(stack)}
Page Sections: {', '.join(structure) if structure else 'Not detected'}
UI Components: {', '.join(ui[:8]) if ui else 'Not detected'}
Analysis Method: {method}

Write exactly 3 paragraphs. No headers, no bullets, no markdown.

Paragraph 1 — ARCHITECTURE: What specific tech choices were made? Why would a team choose this stack? What does it reveal about their priorities (performance, developer experience, scalability)?

Paragraph 2 — DESIGN STRATEGY: What layout patterns and UX decisions are visible? What user actions is this page optimized to drive? What conversion strategy is in play?

Paragraph 3 — HOW TO REPLICATE: If a developer wanted to build something similar today, what exact steps would you recommend? What are the 2-3 most important technical decisions to get right?

Be specific, opinionated, and genuinely useful. Max 200 words total."""

    r = _call(prompt, 500)
    if r and len(r.strip()) > 50:
        return r.strip()

    # Rich rule-based fallback
    fw  = stack.get("framework", "a modern JavaScript framework")
    hos = stack.get("hosting",   "cloud infrastructure")
    sty = stack.get("styling",   "a CSS framework")
    cdn = stack.get("cdn",       "")
    ts  = stack.get("language",  "JavaScript")
    pay = stack.get("payments",  "")
    auth= stack.get("auth",      "")
    sec = ", ".join(structure[:5]) if structure else "standard page sections"

    cdn_note  = f" with {cdn} for global edge delivery" if cdn else ""
    pay_note  = f" Stripe for payments" if "stripe" in str(pay).lower() else ""
    auth_note = f" and {auth} for authentication" if auth else ""

    return (
        f"This website is built with {fw} ({ts}), hosted on {hos}{cdn_note}. "
        f"The choice of {fw} reflects a focus on component reusability and developer velocity — "
        f"a common choice for teams that iterate fast and value a strong ecosystem. "
        f"{sty} handles styling, keeping the design system consistent and the bundle lean.{pay_note}{auth_note}\n\n"
        f"The page follows a conversion-optimized structure: {sec}. "
        f"Each section serves a specific persuasion role — the hero establishes the value proposition, "
        f"features justify the product, and the CTA drives the primary action. "
        f"This pattern is battle-tested for SaaS and product-led growth companies.\n\n"
        f"To replicate: start with `npx create-next-app@latest --typescript --tailwind`, "
        f"then build each section as an isolated component. "
        f"Prioritize the hero and CTA sections first — they drive 80% of conversions. "
        f"Match the {sty} approach for styling consistency, and deploy to {hos} for the same performance profile."
    )


def generate_skeleton(data: dict) -> dict:
    stack    = data.get("stack", {})
    structure= data.get("structure", [])
    fw       = stack.get("framework", "React")
    sty      = stack.get("styling", "CSS")
    is_next  = "next" in fw.lower()
    is_ts    = stack.get("language", "").lower() in ["typescript", "ts"]
    ext      = "tsx" if is_ts else "jsx"

    comp_map = {
        "Navbar":"Navbar","Hero Section":"Hero","Features Section":"Features",
        "Pricing Section":"Pricing","Testimonials":"Testimonials","FAQ Section":"FAQ",
        "Blog / Articles":"BlogGrid","Team / About":"TeamSection",
        "Contact Section":"ContactForm","CTA Section":"CTABanner","Footer":"Footer",
    }
    comps = [comp_map.get(s, s.replace(" ", "")) for s in structure] if structure else ["Navbar","Hero","Features","Pricing","Footer"]

    folder = _folder_structure(fw, comps, ext, is_next)
    code   = {}
    templates = {
        "Navbar":   _navbar(ext),
        "Hero":     _hero(ext),
        "Footer":   _footer(ext),
        "Features": _features(ext),
        "Pricing":  _pricing(ext),
    }
    for c in comps:
        code[c] = templates.get(c, _generic(c, ext))

    install = _install(fw, stack)
    return {"folder_structure": folder, "components": code,
            "framework": fw, "extension": ext, "install_command": install}


def _folder_structure(fw, comps, ext, is_next):
    lines = "\n".join([f"    │   ├── {c}.{ext}" for c in comps])
    if is_next:
        return f"""my-project/
├── app/
│   ├── layout.{ext}
│   ├── page.{ext}
│   └── globals.css
├── components/
{lines}
│   └── ui/
│       ├── Button.{ext}
│       └── Card.{ext}
├── lib/
│   └── utils.ts
├── public/
├── tailwind.config.js
├── next.config.js
└── package.json"""
    return f"""my-project/
├── src/
│   ├── components/
{lines}
│   ├── App.{ext}
│   └── index.css
├── public/
│   └── index.html
├── tailwind.config.js
└── package.json"""


def _navbar(ext):
    return """import { useState } from 'react'

const Navbar = () => {
  const [open, setOpen] = useState(false)
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div className="font-bold text-xl">YourLogo</div>
      <ul className="hidden md:flex gap-8 text-sm font-medium">
        <li><a href="#features" className="hover:text-blue-600">Features</a></li>
        <li><a href="#pricing" className="hover:text-blue-600">Pricing</a></li>
        <li><a href="#about" className="hover:text-blue-600">About</a></li>
      </ul>
      <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition">
        Get Started
      </button>
    </nav>
  )
}
export default Navbar"""


def _hero(ext):
    return """const Hero = () => (
  <section className="flex flex-col items-center text-center py-24 px-6">
    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-6">
      New · Your latest update
    </span>
    <h1 className="text-5xl md:text-7xl font-black mb-6 max-w-3xl leading-tight">
      Your Main Headline
    </h1>
    <p className="text-xl text-gray-500 mb-10 max-w-xl">
      A clear subheadline that explains what you do and for whom.
    </p>
    <div className="flex gap-4 flex-wrap justify-center">
      <button className="bg-black text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition">
        Get Started Free
      </button>
      <button className="border border-gray-300 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition">
        See Demo
      </button>
    </div>
  </section>
)
export default Hero"""


def _features(ext):
    return """const FEATURES = [
  { icon: '⚡', title: 'Feature One',   desc: 'Describe the benefit clearly and concisely.' },
  { icon: '🛡️', title: 'Feature Two',   desc: 'Focus on outcomes, not features.' },
  { icon: '🚀', title: 'Feature Three', desc: 'Keep it short — one sentence per feature.' },
]

const Features = () => (
  <section id="features" className="py-20 px-6">
    <h2 className="text-3xl font-bold text-center mb-4">Everything you need</h2>
    <p className="text-gray-500 text-center mb-12">Built for modern teams who move fast.</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {FEATURES.map((f, i) => (
        <div key={i} className="p-6 border border-gray-200 rounded-2xl hover:shadow-md transition">
          <div className="text-3xl mb-4">{f.icon}</div>
          <h3 className="font-bold mb-2">{f.title}</h3>
          <p className="text-gray-500 text-sm">{f.desc}</p>
        </div>
      ))}
    </div>
  </section>
)
export default Features"""


def _pricing(ext):
    return """const PLANS = [
  { name:'Starter', price:'$0',  period:'forever', features:['5 projects','Basic analytics','Community support'], cta:'Get Started', highlight:false },
  { name:'Pro',     price:'$19', period:'month',   features:['Unlimited projects','Advanced analytics','Priority support','API access'], cta:'Start Free Trial', highlight:true },
  { name:'Team',    price:'$49', period:'month',   features:['Everything in Pro','Team collaboration','Custom domains','SLA guarantee'], cta:'Contact Sales', highlight:false },
]

const Pricing = () => (
  <section id="pricing" className="py-20 px-6 bg-gray-50">
    <h2 className="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
    <p className="text-gray-500 text-center mb-12">No hidden fees. Cancel anytime.</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {PLANS.map((plan, i) => (
        <div key={i} className={`p-8 rounded-2xl border ${plan.highlight ? 'border-black bg-black text-white shadow-xl scale-105' : 'border-gray-200 bg-white'}`}>
          <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
          <div className="text-4xl font-black mb-1">{plan.price}<span className="text-lg font-normal opacity-60">/{plan.period}</span></div>
          <ul className="my-6 space-y-2">
            {plan.features.map((f,j) => <li key={j} className="flex items-center gap-2 text-sm"><span>✓</span>{f}</li>)}
          </ul>
          <button className={`w-full py-3 rounded-xl font-semibold transition ${plan.highlight ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}>
            {plan.cta}
          </button>
        </div>
      ))}
    </div>
  </section>
)
export default Pricing"""


def _footer(ext):
    return """const Footer = () => (
  <footer className="border-t border-gray-200 px-6 py-12">
    <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
      <div>
        <div className="font-bold text-lg mb-3">YourBrand</div>
        <p className="text-gray-500 text-sm">Your product tagline goes here.</p>
      </div>
      {['Product','Company','Legal'].map(section => (
        <div key={section}>
          <h4 className="font-semibold text-sm mb-3">{section}</h4>
          <ul className="space-y-2 text-gray-500 text-sm">
            <li><a href="#" className="hover:text-black transition">Link One</a></li>
            <li><a href="#" className="hover:text-black transition">Link Two</a></li>
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between text-gray-400 text-sm">
      <span>© {new Date().getFullYear()} YourBrand. All rights reserved.</span>
      <div className="flex gap-4 mt-2 md:mt-0">
        <a href="#" className="hover:text-black transition">Twitter</a>
        <a href="#" className="hover:text-black transition">GitHub</a>
      </div>
    </div>
  </footer>
)
export default Footer"""


def _generic(name, ext):
    return f"""const {name} = () => (
  <section className="{name.lower()}-section py-16 px-6">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">{name}</h2>
      {{/* Add your {name} content here */}}
    </div>
  </section>
)
export default {name}"""


def _install(fw, stack):
    cmds = []
    if "next" in fw.lower():
        cmds.append("npx create-next-app@latest my-project --typescript --tailwind --eslint --app")
    elif "vue" in fw.lower() or "nuxt" in fw.lower():
        cmds.append("npx nuxi@latest init my-project")
    elif "svelte" in fw.lower():
        cmds.append("npm create svelte@latest my-project")
    else:
        cmds.append("npx create-react-app my-project --template typescript")
    cmds.append("cd my-project")
    if stack.get("auth") == "Clerk":
        cmds.append("npm install @clerk/nextjs")
    if "supabase" in str(stack.get("database", "")).lower():
        cmds.append("npm install @supabase/supabase-js")
    if "stripe" in str(stack.get("payments", "")).lower():
        cmds.append("npm install stripe @stripe/stripe-js")
    cmds.append("npm run dev")
    return "\n".join(cmds)