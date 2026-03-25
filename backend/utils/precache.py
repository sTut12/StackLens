"""
Run this BEFORE the demo to pre-cache all demo sites.
Usage: python utils/precache.py
"""
import asyncio, sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraper.engine import scrape_site
from ai.engine      import enhance_stack, explain, generate_skeleton
from db.firebase    import set_cache

SITES = ["https://stripe.com","https://vercel.com","https://linear.app",
         "https://notion.so","https://github.com","https://tailwindcss.com",
         "https://nextjs.org","https://supabase.com"]

async def cache_one(url):
    try:
        print(f"\n⏳ {url}")
        s = await scrape_site(url)
        s["stack"] = enhance_stack(s)
        result = {
            "url": url, "domain": s.get("domain",""),
            "scrape_method": s.get("method",""), "stack": s.get("stack",{}),
            "structure": s.get("structure",[]), "ui_components": s.get("ui_components",[]),
            "explanation": explain(s), "skeleton": generate_skeleton(s),
            "from_cache": True, "ollama_used": True, "response_time_ms": 0,
        }
        set_cache(url, result)
        print(f"  ✅ Done — {s.get('method')} — {s.get('stack',{}).get('framework','?')}")
        return True
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        return False

async def main():
    print("🚀 StackLens Pre-Cache\n" + "="*40)
    ok = sum([await cache_one(u) or 0 for u in SITES])
    print(f"\n{'='*40}\n✅ {ok}/{len(SITES)} sites cached.\nDemo is ready!\n")

if __name__ == "__main__":
    asyncio.run(main())
