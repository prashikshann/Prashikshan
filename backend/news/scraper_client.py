"""
Scraper Service Client - Calls the HuggingFace Spaces Playwright scraper
"""
import os
import requests
from typing import Optional, Dict, List

SCRAPER_SERVICE_URL = os.getenv("SCRAPER_SERVICE_URL", "")
SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY", "prashikshan-scraper-key")

def is_scraper_available() -> bool:
    """Check if the scraper service is configured and available"""
    if not SCRAPER_SERVICE_URL:
        return False
    try:
        response = requests.get(f"{SCRAPER_SERVICE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def scrape_url_with_playwright(url: str, wait_selector: str = None, timeout: int = 30000) -> Optional[Dict]:
    """Scrape a URL using the Playwright service"""
    if not SCRAPER_SERVICE_URL:
        print("[Scraper] Service URL not configured")
        return None
    
    try:
        response = requests.post(
            f"{SCRAPER_SERVICE_URL}/scrape",
            headers={"X-API-Key": SCRAPER_API_KEY},
            json={
                "url": url,
                "wait_selector": wait_selector,
                "timeout": timeout
            },
            timeout=60
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"[Scraper] Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"[Scraper] Request failed: {e}")
        return None

def get_og_image_with_playwright(url: str) -> Optional[str]:
    """Get Open Graph image from a URL using Playwright"""
    if not SCRAPER_SERVICE_URL:
        return None
    
    try:
        response = requests.post(
            f"{SCRAPER_SERVICE_URL}/scrape/og-image",
            headers={"X-API-Key": SCRAPER_API_KEY},
            json={"url": url},
            timeout=20
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                return data.get("image")
        return None
    except Exception as e:
        print(f"[Scraper] OG image request failed: {e}")
        return None

def scrape_news_source(source: str) -> List[Dict]:
    """Scrape news from a specific source using Playwright"""
    if not SCRAPER_SERVICE_URL:
        return []
    
    try:
        response = requests.get(
            f"{SCRAPER_SERVICE_URL}/scrape/news/{source}",
            headers={"X-API-Key": SCRAPER_API_KEY},
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "error" not in data:
                return data.get("articles", [])
        return []
    except Exception as e:
        print(f"[Scraper] News scrape failed: {e}")
        return []

def batch_scrape_urls(urls: List[str]) -> List[Dict]:
    """Scrape multiple URLs in batch"""
    if not SCRAPER_SERVICE_URL or not urls:
        return []
    
    try:
        response = requests.post(
            f"{SCRAPER_SERVICE_URL}/scrape/batch",
            headers={"X-API-Key": SCRAPER_API_KEY},
            json={"urls": urls[:10]},  # Limit to 10
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        return []
    except Exception as e:
        print(f"[Scraper] Batch scrape failed: {e}")
        return []
