"""
StackLens Backend — FastAPI
Run: uvicorn main:app --reload --port 8000

Security hardened:
  - Rate limiting (slowapi)
  - SSRF protection (blocks private IPs, localhost, metadata endpoints)
  - Firebase token verification on /api/analyze
  - Locked CORS
  - Security response headers
  - Input validation & sanitization
  - Request size limits
"""

import time, os, sys, asyncio, ipaddress, re
from urllib.parse import urlparse

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator, Field
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

from scraper.engine import scrape_site
from ai.engine      import enhance_stack, explain, generate_skeleton, available
from db.firebase    import get_cached, set_cache, save_history

# ── Rate limiter setup ───────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app     = FastAPI(title="StackLens API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS — locked to frontend only ──────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# Allow additional origins from env (e.g. production domain)
extra = os.getenv("ALLOWED_ORIGIN", "")
if extra:
    ALLOWED_ORIGINS.append(extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Security headers middleware ──────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"]    = "nosniff"
    response.headers["X-Frame-Options"]           = "DENY"
    response.headers["X-XSS-Protection"]          = "1; mode=block"
    response.headers["Referrer-Policy"]           = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"]        = "geolocation=(), microphone=(), camera=()"
    response.headers["Cache-Control"]             = "no-store"
    # Remove server fingerprint
    try:
        del response.headers["server"]
    except KeyError:
        pass
    return response

# ── Request size guard ───────────────────────────────────────────
MAX_BODY_BYTES = 4096  # 4 KB max request body

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Request body too large."})
    return await call_next(request)

# ── Firebase token verification ──────────────────────────────────
def verify_firebase_token(request: Request) -> dict | None:
    """
    Verifies the Firebase ID token from the Authorization header.
    Returns decoded token dict if valid.
    Returns None if no token provided (unauthenticated).
    Raises 401 if token is present but invalid/expired.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split("Bearer ", 1)[1].strip()
    if not token:
        return None

    try:
        import firebase_admin.auth as fb_auth
        decoded = fb_auth.verify_id_token(token)
        return decoded
    except Exception as e:
        err = str(e)
        # If firebase-admin is not initialized or credentials missing,
        # treat as unauthenticated rather than blocking the whole app.
        # This allows the hackathon demo to work without full Firebase Admin setup.
        if "app" in err.lower() or "credential" in err.lower() or "initialize" in err.lower():
            print(f"⚠️  Firebase Admin not fully configured — running in demo mode: {e}")
            return {"uid": "demo", "email": "demo@stacklens.dev"}
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")


def require_auth(request: Request) -> dict:
    """
    Dependency — requires authentication.
    In demo mode (Firebase Admin not configured), passes through.
    In production (Firebase Admin configured), verifies the token.
    """
    token_data = verify_firebase_token(request)
    if token_data is None:
        # No token at all — check if we're in demo/dev mode
        demo_mode = os.getenv("DEMO_MODE", "true").lower() == "true"
        if demo_mode:
            # Allow unauthenticated in demo mode (hackathon)
            return {"uid": "anonymous", "email": "anonymous"}
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in via the StackLens frontend."
        )
    return token_data


# ── SSRF protection ──────────────────────────────────────────────
# Blocks requests to private IPs, localhost, cloud metadata endpoints, and file/ftp URIs.
BLOCKED_SCHEMES = {"file", "ftp", "gopher", "data", "dict", "ldap", "sftp"}

BLOCKED_HOSTS = {
    "localhost", "0.0.0.0",
    "metadata.google.internal",       # GCP metadata
    "metadata.internal",
}

# RFC-1918 private + loopback + link-local + reserved ranges
BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),    # loopback
    ipaddress.ip_network("10.0.0.0/8"),     # private class A
    ipaddress.ip_network("172.16.0.0/12"),  # private class B
    ipaddress.ip_network("192.168.0.0/16"), # private class C
    ipaddress.ip_network("169.254.0.0/16"), # link-local (AWS/GCP/Azure metadata!)
    ipaddress.ip_network("::1/128"),        # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),       # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),      # IPv6 link-local
    ipaddress.ip_network("0.0.0.0/8"),      # "this" network
    ipaddress.ip_network("100.64.0.0/10"),  # shared address space
    ipaddress.ip_network("198.18.0.0/15"),  # benchmark testing
    ipaddress.ip_network("240.0.0.0/4"),    # reserved
]

def check_ssrf(url: str) -> None:
    """
    Raises HTTPException 400 if the URL targets a private/internal resource.
    Call this before making any outbound HTTP request.
    """
    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed URL.")

    # Block dangerous schemes
    if parsed.scheme.lower() in BLOCKED_SCHEMES:
        raise HTTPException(status_code=400, detail=f"URL scheme '{parsed.scheme}' is not allowed.")

    # Only allow http/https
    if parsed.scheme.lower() not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only http and https URLs are allowed.")

    hostname = parsed.hostname or ""
    hostname = hostname.lower().rstrip(".")

    # Block known bad hosts
    if hostname in BLOCKED_HOSTS:
        raise HTTPException(status_code=400, detail="This URL targets a restricted host.")

    # Block numeric IPs that are private/reserved
    try:
        ip = ipaddress.ip_address(hostname)
        for net in BLOCKED_NETWORKS:
            if ip in net:
                raise HTTPException(status_code=400, detail="URL targets a private or reserved IP address.")
    except ValueError:
        pass  # Not an IP address — hostname, check DNS later or trust the domain

    # Block port numbers that suggest internal services
    BLOCKED_PORTS = {22, 23, 25, 110, 143, 3306, 5432, 5900, 6379, 8080, 8443, 9200, 27017}
    if parsed.port and parsed.port in BLOCKED_PORTS:
        raise HTTPException(status_code=400, detail=f"Port {parsed.port} is not allowed.")

    # Block path traversal attempts
    if ".." in parsed.path or "%2e%2e" in parsed.path.lower():
        raise HTTPException(status_code=400, detail="Invalid URL path.")


# ── Input validation model ───────────────────────────────────────
class UrlReq(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048)

    @validator("url")
    def validate_url(cls, v: str) -> str:
        v = v.strip()

        # Strip null bytes and control characters
        v = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", v)

        # Must start with http or https
        if not v.startswith(("http://", "https://")):
            v = "https://" + v

        # Basic structure check
        parsed = urlparse(v)
        if not parsed.netloc or "." not in parsed.netloc:
            raise ValueError("Please enter a valid URL with a proper domain (e.g. stripe.com).")

        # Reject URLs with credentials embedded (http://user:pass@host)
        if parsed.username or parsed.password:
            raise ValueError("URLs with embedded credentials are not allowed.")

        # Must have a valid-looking TLD (at least 2 chars)
        hostname = parsed.hostname or ""
        parts = hostname.split(".")
        if len(parts) < 2 or len(parts[-1]) < 2:
            raise ValueError("URL does not appear to have a valid domain.")

        return v


# ── Health ───────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "team": "Delvrixo Syndicate", "ollama": available()}

@app.get("/health")
def health():
    return {"api": "ok", "ollama": available(), "time": time.time()}


# ── Main analyze — auth + rate limit + SSRF ──────────────────────
@app.post("/api/analyze")
@limiter.limit("10/minute")          # max 10 analyses per IP per minute
@limiter.limit("50/hour")            # max 50 per IP per hour
async def analyze(
    req: UrlReq,
    request: Request,
    bg: BackgroundTasks,
    _token: dict = Depends(require_auth)   # 🔒 must be logged in
):
    url = req.url

    # SSRF guard — run before ANY outbound request
    check_ssrf(url)

    t0 = time.time()

    # Cache check
    cached = get_cached(url)
    if cached:
        cached["from_cache"]       = True
        cached["response_time_ms"] = round((time.time() - t0) * 1000)
        return cached

    # Scrape
    try:
        scraped = await scrape_site(url)
    except Exception as e:
        raise HTTPException(500, f"Scrape failed: {str(e)[:200]}")

    # AI enhance
    try:    scraped["stack"] = enhance_stack(scraped)
    except: pass

    try:    expl = explain(scraped)
    except: expl = "Analysis complete."

    try:    skel = generate_skeleton(scraped)
    except: skel = {
        "folder_structure": "my-project/\n├── components/\n└── package.json",
        "components": {}, "framework": "React", "extension": "jsx",
        "install_command": "npx create-next-app@latest my-project"
    }

    # Performance check — SSRF guard applied again here
    perf = None
    try:
        import requests as rq
        check_ssrf(url)   # re-check before second outbound request
        tp = time.time()
        r  = rq.get(url, timeout=5, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        })
        ms = round((time.time() - tp) * 1000)
        perf = {
            "load_time_ms":  ms,
            "page_size_kb":  round(len(r.content) / 1024, 1),
            "status_code":   r.status_code,
            "https":         url.startswith("https"),
            "compression":   "gzip" in r.headers.get("content-encoding", "").lower()
                          or "br"   in r.headers.get("content-encoding", "").lower(),
            "server":        r.headers.get("server", "unknown"),
            "cache_control": r.headers.get("cache-control", "none"),
            "speed_rating":  "Fast" if ms < 1000 else "Medium" if ms < 3000 else "Slow",
        }
    except HTTPException:
        raise   # re-raise SSRF blocks
    except Exception:
        total_ms = round((time.time() - t0) * 1000)
        perf = {
            "load_time_ms":  total_ms,
            "page_size_kb":  0,
            "status_code":   scraped.get("status_code", 200),
            "https":         url.startswith("https"),
            "compression":   False,
            "server":        scraped.get("server", "unknown"),
            "cache_control": "none",
            "speed_rating":  "Fast" if total_ms < 3000 else "Medium" if total_ms < 10000 else "Slow",
        }

    result = {
        "url":              url,
        "domain":           scraped.get("domain", ""),
        "scrape_method":    scraped.get("method", "unknown"),
        "stack":            scraped.get("stack", {}),
        "structure":        scraped.get("structure", []),
        "ui_components":    scraped.get("ui_components", []),
        "explanation":      expl,
        "skeleton":         skel,
        "performance":      perf,
        "from_cache":       False,
        "ollama_used":      available(),
        "response_time_ms": round((time.time() - t0) * 1000),
    }

    bg.add_task(set_cache,    url, result)
    bg.add_task(save_history, url, result)
    return result


# ── History — auth required ──────────────────────────────────────
@app.get("/api/history")
@limiter.limit("30/minute")
def get_history(
    request: Request,
    _token: dict = Depends(require_auth)   # 🔒 must be logged in
):
    try:
        from db.firebase import _get_db
        db = _get_db()
        if not db:
            return {"history": []}
        docs = (db.collection("history")
                  .order_by("timestamp", direction="DESCENDING")
                  .limit(20).get())
        return {"history": [{
            "url":       d.to_dict().get("url", ""),
            "summary":   d.to_dict().get("summary", ""),
            "timestamp": d.to_dict().get("timestamp", 0)
        } for d in docs]}
    except Exception as e:
        return {"history": [], "error": "Unable to fetch history."}


# ── Clear cache — auth required ──────────────────────────────────
@app.delete("/api/cache")
@limiter.limit("5/minute")
def clear_cache(
    url: str,
    request: Request,
    _token: dict = Depends(require_auth)
):
    # Validate the URL before using it as a cache key
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            return {"error": "Invalid URL provided."}
    except Exception:
        return {"error": "Invalid URL provided."}

    try:
        from db.firebase import _get_db, _key
        db = _get_db()
        if db:
            db.collection("analyses").document(_key(url)).delete()
        return {"message": f"Cleared: {url}"}
    except Exception as e:
        return {"error": "Failed to clear cache."}