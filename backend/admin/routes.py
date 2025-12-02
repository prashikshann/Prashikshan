"""
Admin Routes - System administration endpoints
"""
import os
import time
import threading
from datetime import datetime
from functools import wraps
from flask import Blueprint, jsonify, request

from .cache import news_cache

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# Simple admin key authentication (in production, use proper auth)
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "123456")

# Admin settings (can be controlled via admin panel)
_settings = {
    "playwright_enabled": True,  # Default: enabled
    "articles_limit_per_category": 10  # Default: 10 articles per source/category
}

def require_admin(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('X-Admin-Key') or request.args.get('admin_key')
        if auth_header != ADMIN_KEY:
            return jsonify({"error": "Unauthorized", "message": "Invalid admin key"}), 401
        return f(*args, **kwargs)
    return decorated

def is_playwright_enabled():
    """Check if Playwright scraping is enabled"""
    return _settings.get("playwright_enabled", True)

def get_articles_limit():
    """Get the configured articles per category limit"""
    return _settings.get("articles_limit_per_category", 10)

# Store for background job status
_refresh_status = {
    "is_running": False,
    "started_at": None,
    "progress": 0,
    "current_task": None,
    "last_error": None
}

@admin_bp.route('/health', methods=['GET'])
def admin_health():
    """Check admin endpoint health (no auth required)"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "cache_initialized": news_cache is not None
    })

@admin_bp.route('/settings', methods=['GET'])
@require_admin
def get_settings():
    """Get current admin settings"""
    return jsonify({
        "success": True,
        "settings": _settings
    })

@admin_bp.route('/settings/playwright', methods=['POST'])
@require_admin
def toggle_playwright():
    """Toggle Playwright scraping on/off"""
    data = request.get_json() or {}
    enabled = data.get('enabled')
    
    if enabled is None:
        # Toggle if no value provided
        _settings["playwright_enabled"] = not _settings["playwright_enabled"]
    else:
        _settings["playwright_enabled"] = bool(enabled)
    
    return jsonify({
        "success": True,
        "playwright_enabled": _settings["playwright_enabled"],
        "message": f"Playwright scraping {'enabled' if _settings['playwright_enabled'] else 'disabled'}"
    })

@admin_bp.route('/settings/articles-limit', methods=['POST'])
@require_admin
def set_articles_limit():
    """Set the number of articles to scrape per category"""
    data = request.get_json() or {}
    limit = data.get('limit')
    
    if limit is None:
        return jsonify({"error": "limit is required"}), 400
    
    try:
        limit = int(limit)
        if limit < 1 or limit > 50:
            return jsonify({"error": "limit must be between 1 and 50"}), 400
        
        _settings["articles_limit_per_category"] = limit
        return jsonify({
            "success": True,
            "articles_limit_per_category": limit,
            "message": f"Articles limit set to {limit} per category"
        })
    except ValueError:
        return jsonify({"error": "limit must be a number"}), 400

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """Verify admin credentials"""
    data = request.get_json() or {}
    key = data.get('admin_key') or request.headers.get('X-Admin-Key')
    
    if key == ADMIN_KEY:
        return jsonify({
            "success": True,
            "message": "Admin authenticated",
            "timestamp": datetime.now().isoformat()
        })
    return jsonify({"success": False, "message": "Invalid admin key"}), 401

@admin_bp.route('/stats', methods=['GET'])
@require_admin
def get_stats():
    """Get system statistics"""
    cache_stats = news_cache.get_stats()
    
    return jsonify({
        "cache": cache_stats,
        "refresh_status": _refresh_status,
        "system": {
            "timestamp": datetime.now().isoformat(),
            "cache_stale": news_cache.is_stale()
        }
    })

@admin_bp.route('/cache/stats', methods=['GET'])
@require_admin
def get_cache_stats():
    """Get detailed cache statistics"""
    return jsonify(news_cache.get_stats())

@admin_bp.route('/cache/articles', methods=['GET'])
@require_admin
def get_cached_articles():
    """Get all cached articles with optional category filter"""
    category = request.args.get('category')
    limit = request.args.get('limit', type=int, default=100)
    
    articles = news_cache.get_articles(category)
    
    return jsonify({
        "category": category or "all",
        "count": len(articles),
        "articles": articles[:limit],
        "total_available": len(articles)
    })

@admin_bp.route('/cache/clear', methods=['POST'])
@require_admin
def clear_cache():
    """Clear all cached articles"""
    news_cache.clear()
    return jsonify({
        "success": True,
        "message": "Cache cleared",
        "timestamp": datetime.now().isoformat()
    })

@admin_bp.route('/news/refresh', methods=['POST'])
@require_admin
def refresh_news():
    """Trigger a news refresh (runs in background)"""
    global _refresh_status
    
    if _refresh_status["is_running"]:
        return jsonify({
            "success": False,
            "message": "Refresh already in progress",
            "status": _refresh_status
        }), 409
    
    # Get options from request
    data = request.get_json() or {}
    sync_cloud = data.get('sync_cloud', True)
    categories = data.get('categories', None)  # None = all categories
    
    def run_refresh():
        global _refresh_status
        _refresh_status = {
            "is_running": True,
            "started_at": datetime.now().isoformat(),
            "progress": 0,
            "current_task": "Initializing...",
            "last_error": None
        }
        
        start_time = time.time()
        
        try:
            # Import scrapers here to avoid circular imports
            from news.scraper import (
                get_all_tech_news, get_all_education_news, get_career_news,
                get_ai_ml_news, get_startup_news, get_developer_content,
                scrape_github_trending, get_general_trends
            )
            
            scrapers = {
                'tech': ('Technology', get_all_tech_news),
                'education': ('Education', get_all_education_news),
                'career': ('Career', get_career_news),
                'ai_ml': ('AI & ML', get_ai_ml_news),
                'startups': ('Startups', get_startup_news),
                'developer': ('Developer', get_developer_content),
                'github': ('GitHub Trending', scrape_github_trending),
                'general': ('General', get_general_trends),
            }
            
            # Filter categories if specified
            if categories:
                scrapers = {k: v for k, v in scrapers.items() if k in categories}
            
            total = len(scrapers)
            completed = 0
            
            for cat_key, (cat_name, scraper_func) in scrapers.items():
                try:
                    _refresh_status["current_task"] = f"Scraping {cat_name}..."
                    print(f"[Admin] Refreshing {cat_name}...")
                    
                    articles = scraper_func()
                    news_cache.update_category(cat_key, articles)
                    
                    completed += 1
                    _refresh_status["progress"] = int((completed / total) * 100)
                    print(f"[Admin] {cat_name}: {len(articles)} articles")
                    
                except Exception as e:
                    print(f"[Admin] Error scraping {cat_name}: {e}")
                    _refresh_status["last_error"] = f"Error in {cat_name}: {str(e)}"
            
            # Save cache
            _refresh_status["current_task"] = "Saving cache..."
            duration = time.time() - start_time
            news_cache.set_refresh_duration(duration)
            news_cache.save(sync_cloud=sync_cloud)
            
            _refresh_status["current_task"] = "Completed"
            _refresh_status["progress"] = 100
            print(f"[Admin] Refresh completed in {duration:.2f}s")
            
        except Exception as e:
            _refresh_status["last_error"] = str(e)
            print(f"[Admin] Refresh failed: {e}")
        finally:
            _refresh_status["is_running"] = False
    
    # Run in background thread
    thread = threading.Thread(target=run_refresh, daemon=True)
    thread.start()
    
    return jsonify({
        "success": True,
        "message": "News refresh started",
        "status": _refresh_status
    })

@admin_bp.route('/news/refresh/status', methods=['GET'])
@require_admin
def get_refresh_status():
    """Get current refresh status"""
    return jsonify(_refresh_status)

@admin_bp.route('/news/force-update', methods=['POST'])
@require_admin
def force_feed_update():
    """Force all clients to reload feed by incrementing cache version"""
    # This increments the version which clients will check
    news_cache.increment_version()
    news_cache.save(sync_cloud=True)
    
    return jsonify({
        "success": True,
        "message": "Feed version updated - all clients will reload",
        "new_version": news_cache.get_version(),
        "timestamp": datetime.now().isoformat()
    })

@admin_bp.route('/cloud/sync', methods=['POST'])
@require_admin
def sync_to_cloud():
    """Manually sync cache to Supabase"""
    success = news_cache.sync_to_supabase()
    return jsonify({
        "success": success,
        "message": "Synced to cloud" if success else "Sync failed",
        "timestamp": datetime.now().isoformat()
    })

@admin_bp.route('/cloud/load', methods=['POST'])
@require_admin
def load_from_cloud():
    """Load cache from Supabase"""
    success = news_cache.sync_from_supabase()
    return jsonify({
        "success": success,
        "message": "Loaded from cloud" if success else "Load failed",
        "stats": news_cache.get_stats() if success else None
    })

# Dashboard data endpoint
@admin_bp.route('/dashboard', methods=['GET'])
@require_admin
def get_dashboard_data():
    """Get all dashboard data in one call"""
    cache_stats = news_cache.get_stats()
    
    # Get sample articles from each category
    samples = {}
    for category in ['tech', 'education', 'career', 'ai_ml', 'startups']:
        articles = news_cache.get_articles(category)
        samples[category] = articles[:3] if articles else []
    
    return jsonify({
        "cache_stats": cache_stats,
        "refresh_status": _refresh_status,
        "article_samples": samples,
        "is_cache_stale": news_cache.is_stale(),
        "timestamp": datetime.now().isoformat()
    })
