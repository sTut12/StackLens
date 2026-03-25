import os, hashlib, time
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

_db = None
_init_attempted = False
_init_failed = False

def _get_db():
    global _db, _init_attempted, _init_failed
    if _db is not None:
        return _db
    if _init_failed:
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        cred_path = os.getenv("FIREBASE_CREDENTIALS", "./firebase-credentials.json")
        if not _init_attempted:
            _init_attempted = True
            if not firebase_admin._apps:
                if os.path.exists(cred_path):
                    firebase_admin.initialize_app(credentials.Certificate(cred_path))
                else:
                    print("⚠️  No Firebase credentials — running without cache")
                    _init_failed = True
                    return None
        _db = firestore.client()
        print("✅ Firebase connected")
        return _db
    except Exception as e:
        print(f"⚠️  Firebase init failed: {e}")
        _init_failed = True
        return None

def _key(url: str) -> str:
    return hashlib.md5(url.strip().lower().encode()).hexdigest()

def get_cached(url: str) -> Optional[dict]:
    db = _get_db()
    if not db: return None
    try:
        doc = db.collection("analyses").document(_key(url)).get()
        if not doc.exists: return None
        data = doc.to_dict()
        if (time.time() - data.get("cached_at", 0)) > int(os.getenv("CACHE_TTL", 1800)):
            return None
        print(f"⚡ Cache HIT: {url}")
        return data.get("result")
    except Exception as e:
        print(f"Cache read error: {e}")
        return None

def set_cache(url: str, result: dict):
    db = _get_db()
    if not db: return
    try:
        db.collection("analyses").document(_key(url)).set({
            "url": url, "result": result, "cached_at": time.time()
        })
    except Exception as e:
        print(f"Cache write error: {e}")

def save_history(url: str, result: dict):
    db = _get_db()
    if not db: return
    try:
        db.collection("history").add({
            "url": url,
            "summary": result.get("stack", {}).get("framework", "Unknown"),
            "timestamp": time.time(),
        })
    except Exception as e:
        print(f"History save error: {e}")
