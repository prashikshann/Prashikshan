"""
News Cache System - Stores scraped articles in JSON and syncs with Supabase Storage
"""
import os
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import threading

# Local cache file path
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'cache')
CACHE_FILE = os.path.join(CACHE_DIR, 'news_cache.json')

# Cache structure
DEFAULT_CACHE = {
    "last_updated": None,
    "last_refresh_duration": 0,
    "total_articles": 0,
    "feed_version": 1,
    "categories": {
        "tech": [],
        "education": [],
        "career": [],
        "ai_ml": [],
        "startups": [],
        "developer": [],
        "github": [],
        "general": []
    },
    "metadata": {
        "refresh_count": 0,
        "created_at": None,
        "version": "1.0"
    }
}

class NewsCache:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._cache = None
        self._supabase = None
        self._bucket_name = "news-cache"
        self._ensure_cache_dir()
        self._load_cache()
    
    def _ensure_cache_dir(self):
        """Ensure cache directory exists"""
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR)
    
    def _load_cache(self):
        """Load cache from local file"""
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    self._cache = json.load(f)
                print(f"[Cache] Loaded {self._cache.get('total_articles', 0)} articles from local cache")
            else:
                self._cache = DEFAULT_CACHE.copy()
                self._cache['metadata']['created_at'] = datetime.now().isoformat()
                self._save_local()
                print("[Cache] Created new cache file")
        except Exception as e:
            print(f"[Cache] Error loading cache: {e}")
            self._cache = DEFAULT_CACHE.copy()
    
    def _save_local(self):
        """Save cache to local file"""
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self._cache, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"[Cache] Error saving local cache: {e}")
            return False
    
    def set_supabase(self, supabase_client):
        """Set the Supabase client for cloud sync"""
        self._supabase = supabase_client
        # Try to create bucket if it doesn't exist
        try:
            buckets = self._supabase.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            if self._bucket_name not in bucket_names:
                self._supabase.storage.create_bucket(self._bucket_name, {"public": True})
                print(f"[Cache] Created Supabase bucket: {self._bucket_name}")
        except Exception as e:
            print(f"[Cache] Note: Could not setup bucket (may already exist): {e}")
    
    def sync_to_supabase(self) -> bool:
        """Upload cache to Supabase storage"""
        if not self._supabase:
            print("[Cache] Supabase client not set, skipping cloud sync")
            return False
        
        try:
            cache_json = json.dumps(self._cache, ensure_ascii=False)
            # Upload to Supabase Storage
            self._supabase.storage.from_(self._bucket_name).upload(
                "news_cache.json",
                cache_json.encode('utf-8'),
                {"content-type": "application/json", "upsert": "true"}
            )
            print("[Cache] Synced to Supabase storage")
            return True
        except Exception as e:
            # Try update if file exists
            try:
                self._supabase.storage.from_(self._bucket_name).update(
                    "news_cache.json",
                    cache_json.encode('utf-8'),
                    {"content-type": "application/json"}
                )
                print("[Cache] Updated in Supabase storage")
                return True
            except Exception as e2:
                print(f"[Cache] Error syncing to Supabase: {e2}")
                return False
    
    def sync_from_supabase(self) -> bool:
        """Download cache from Supabase storage"""
        if not self._supabase:
            return False
        
        try:
            response = self._supabase.storage.from_(self._bucket_name).download("news_cache.json")
            self._cache = json.loads(response.decode('utf-8'))
            self._save_local()
            print(f"[Cache] Loaded {self._cache.get('total_articles', 0)} articles from Supabase")
            return True
        except Exception as e:
            print(f"[Cache] Could not load from Supabase: {e}")
            return False
    
    def get_articles(self, category: str = None) -> List[Dict]:
        """Get articles from cache"""
        if category and category in self._cache.get('categories', {}):
            return self._cache['categories'][category]
        
        # Return all articles combined
        all_articles = []
        for cat_articles in self._cache.get('categories', {}).values():
            all_articles.extend(cat_articles)
        return all_articles
    
    def update_category(self, category: str, articles: List[Dict]):
        """Update articles for a specific category"""
        if 'categories' not in self._cache:
            self._cache['categories'] = {}
        self._cache['categories'][category] = articles
        self._update_metadata()
    
    def update_all(self, categories_data: Dict[str, List[Dict]]):
        """Update all categories at once"""
        self._cache['categories'] = categories_data
        self._update_metadata()
    
    def _update_metadata(self):
        """Update cache metadata"""
        total = sum(len(articles) for articles in self._cache.get('categories', {}).values())
        self._cache['total_articles'] = total
        self._cache['last_updated'] = datetime.now().isoformat()
        self._cache['metadata']['refresh_count'] = self._cache['metadata'].get('refresh_count', 0) + 1
    
    def save(self, sync_cloud: bool = True):
        """Save cache locally and optionally to cloud"""
        self._save_local()
        if sync_cloud:
            self.sync_to_supabase()
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        category_counts = {
            cat: len(articles) 
            for cat, articles in self._cache.get('categories', {}).items()
        }
        return {
            "last_updated": self._cache.get('last_updated'),
            "last_refresh_duration": self._cache.get('last_refresh_duration', 0),
            "total_articles": self._cache.get('total_articles', 0),
            "category_counts": category_counts,
            "metadata": self._cache.get('metadata', {}),
            "cache_file": CACHE_FILE,
            "cache_size_kb": round(os.path.getsize(CACHE_FILE) / 1024, 2) if os.path.exists(CACHE_FILE) else 0
        }
    
    def set_refresh_duration(self, duration: float):
        """Set the last refresh duration"""
        self._cache['last_refresh_duration'] = round(duration, 2)
    
    def is_stale(self, max_age_minutes: int = 30) -> bool:
        """Check if cache is stale"""
        last_updated = self._cache.get('last_updated')
        if not last_updated:
            return True
        
        try:
            last_time = datetime.fromisoformat(last_updated)
            age = (datetime.now() - last_time).total_seconds() / 60
            return age > max_age_minutes
        except:
            return True
    
    def clear(self):
        """Clear all cached articles"""
        self._cache = DEFAULT_CACHE.copy()
        self._cache['metadata']['created_at'] = datetime.now().isoformat()
        self._save_local()

    def increment_version(self):
        """Increment the feed version to force client refresh"""
        self._cache['feed_version'] = self._cache.get('feed_version', 1) + 1
        self._save_local()
    
    def get_version(self) -> int:
        """Get current feed version"""
        return self._cache.get('feed_version', 1)


# Global cache instance
news_cache = NewsCache()
