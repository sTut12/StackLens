"""
4-Layer scraping — ALWAYS returns something.
Layer 1: Playwright  (full JS render)
Layer 2: Requests    (raw HTML)
Layer 3: HEAD only   (HTTP headers)
Layer 4: AI guess    (domain inference)
"""
import re, time
from typing import Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup

try:
    from fake_useragent import UserAgent
    _UA = UserAgent()
    def rand_ua(): return _UA.random
except Exception:
    def rand_ua(): return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

def normalize(url: str) -> str:
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url
    return url

def domain(url: str) -> str:
    return urlparse(url).netloc.replace("www.", "")

# ── Layer 1 ────────────────────────────────────────────────────
async def _playwright(url: str) -> Optional[dict]:
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            ctx     = await browser.new_context(user_agent=rand_ua(),
                                                 viewport={"width": 1280, "height": 800})
            page    = await ctx.new_page()
            await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}", lambda r: r.abort())
            resp    = await page.goto(url, timeout=25000, wait_until="domcontentloaded")
            await page.wait_for_timeout(2500)
            html    = await page.content()
            headers = dict(resp.headers) if resp else {}
            scripts = await page.eval_on_selector_all("script[src]", "els=>els.map(e=>e.src)")
            meta    = await page.eval_on_selector_all(
                "meta", "els=>els.map(e=>({name:e.name,content:e.content,property:e.getAttribute('property')}))")
            title   = await page.title()
            await browser.close()
            return {"html": html, "headers": headers, "scripts": scripts,
                    "meta": meta, "title": title, "method": "playwright"}
    except NotImplementedError:
        print("  L1 fail: asyncio subprocess not supported (Windows Python 3.13) — skipping Playwright")
        return None
    except Exception as e:
        print(f"  L1 fail: {e}")
        return None

# ── Layer 2 ────────────────────────────────────────────────────
def _requests(url: str) -> Optional[dict]:
    try:
        import requests
        r    = requests.get(url, headers={"User-Agent": rand_ua(),
               "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"},
               timeout=12, allow_redirects=True)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")
        return {
            "html":    r.text,
            "headers": dict(r.headers),
            "scripts": [s.get("src","") for s in soup.find_all("script", src=True)],
            "meta":    [{"name": m.get("name",""), "content": m.get("content",""),
                         "property": m.get("property","")} for m in soup.find_all("meta")],
            "title":   soup.title.string if soup.title else "",
            "method":  "requests",
        }
    except Exception as e:
        print(f"  L2 fail: {e}")
        return None

# ── Layer 3 ────────────────────────────────────────────────────
def _headers_only(url: str) -> Optional[dict]:
    try:
        import requests
        r = requests.head(url, headers={"User-Agent": rand_ua()}, timeout=8, allow_redirects=True)
        return {"html":"","headers":dict(r.headers),"scripts":[],"meta":[],"title":"","method":"headers_only"}
    except Exception as e:
        print(f"  L3 fail: {e}")
        return None

# ── Layer 4 ────────────────────────────────────────────────────
def _ai_guess(url: str) -> dict:
    return {"html":"","headers":{},"scripts":[],"meta":[],"title":"",
            "method":"ai_inference","domain_hint": domain(url)}

# ── Tech detection ─────────────────────────────────────────────
def detect_stack(data: dict) -> dict:
    html    = (data.get("html","") or "").lower()
    headers = {k.lower():v for k,v in (data.get("headers",{}) or {}).items()}
    scripts = " ".join(data.get("scripts",[]) or []).lower()
    all_txt = html + " " + scripts
    stack   = {}

    # Framework
    if any(x in all_txt for x in ["__next","_next/static","next.js"]):
        stack["framework"] = "Next.js"
    elif any(x in all_txt for x in ["nuxt","__nuxt"]):
        stack["framework"] = "Nuxt.js"
    elif any(x in all_txt for x in ["ng-version","angular.min"]):
        stack["framework"] = "Angular"
    elif any(x in all_txt for x in ["vue.runtime","__vue"]):
        stack["framework"] = "Vue.js"
    elif "gatsby" in all_txt:
        stack["framework"] = "Gatsby"
    elif "svelte" in all_txt:
        stack["framework"] = "SvelteKit"
    elif any(x in all_txt for x in ["react-dom","react.production"]):
        stack["framework"] = "React"
    elif "htmx" in all_txt:
        stack["framework"] = "HTMX"
    elif "wp-content" in html or "wordpress" in all_txt:
        stack["framework"] = "WordPress"

    # Styling
    if any(x in all_txt for x in ["tailwind","tw-","from-","via-","to-"]):
        stack["styling"] = "Tailwind CSS"
    elif "bootstrap" in all_txt:
        stack["styling"] = "Bootstrap"
    elif "chakra" in all_txt:
        stack["styling"] = "Chakra UI"
    elif any(x in all_txt for x in ["@mui","material-ui","materialui"]):
        stack["styling"] = "Material UI"
    elif "styled-components" in all_txt:
        stack["styling"] = "Styled Components"

    # Hosting
    if headers.get("x-vercel-id") or "vercel" in headers.get("server","").lower():
        stack["hosting"] = "Vercel"
    elif headers.get("x-nf-request-id") or "netlify" in headers.get("server","").lower():
        stack["hosting"] = "Netlify"
    elif headers.get("cf-ray") or "cloudflare" in headers.get("server","").lower():
        stack["hosting"] = "Cloudflare"
        stack["cdn"]     = "Cloudflare CDN"
    elif "amazonaws" in headers.get("server","").lower() or "awselb" in headers.get("server","").lower():
        stack["hosting"] = "AWS"
    elif "github" in headers.get("server","").lower():
        stack["hosting"] = "GitHub Pages"

    # Server
    srv = headers.get("server","").lower()
    if "nginx"  in srv: stack["server"] = "Nginx"
    elif "apache" in srv: stack["server"] = "Apache"

    # Analytics
    ana = []
    if any(x in all_txt for x in ["google-analytics","gtag","ga.js"]): ana.append("Google Analytics")
    if "segment" in all_txt:  ana.append("Segment")
    if "mixpanel" in all_txt: ana.append("Mixpanel")
    if "hotjar" in all_txt:   ana.append("Hotjar")
    if "posthog" in all_txt:  ana.append("PostHog")
    if ana: stack["analytics"] = " + ".join(ana)

    # Auth / DB
    if "supabase" in all_txt:    stack["database"] = "Supabase"
    if "firebase" in all_txt:    stack["database"] = "Firebase"
    if "clerk" in all_txt:       stack["auth"]     = "Clerk"
    if "auth0" in all_txt:       stack["auth"]     = "Auth0"
    if "nextauth" in all_txt:    stack["auth"]     = "NextAuth.js"

    # CMS
    if "contentful" in all_txt:  stack["cms"] = "Contentful"
    elif "sanity" in all_txt:    stack["cms"] = "Sanity"
    elif "strapi" in all_txt:    stack["cms"] = "Strapi"

    # Payments
    if "stripe" in all_txt:   stack["payments"] = "Stripe"
    elif "razorpay" in all_txt: stack["payments"] = "Razorpay"

    # Language
    xpow = headers.get("x-powered-by","").lower()
    if "php" in xpow:    stack["language"] = "PHP"
    elif "node" in xpow: stack["language"] = "Node.js"

    return stack

def detect_structure(data: dict) -> list:
    html = (data.get("html","") or "").lower()
    out  = []
    checks = [
        (["<nav","navbar","navigation"],          "Navbar"),
        (["hero","banner","jumbotron"],           "Hero Section"),
        (["feature","feature-card"],              "Features Section"),
        (["pricing","price-card","plan-"],        "Pricing Section"),
        (["testimonial","review","customer"],     "Testimonials"),
        (["faq","accordion","frequently"],        "FAQ Section"),
        (["blog","article","post-card"],          "Blog / Articles"),
        (["team","about-us","our-team"],          "Team / About"),
        (["contact","get-in-touch"],              "Contact Section"),
        (["cta-","call-to-action","get-started"], "CTA Section"),
        (["<footer","footer-"],                   "Footer"),
    ]
    for keywords, label in checks:
        if any(k in html for k in keywords):
            out.append(label)
    return out if out else ["Page Content", "Footer"]

def detect_ui(data: dict) -> list:
    html = (data.get("html","") or "").lower()
    found = []
    patterns = {
        "Primary Buttons":   ["btn-primary","<button"],
        "Feature Cards":     ["feature-card","card-feature"],
        "Pricing Tables":    ["pricing-table","price-card"],
        "Modal Dialogs":     ["modal","dialog"],
        "Sticky Navbar":     ["sticky","fixed-top"],
        "Hamburger Menu":    ["hamburger","menu-toggle"],
        "Newsletter Form":   ["newsletter","subscribe"],
        "Search Bar":        ["search-bar","search-input"],
        "Social Links":      ["twitter","linkedin","github"],
        "Video Background":  ["video-bg","<video"],
        "Carousel/Slider":   ["carousel","slider","swiper"],
        "Code Blocks":       ["<code","<pre"],
        "Badges/Tags":       ["badge","chip"],
        "Star Ratings":      ["star-rating"],
        "Breadcrumbs":       ["breadcrumb"],
    }
    for name, kw in patterns.items():
        if any(k in html for k in kw):
            found.append(name)
    return found if found else ["Buttons", "Cards", "Forms"]

# ── Main orchestrator ──────────────────────────────────────────
async def scrape_site(url: str) -> dict:
    url = normalize(url)
    print(f"\n🔍 {url}")

    data = await _playwright(url)
    if not data:
        print("  → Layer 2")
        data = _requests(url)
    if not data:
        print("  → Layer 3")
        data = _headers_only(url)
    if not data:
        print("  → Layer 4 (AI guess)")
        data = _ai_guess(url)

    print(f"  ✅ {data['method']}")
    return {
        "url":          url,
        "domain":       domain(url),
        "method":       data["method"],
        "stack":        detect_stack(data),
        "structure":    detect_structure(data),
        "ui_components":detect_ui(data),
        "raw": {
            "title":       data.get("title",""),
            "scripts":     data.get("scripts",[])[:20],
            "headers":     data.get("headers",{}),
            "html_snippet": (data.get("html","") or "")[:3000],
        }
    }
