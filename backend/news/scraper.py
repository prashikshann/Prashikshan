import requests
from bs4 import BeautifulSoup
from flask import Blueprint, jsonify, request
import re
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import json
import traceback
import logging
import urllib3
import random

# Suppress SSL warnings for sites with bad certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Import HF Spaces Playwright scraper client
from .scraper_client import (
    is_scraper_available, 
    scrape_url_with_playwright, 
    get_og_image_with_playwright,
    scrape_news_source
)

# Import admin settings
from admin import is_playwright_enabled, get_articles_limit, get_sort_order, get_source_priority

# Setup logging for better debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a Blueprint for news/trends routes
news_bp = Blueprint('news', __name__)

# Common headers for requests
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

# Debug mode - set to True for verbose logging
DEBUG_MODE = True

def debug_log(source, message, error=None):
    """Helper function for consistent debug logging"""
    if DEBUG_MODE:
        if error:
            logger.error(f"[{source}] {message}")
            logger.error(f"[{source}] Error details: {str(error)}")
            logger.error(f"[{source}] Traceback: {traceback.format_exc()}")
        else:
            logger.info(f"[{source}] {message}")

# Source-based placeholder images (used when no image is found)
SOURCE_PLACEHOLDER_IMAGES = {
    'techcrunch': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
    'hacker news': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop',
    'dev.to': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop',
    'github': 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&h=300&fit=crop',
    'product hunt': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop',
    'the verge': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
    'wired': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop',
    'ars technica': 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&h=300&fit=crop',
    'bbc': 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=400&h=300&fit=crop',
    'ndtv': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
    'reddit': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
    'medium': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop',
}

CATEGORY_PLACEHOLDER_IMAGES = {
    'tech': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
    'education': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
    'career': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
    'ai': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
    'startup': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop',
    'developer': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop',
    'github': 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&h=300&fit=crop',
    'reddit': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
    'general': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=300&fit=crop',
}

def sort_articles(articles: list) -> list:
    """Sort articles based on admin settings"""
    sort_order = get_sort_order()
    
    if sort_order == "random":
        random.shuffle(articles)
        return articles
    
    elif sort_order == "time":
        # Sort by timestamp if available, newest first
        def get_time_key(article):
            ts = article.get('timestamp', '')
            if ts:
                try:
                    return datetime.fromisoformat(ts.replace('Z', '+00:00'))
                except:
                    pass
            return datetime.min
        return sorted(articles, key=get_time_key, reverse=True)
    
    else:  # "priority" - default
        priority_list = get_source_priority()
        
        def get_priority(article):
            source = article.get('source', '')
            # Check for partial match (case-insensitive)
            for i, p_source in enumerate(priority_list):
                if p_source.lower() in source.lower() or source.lower() in p_source.lower():
                    return i
            return len(priority_list)  # Unknown sources go to end
        
        return sorted(articles, key=get_priority)

def get_placeholder_image(source: str, category: str = 'general') -> str:
    """Get a placeholder image based on source or category"""
    source_lower = source.lower()
    for key, url in SOURCE_PLACEHOLDER_IMAGES.items():
        if key in source_lower:
            return url
    return CATEGORY_PLACEHOLDER_IMAGES.get(category, CATEGORY_PLACEHOLDER_IMAGES['general'])

def extract_og_image(url: str, timeout: int = 3) -> str:
    """Try to extract Open Graph image from a URL (quick, with short timeout)"""
    try:
        # Disable SSL verification for image extraction (some sites have bad certs)
        response = requests.get(url, headers=HEADERS, timeout=timeout, verify=False)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try Open Graph image
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            return og_image.get('content')
        
        # Try Twitter card image
        twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
        if twitter_image and twitter_image.get('content'):
            return twitter_image.get('content')
        
        return None
    except:
        return None

# ============================================
# RSS FEED SCRAPERS (No API Keys Required)
# ============================================

def scrape_google_news(query="technology trends", num_articles=10):
    """Scrape news from Google News RSS feed"""
    try:
        url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        debug_log("Google News", f"Fetching: {url}")
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        debug_log("Google News", f"Response status: {response.status_code}, size: {len(response.content)} bytes")
        
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')[:num_articles]
        debug_log("Google News", f"Found {len(items)} items for query '{query}'")
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link = item.find('link').text if item.find('link') else '#'
            pub_date = item.find('pubDate').text if item.find('pubDate') else 'Unknown Date'
            source = item.find('source').text if item.find('source') else 'Google News'
            
            title = re.sub(r'\s*-\s*[^-]+$', '', title)
            
            # Try to get image from media:content or enclosure
            image = None
            media = item.find('media:content')
            if media and media.get('url'):
                image = media.get('url')
            if not image:
                enclosure = item.find('enclosure')
                if enclosure and enclosure.get('url'):
                    image = enclosure.get('url')
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': source,
                'category': 'general',
                'image': image  # Frontend will use placeholder if None
            })
        
        debug_log("Google News", f"Scraped {len(articles)} articles for '{query}'")
        return articles
    except requests.exceptions.Timeout:
        debug_log("Google News", f"TIMEOUT for query '{query}'")
        return []
    except Exception as e:
        debug_log("Google News", f"Failed for query '{query}'", e)
        return []

def scrape_techcrunch():
    """Scrape TechCrunch RSS feed"""
    try:
        url = "https://techcrunch.com/feed/"
        debug_log("TechCrunch", f"Fetching: {url}")
        response = requests.get(url, headers=HEADERS, timeout=10)
        debug_log("TechCrunch", f"Response status: {response.status_code}")
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')[:8]
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link = item.find('link').text if item.find('link') else '#'
            pub_date = item.find('pubDate').text if item.find('pubDate') else 'Unknown Date'
            description = item.find('description').text if item.find('description') else ''
            
            # Try to get image from RSS media:content first
            image = None
            media = item.find('media:content')
            if media and media.get('url'):
                image = media.get('url')
            
            # If no image in RSS, try media:thumbnail
            if not image:
                media_thumb = item.find('media:thumbnail')
                if media_thumb and media_thumb.get('url'):
                    image = media_thumb.get('url')
            
            # If still no image, try to extract from the description HTML
            if not image and description:
                desc_soup = BeautifulSoup(description, 'html.parser')
                img_tag = desc_soup.find('img')
                if img_tag and img_tag.get('src'):
                    image = img_tag.get('src')
            
            clean_desc = BeautifulSoup(description, 'html.parser').get_text()[:200] + '...' if description else ''
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': 'TechCrunch',
                'category': 'tech',
                'description': clean_desc,
                'image': image
            })
        
        # For articles without images, fetch from article page (parallel)
        def fetch_article_image(article):
            if not article['image'] and article['link'] != '#':
                try:
                    debug_log("TechCrunch", f"Fetching image from: {article['link']}")
                    resp = requests.get(article['link'], headers=HEADERS, timeout=5)
                    page_soup = BeautifulSoup(resp.content, 'html.parser')
                    
                    # Try the specific TechCrunch image class: wp-post-image inside figure
                    wp_img = page_soup.select_one('figure img.wp-post-image')
                    if wp_img and wp_img.get('src'):
                        article['image'] = wp_img.get('src')
                        debug_log("TechCrunch", f"Found wp-post-image: {article['image'][:60]}...")
                        return
                    
                    # Try any figure img
                    figure_img = page_soup.select_one('figure img')
                    if figure_img and figure_img.get('src'):
                        article['image'] = figure_img.get('src')
                        debug_log("TechCrunch", f"Found figure img: {article['image'][:60]}...")
                        return
                    
                    # Try attachment-post-thumbnail class
                    thumb_img = page_soup.select_one('img.attachment-post-thumbnail')
                    if thumb_img and thumb_img.get('src'):
                        article['image'] = thumb_img.get('src')
                        debug_log("TechCrunch", f"Found thumbnail: {article['image'][:60]}...")
                        return
                    
                    # Try OG image as fallback
                    og_image = page_soup.find('meta', property='og:image')
                    if og_image and og_image.get('content'):
                        article['image'] = og_image.get('content')
                        debug_log("TechCrunch", f"Found OG image: {article['image'][:60]}...")
                except Exception as e:
                    debug_log("TechCrunch", f"Failed to fetch image from {article['link']}", e)
        
        # Fetch images for ALL articles missing them
        articles_without_images = [a for a in articles if not a['image']]
        debug_log("TechCrunch", f"{len(articles_without_images)} articles need image fetching")
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            executor.map(fetch_article_image, articles_without_images)
        
        debug_log("TechCrunch", f"Scraped {len(articles)} articles, {sum(1 for a in articles if a['image'])} with images")
        return articles
    except Exception as e:
        debug_log("TechCrunch", "Failed to scrape", e)
        return []

def scrape_hackernews():
    """Scrape Hacker News (Y Combinator) - Top stories"""
    try:
        # Hacker News has a free API
        top_stories_url = "https://hacker-news.firebaseio.com/v0/topstories.json"
        debug_log("HackerNews", f"Fetching top stories...")
        response = requests.get(top_stories_url, timeout=10)
        story_ids = response.json()[:10]
        debug_log("HackerNews", f"Got {len(story_ids)} story IDs")
        
        articles = []
        for story_id in story_ids:
            story_url = f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
            story_response = requests.get(story_url, timeout=5)
            story = story_response.json()
            
            if story and story.get('title'):
                article_url = story.get('url', f"https://news.ycombinator.com/item?id={story_id}")
                articles.append({
                    'title': story.get('title', 'No Title'),
                    'link': article_url,
                    'published': datetime.fromtimestamp(story.get('time', 0)).strftime('%a, %d %b %Y'),
                    'source': 'Hacker News',
                    'category': 'tech',
                    'score': story.get('score', 0),
                    'comments': story.get('descendants', 0),
                    'image': None,
                    '_story_id': story_id  # Keep for reference
                })
        
        # Fetch OG images from linked articles in parallel
        def fetch_og_image(article):
            if article['link'] and not article['link'].startswith('https://news.ycombinator.com'):
                try:
                    debug_log("HackerNews", f"Fetching OG image from: {article['link'][:50]}...")
                    resp = requests.get(article['link'], headers=HEADERS, timeout=4)
                    page_soup = BeautifulSoup(resp.content, 'html.parser')
                    
                    # Try OG image first (most reliable)
                    og_image = page_soup.find('meta', property='og:image')
                    if og_image and og_image.get('content'):
                        img_url = og_image.get('content')
                        # Make sure it's an absolute URL
                        if img_url.startswith('//'):
                            img_url = 'https:' + img_url
                        elif img_url.startswith('/'):
                            # Extract domain from article link
                            from urllib.parse import urlparse
                            parsed = urlparse(article['link'])
                            img_url = f"{parsed.scheme}://{parsed.netloc}{img_url}"
                        article['image'] = img_url
                        debug_log("HackerNews", f"Found OG image for '{article['title'][:30]}...'")
                        return
                    
                    # Try Twitter card image
                    twitter_image = page_soup.find('meta', attrs={'name': 'twitter:image'})
                    if twitter_image and twitter_image.get('content'):
                        article['image'] = twitter_image.get('content')
                        return
                    
                    # Try first large image in the page
                    for img in page_soup.find_all('img'):
                        src = img.get('src', '')
                        width = img.get('width', '')
                        if src and (int(width) > 200 if width.isdigit() else True):
                            if not any(skip in src.lower() for skip in ['logo', 'icon', 'avatar', 'badge', 'button']):
                                if src.startswith('//'):
                                    src = 'https:' + src
                                article['image'] = src
                                return
                                
                except Exception as e:
                    debug_log("HackerNews", f"Failed to get image for {article['link'][:40]}", e)
        
        debug_log("HackerNews", f"Fetching images for {len(articles)} articles...")
        with ThreadPoolExecutor(max_workers=5) as executor:
            executor.map(fetch_og_image, articles)
        
        # Remove internal reference
        for article in articles:
            article.pop('_story_id', None)
        
        debug_log("HackerNews", f"Scraped {len(articles)} articles, {sum(1 for a in articles if a['image'])} with images")
        return articles
    except Exception as e:
        debug_log("HackerNews", "Failed to scrape", e)
        return []

def scrape_dev_to():
    """Scrape Dev.to articles - Great for developer content"""
    try:
        url = "https://dev.to/api/articles?per_page=10&top=7"
        response = requests.get(url, headers=HEADERS, timeout=10)
        data = response.json()
        
        articles = []
        for item in data:
            articles.append({
                'title': item.get('title', 'No Title'),
                'link': item.get('url', '#'),
                'published': item.get('published_at', 'Unknown Date'),
                'source': 'Dev.to',
                'category': 'tech',
                'description': item.get('description', '')[:200],
                'image': item.get('cover_image') or item.get('social_image'),
                'tags': item.get('tag_list', []),
                'reactions': item.get('positive_reactions_count', 0)
            })
        
        debug_log("Dev.to", f"Successfully scraped {len(articles)} articles")
        return articles
    except Exception as e:
        debug_log("Dev.to", "Failed to scrape", e)
        return []

def scrape_reddit(subreddit="technology", limit=10):
    """Scrape Reddit JSON API"""
    try:
        url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
        # Reddit requires a unique User-Agent, otherwise it returns 429 or empty response
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrashikshanBot/1.0 (Educational Project)',
            'Accept': 'application/json',
        }
        
        debug_log("Reddit", f"Fetching r/{subreddit} from {url}")
        response = requests.get(url, headers=headers, timeout=15)
        
        debug_log("Reddit", f"Response status: {response.status_code}")
        debug_log("Reddit", f"Response content type: {response.headers.get('content-type', 'unknown')}")
        
        # Check if response is valid
        if response.status_code != 200:
            debug_log("Reddit", f"Non-200 status code: {response.status_code}, Response: {response.text[:500]}")
            return []
        
        # Check if response is JSON
        content_type = response.headers.get('content-type', '')
        if 'application/json' not in content_type and 'text/json' not in content_type:
            debug_log("Reddit", f"Unexpected content type: {content_type}")
            debug_log("Reddit", f"Response body preview: {response.text[:500]}")
            return []
        
        try:
            data = response.json()
        except json.JSONDecodeError as json_err:
            debug_log("Reddit", f"JSON decode error. Response text: {response.text[:500]}", json_err)
            return []
        
        articles = []
        children = data.get('data', {}).get('children', [])
        debug_log("Reddit", f"Found {len(children)} posts in r/{subreddit}")
        
        for post in children:
            post_data = post.get('data', {})
            if not post_data.get('stickied'):  # Skip pinned posts
                articles.append({
                    'title': post_data.get('title', 'No Title'),
                    'link': f"https://reddit.com{post_data.get('permalink', '')}",
                    'published': datetime.fromtimestamp(post_data.get('created_utc', 0)).strftime('%a, %d %b %Y'),
                    'source': f"r/{subreddit}",
                    'category': 'reddit',
                    'score': post_data.get('score', 0),
                    'comments': post_data.get('num_comments', 0),
                    'image': post_data.get('thumbnail') if post_data.get('thumbnail', '').startswith('http') else None
                })
        
        debug_log("Reddit", f"Successfully scraped {len(articles)} articles from r/{subreddit}")
        return articles
    except requests.exceptions.Timeout:
        debug_log("Reddit", f"Timeout while fetching r/{subreddit}")
        return []
    except requests.exceptions.RequestException as req_err:
        debug_log("Reddit", f"Request error for r/{subreddit}", req_err)
        return []
    except Exception as e:
        debug_log("Reddit", f"Unexpected error scraping r/{subreddit}", e)
        return []

def scrape_producthunt():
    """Scrape Product Hunt - Uses Playwright if enabled and available"""
    # Try HF Spaces Playwright scraper first (JS-heavy site) - if enabled
    if is_playwright_enabled() and is_scraper_available():
        debug_log("Product Hunt", "Using HF Spaces Playwright scraper")
        try:
            articles = scrape_news_source("producthunt")
            if articles:
                debug_log("Product Hunt", f"Got {len(articles)} articles from Playwright")
                return articles
        except Exception as e:
            debug_log("Product Hunt", f"Playwright scraper failed, falling back to RSS", e)
    elif not is_playwright_enabled():
        debug_log("Product Hunt", "Playwright disabled, using RSS")
    
    # Fallback to RSS feed
    debug_log("Product Hunt", "Using RSS feed fallback")
    try:
        url = "https://www.producthunt.com/feed"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')[:10]
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link = item.find('link').text if item.find('link') else '#'
            pub_date = item.find('pubDate').text if item.find('pubDate') else 'Unknown Date'
            description = item.find('description').text if item.find('description') else ''
            
            clean_desc = BeautifulSoup(description, 'html.parser').get_text()[:200] if description else ''
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': 'Product Hunt',
                'category': 'products',
                'description': clean_desc,
                'image': None
            })
        
        return articles
    except Exception as e:
        print(f"Error scraping Product Hunt: {e}")
        return []

def scrape_github_trending():
    """Scrape GitHub Trending repositories"""
    try:
        url = "https://github.com/trending"
        debug_log("GitHub", f"Fetching: {url}")
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        repos = soup.select('article.Box-row')[:10]
        debug_log("GitHub", f"Found {len(repos)} trending repos")
        
        articles = []
        for repo in repos:
            title_elem = repo.select_one('h2 a')
            desc_elem = repo.select_one('p')
            stars_elem = repo.select_one('a.Link--muted')
            lang_elem = repo.select_one('[itemprop="programmingLanguage"]')
            avatar_elem = repo.select_one('img.avatar')
            
            if title_elem:
                repo_name = title_elem.get_text(strip=True).replace('\n', '').replace(' ', '')
                # Get owner avatar as image
                image = avatar_elem.get('src') if avatar_elem else None
                
                articles.append({
                    'title': repo_name,
                    'link': f"https://github.com{title_elem.get('href', '')}",
                    'published': 'Trending Today',
                    'source': 'GitHub Trending',
                    'category': 'github',
                    'description': desc_elem.get_text(strip=True) if desc_elem else '',
                    'language': lang_elem.get_text(strip=True) if lang_elem else 'Unknown',
                    'stars': stars_elem.get_text(strip=True) if stars_elem else '0',
                    'image': image
                })
        
        debug_log("GitHub", f"Scraped {len(articles)} repos")
        return articles
    except Exception as e:
        debug_log("GitHub", "Failed to scrape", e)
        return []

def scrape_medium_tags(tag="technology"):
    """Scrape Medium - Uses Playwright if enabled and available"""
    # Try HF Spaces Playwright scraper first (JS-heavy site) - if enabled
    if is_playwright_enabled() and is_scraper_available():
        debug_log("Medium", "Using HF Spaces Playwright scraper")
        try:
            articles = scrape_news_source("medium")
            if articles:
                debug_log("Medium", f"Got {len(articles)} articles from Playwright")
                return articles
        except Exception as e:
            debug_log("Medium", f"Playwright scraper failed, falling back to RSS", e)
    elif not is_playwright_enabled():
        debug_log("Medium", "Playwright disabled, using RSS")
    
    # Fallback to RSS feed
    debug_log("Medium", "Using RSS feed fallback")
    try:
        url = f"https://medium.com/feed/tag/{tag}"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')[:8]
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link = item.find('link').text if item.find('link') else '#'
            pub_date = item.find('pubDate').text if item.find('pubDate') else 'Unknown Date'
            creator = item.find('dc:creator').text if item.find('dc:creator') else 'Unknown Author'
            
            # Extract image from content
            content = item.find('content:encoded')
            image = None
            if content:
                content_soup = BeautifulSoup(content.text, 'html.parser')
                img = content_soup.find('img')
                if img:
                    image = img.get('src')
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': f'Medium - {creator}',
                'category': 'articles',
                'image': image
            })
        
        return articles
    except Exception as e:
        print(f"Error scraping Medium: {e}")
        return []

def scrape_bbc_news():
    """Scrape BBC News RSS feed"""
    try:
        url = "https://feeds.bbci.co.uk/news/technology/rss.xml"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')[:8]
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link = item.find('link').text if item.find('link') else '#'
            pub_date = item.find('pubDate').text if item.find('pubDate') else 'Unknown Date'
            description = item.find('description').text if item.find('description') else ''
            
            # BBC includes thumbnail in media:thumbnail
            image = None
            media = item.find('media:thumbnail')
            if media:
                image = media.get('url')
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': 'BBC News',
                'category': 'news',
                'description': description[:200] if description else '',
                'image': image
            })
        
        return articles
    except Exception as e:
        print(f"Error scraping BBC News: {e}")
        return []

def scrape_wired():
    """Scrape Wired RSS feed"""
    try:
        url = "https://www.wired.com/feed/rss"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')[:8]
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link = item.find('link').text if item.find('link') else '#'
            pub_date = item.find('pubDate').text if item.find('pubDate') else 'Unknown Date'
            description = item.find('description').text if item.find('description') else ''
            
            image = None
            media = item.find('media:thumbnail')
            if media:
                image = media.get('url')
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': 'Wired',
                'category': 'tech',
                'description': BeautifulSoup(description, 'html.parser').get_text()[:200] if description else '',
                'image': image
            })
        
        return articles
    except Exception as e:
        print(f"Error scraping Wired: {e}")
        return []

def scrape_ars_technica():
    """Scrape Ars Technica RSS feed"""
    try:
        url = "https://feeds.arstechnica.com/arstechnica/index"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')[:8]
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link = item.find('link').text if item.find('link') else '#'
            pub_date = item.find('pubDate').text if item.find('pubDate') else 'Unknown Date'
            description = item.find('description').text if item.find('description') else ''
            
            # Try to extract image from media:content or content
            image = None
            media = item.find('media:content')
            if media and media.get('url'):
                image = media.get('url')
            if not image:
                media_thumb = item.find('media:thumbnail')
                if media_thumb and media_thumb.get('url'):
                    image = media_thumb.get('url')
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': 'Ars Technica',
                'category': 'tech',
                'description': BeautifulSoup(description, 'html.parser').get_text()[:200] if description else '',
                'image': image
            })
        
        return articles
    except Exception as e:
        debug_log("Ars Technica", "Failed to scrape", e)
        return []

def scrape_the_verge():
    """Scrape The Verge RSS feed"""
    try:
        url = "https://www.theverge.com/rss/index.xml"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('entry')[:8]
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link_elem = item.find('link')
            link = link_elem.get('href') if link_elem else '#'
            pub_date = item.find('published').text if item.find('published') else 'Unknown Date'
            
            # Extract image from content
            content = item.find('content')
            image = None
            if content:
                content_soup = BeautifulSoup(content.text, 'html.parser')
                img = content_soup.find('img')
                if img:
                    image = img.get('src')
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': 'The Verge',
                'category': 'tech',
                'image': image
            })
        
        return articles
    except Exception as e:
        print(f"Error scraping The Verge: {e}")
        return []

def scrape_indian_education_news():
    """Scrape Indian Education News"""
    try:
        # NDTV Education RSS
        url = "https://feeds.feedburner.com/ndtvnews-education"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')[:8]
        
        articles = []
        for item in items:
            title = item.find('title').text if item.find('title') else 'No Title'
            link = item.find('link').text if item.find('link') else '#'
            pub_date = item.find('pubDate').text if item.find('pubDate') else 'Unknown Date'
            description = item.find('description').text if item.find('description') else ''
            
            # Try to extract image
            image = None
            media = item.find('media:content') or item.find('media:thumbnail')
            if media and media.get('url'):
                image = media.get('url')
            # Try from enclosure
            if not image:
                enclosure = item.find('enclosure')
                if enclosure and enclosure.get('url'):
                    image = enclosure.get('url')
            
            articles.append({
                'title': title,
                'link': link,
                'published': pub_date,
                'source': 'NDTV Education',
                'category': 'education',
                'description': BeautifulSoup(description, 'html.parser').get_text()[:200] if description else '',
                'image': image
            })
        
        return articles
    except Exception as e:
        print(f"Error scraping Indian Education News: {e}")
        return []

# ============================================
# PLAYWRIGHT SCRAPERS (For Dynamic Websites)
# ============================================

# Flag to check if Playwright is available
PLAYWRIGHT_AVAILABLE = False
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    print("Playwright not installed. Some scrapers will be disabled.")
    print("Install with: pip install playwright && playwright install chromium")

def scrape_with_playwright(url, selector, parse_func):
    """Generic Playwright scraper for dynamic websites"""
    if not PLAYWRIGHT_AVAILABLE:
        return []
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until='networkidle', timeout=30000)
            page.wait_for_selector(selector, timeout=10000)
            
            content = page.content()
            browser.close()
            
            return parse_func(content)
    except Exception as e:
        print(f"Playwright scraping error: {e}")
        return []

def scrape_linkedin_news():
    """Scrape LinkedIn News (requires Playwright for dynamic content)"""
    if not PLAYWRIGHT_AVAILABLE:
        # Fallback to Google News search for LinkedIn topics
        return scrape_google_news("linkedin careers jobs india", 6)
    
    def parse_linkedin(content):
        soup = BeautifulSoup(content, 'html.parser')
        articles = []
        # LinkedIn's structure changes frequently, this is a basic example
        news_items = soup.select('.news-module__headline')[:8]
        
        for item in news_items:
            articles.append({
                'title': item.get_text(strip=True),
                'link': item.get('href', '#'),
                'published': 'Today',
                'source': 'LinkedIn News',
                'category': 'careers',
                'image': None
            })
        
        return articles
    
    return scrape_with_playwright(
        "https://www.linkedin.com/news/",
        '.news-module__headline',
        parse_linkedin
    )

def scrape_twitter_trends():
    """Get Twitter/X trending topics (via Nitter - open source Twitter frontend)"""
    try:
        # Using Nitter instance for Twitter data (no auth required)
        url = "https://nitter.net/search?f=tweets&q=trending&since=&until=&near="
        response = requests.get(url, headers=HEADERS, timeout=10)
        
        if response.status_code != 200:
            # Fallback to Google News
            return scrape_google_news("twitter trending india", 6)
        
        soup = BeautifulSoup(response.content, 'html.parser')
        tweets = soup.select('.timeline-item')[:10]
        
        articles = []
        for tweet in tweets:
            content = tweet.select_one('.tweet-content')
            username = tweet.select_one('.username')
            
            if content:
                articles.append({
                    'title': content.get_text(strip=True)[:100] + '...',
                    'link': '#',
                    'published': 'Recent',
                    'source': f"@{username.get_text(strip=True)}" if username else 'Twitter',
                    'category': 'social',
                    'image': None
                })
        
        return articles if articles else scrape_google_news("twitter trending india", 6)
    except Exception as e:
        print(f"Error scraping Twitter trends: {e}")
        return scrape_google_news("social media trending india", 6)

# ============================================
# REFINED SEARCH QUERIES FOR BETTER RESULTS
# ============================================

# Predefined optimized queries for different categories
REFINED_QUERIES = {
    'tech': [
        'artificial intelligence machine learning 2024',
        'software development programming trends',
        'cybersecurity data privacy news',
        'cloud computing AWS Azure Google',
        'startup funding tech unicorn',
        'web development frontend backend',
        'mobile app development iOS Android',
    ],
    'education': [
        'online courses certification free',
        'skill development training programs india',
        'placement jobs campus recruitment',
        'competitive exams GATE CAT UPSC preparation',
        'scholarship opportunities students india',
        'internship opportunities freshers',
        'education policy NEP india updates',
        'coding bootcamp programming courses',
    ],
    'career': [
        'job openings hiring tech india',
        'remote work opportunities',
        'salary trends compensation packages',
        'career switch tips guidance',
        'interview preparation tips',
        'resume building linkedin profile',
        'freelancing gig economy',
    ],
    'finance': [
        'stock market sensex nifty news',
        'cryptocurrency bitcoin ethereum',
        'personal finance investment tips',
        'mutual funds SIP investing',
        'startup funding venture capital',
    ],
    'india': [
        'india technology news',
        'indian startups funding news',
        'digital india initiatives',
        'make in india manufacturing',
        'indian economy business news',
    ],
    'ai_ml': [
        'ChatGPT OpenAI Google Bard',
        'generative AI tools applications',
        'machine learning deep learning models',
        'AI automation jobs future',
        'computer vision NLP breakthroughs',
    ]
}

# ============================================
# AGGREGATED SCRAPERS WITH REFINED QUERIES
# ============================================

def get_all_tech_news():
    """Get tech news from all sources with refined queries"""
    all_articles = []
    debug_log("get_all_tech_news", "Starting tech news aggregation...")
    
    scrapers = [
        ("TechCrunch", scrape_techcrunch, []),
        ("HackerNews", scrape_hackernews, []),
        ("Dev.to", scrape_dev_to, []),
        ("TheVerge", scrape_the_verge, []),
        ("Wired", scrape_wired, []),
        ("ArsTechnica", scrape_ars_technica, []),
        ("BBC", scrape_bbc_news, []),
        ("Google-AI", scrape_google_news, ["AI artificial intelligence ChatGPT latest news", 5]),
        ("Google-Dev", scrape_google_news, ["software development programming trends 2024", 5]),
        ("Google-Cyber", scrape_google_news, ["cybersecurity hacking data breach news", 4]),
    ]
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_name = {}
        for name, func, args in scrapers:
            future = executor.submit(func, *args) if args else executor.submit(func)
            future_to_name[future] = name
        
        for future in future_to_name:
            name = future_to_name[future]
            try:
                articles = future.result(timeout=15)
                debug_log("get_all_tech_news", f"[{name}] returned {len(articles)} articles")
                all_articles.extend(articles)
            except TimeoutError:
                debug_log("get_all_tech_news", f"[{name}] TIMEOUT after 15s")
            except Exception as e:
                debug_log("get_all_tech_news", f"[{name}] FAILED", e)
    
    debug_log("get_all_tech_news", f"Total raw articles: {len(all_articles)}")
    
    # Remove duplicates based on title similarity
    seen_titles = set()
    unique_articles = []
    for article in all_articles:
        title_key = article['title'].lower()[:50]
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_articles.append(article)
    
    debug_log("get_all_tech_news", f"After dedup: {len(unique_articles)} articles")
    limit = get_articles_limit()
    sorted_articles = sort_articles(unique_articles)
    return sorted_articles[:limit]

def get_all_education_news():
    """Get education news from multiple refined queries"""
    all_articles = []
    debug_log("get_all_education_news", "Starting education news aggregation...")
    
    scrapers = [
        ("IndianEdu", scrape_indian_education_news, []),
        ("Google-Courses", scrape_google_news, ["online courses free certification Coursera Udemy", 6]),
        ("Google-Skills", scrape_google_news, ["skill development training india NSDC", 5]),
        ("Google-Placement", scrape_google_news, ["placement jobs campus recruitment freshers 2024", 5]),
        ("Google-Scholarship", scrape_google_news, ["scholarship students india 2024 eligibility", 4]),
        ("Google-Exams", scrape_google_news, ["competitive exams GATE CAT UPSC preparation tips", 4]),
        ("Google-Intern", scrape_google_news, ["internship opportunities students india tech", 4]),
        ("Google-Bootcamp", scrape_google_news, ["coding bootcamp learn programming india", 4]),
    ]
    
    with ThreadPoolExecutor(max_workers=6) as executor:
        future_to_name = {}
        for name, func, args in scrapers:
            future = executor.submit(func, *args) if args else executor.submit(func)
            future_to_name[future] = name
        
        for future in future_to_name:
            name = future_to_name[future]
            try:
                articles = future.result(timeout=15)
                debug_log("get_all_education_news", f"[{name}] returned {len(articles)} articles")
                all_articles.extend(articles)
            except TimeoutError:
                debug_log("get_all_education_news", f"[{name}] TIMEOUT after 15s")
            except Exception as e:
                debug_log("get_all_education_news", f"[{name}] FAILED", e)
    
    # Remove duplicates
    seen_titles = set()
    unique_articles = []
    for article in all_articles:
        title_key = article['title'].lower()[:50]
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_articles.append(article)
    
    debug_log("get_all_education_news", f"Returning {len(unique_articles)} unique articles")
    limit = get_articles_limit()
    sorted_articles = sort_articles(unique_articles)
    return sorted_articles[:limit]

def get_developer_content():
    """Get developer-focused content from multiple sources"""
    all_articles = []
    debug_log("get_developer_content", "Starting developer content aggregation...")
    
    scrapers = [
        ("Dev.to", scrape_dev_to, []),
        ("HackerNews", scrape_hackernews, []),
        ("GitHub", scrape_github_trending, []),
        ("Google-WebDev", scrape_google_news, ["web development react angular vue javascript", 5]),
        ("Google-Python", scrape_google_news, ["python programming tutorials tips tricks", 4]),
        ("Google-Tools", scrape_google_news, ["developer tools productivity coding", 4]),
    ]
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_name = {}
        for name, func, args in scrapers:
            future = executor.submit(func, *args) if args else executor.submit(func)
            future_to_name[future] = name
        
        for future in future_to_name:
            name = future_to_name[future]
            try:
                articles = future.result(timeout=15)
                debug_log("get_developer_content", f"[{name}] returned {len(articles)} articles")
                all_articles.extend(articles)
            except TimeoutError:
                debug_log("get_developer_content", f"[{name}] TIMEOUT after 15s")
            except Exception as e:
                debug_log("get_developer_content", f"[{name}] FAILED", e)
    
    debug_log("get_developer_content", f"Returning {len(all_articles)} articles")
    limit = get_articles_limit()
    sorted_articles = sort_articles(all_articles)
    return sorted_articles[:limit]

def get_career_news():
    """Get career and job-related news"""
    all_articles = []
    debug_log("get_career_news", "Starting career news aggregation...")
    
    scrapers = [
        ("Google-Jobs", scrape_google_news, ["job openings hiring tech india bangalore hyderabad", 6]),
        ("Google-Remote", scrape_google_news, ["remote work jobs opportunities work from home", 5]),
        ("Google-Salary", scrape_google_news, ["salary hike increment appraisal trends india", 4]),
        ("Google-Interview", scrape_google_news, ["interview preparation tips tech companies", 4]),
        ("Google-Layoffs", scrape_google_news, ["layoffs hiring freeze tech industry news", 4]),
        ("Google-LinkedIn", scrape_google_news, ["linkedin career tips professional networking", 4]),
        ("Reddit-CS", scrape_reddit, ["cscareerquestions", 8]),
    ]
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_name = {}
        for name, func, args in scrapers:
            future = executor.submit(func, *args)
            future_to_name[future] = name
        
        for future in future_to_name:
            name = future_to_name[future]
            try:
                articles = future.result(timeout=15)
                debug_log("get_career_news", f"[{name}] returned {len(articles)} articles")
                all_articles.extend(articles)
            except TimeoutError:
                debug_log("get_career_news", f"[{name}] TIMEOUT after 15s")
            except Exception as e:
                debug_log("get_career_news", f"[{name}] FAILED", e)
    
    debug_log("get_career_news", f"Returning {len(all_articles)} articles")
    limit = get_articles_limit()
    sorted_articles = sort_articles(all_articles)
    return sorted_articles[:limit]
    

def get_ai_ml_news():
    """Get AI and Machine Learning specific news"""
    all_articles = []
    debug_log("get_ai_ml_news", "Starting AI/ML news aggregation...")
    
    scrapers = [
        ("Google-ChatGPT", scrape_google_news, ["ChatGPT OpenAI GPT-4 latest updates features", 6]),
        ("Google-Gemini", scrape_google_news, ["Google Gemini Bard AI assistant news", 5]),
        ("Google-AIBiz", scrape_google_news, ["artificial intelligence business applications", 5]),
        ("Google-ML", scrape_google_news, ["machine learning deep learning research papers", 4]),
        ("Google-AIJobs", scrape_google_news, ["AI automation jobs impact future work", 4]),
        ("Google-GenAI", scrape_google_news, ["generative AI image video tools Midjourney DALL-E", 4]),
        ("Reddit-ML", scrape_reddit, ["MachineLearning", 6]),
        ("Reddit-AI", scrape_reddit, ["artificial", 5]),
    ]
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_name = {}
        for name, func, args in scrapers:
            future = executor.submit(func, *args)
            future_to_name[future] = name
        
        for future in future_to_name:
            name = future_to_name[future]
            try:
                articles = future.result(timeout=15)
                debug_log("get_ai_ml_news", f"[{name}] returned {len(articles)} articles")
                all_articles.extend(articles)
            except TimeoutError:
                debug_log("get_ai_ml_news", f"[{name}] TIMEOUT after 15s")
            except Exception as e:
                debug_log("get_ai_ml_news", f"[{name}] FAILED", e)
    
    debug_log("get_ai_ml_news", f"Returning {len(all_articles)} articles")
    limit = get_articles_limit()
    sorted_articles = sort_articles(all_articles)
    return sorted_articles[:limit]

def get_startup_news():
    """Get startup and entrepreneurship news"""
    all_articles = []
    debug_log("get_startup_news", "Starting startup news aggregation...")
    
    scrapers = [
        ("ProductHunt", scrape_producthunt, []),
        ("Google-Funding", scrape_google_news, ["startup funding series A B C india", 6]),
        ("Google-Unicorn", scrape_google_news, ["indian unicorn startup valuation news", 5]),
        ("Google-Founders", scrape_google_news, ["entrepreneur success story india founder", 4]),
        ("Google-YC", scrape_google_news, ["Y Combinator startup accelerator news", 4]),
        ("Google-VC", scrape_google_news, ["venture capital investment tech startups", 4]),
        ("Reddit-Startups", scrape_reddit, ["startups", 6]),
    ]
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_name = {}
        for name, func, args in scrapers:
            future = executor.submit(func, *args) if args else executor.submit(func)
            future_to_name[future] = name
        
        for future in future_to_name:
            name = future_to_name[future]
            try:
                articles = future.result(timeout=15)
                debug_log("get_startup_news", f"[{name}] returned {len(articles)} articles")
                all_articles.extend(articles)
            except TimeoutError:
                debug_log("get_startup_news", f"[{name}] TIMEOUT after 15s")
            except Exception as e:
                debug_log("get_startup_news", f"[{name}] FAILED", e)
    
    debug_log("get_startup_news", f"Returning {len(all_articles)} articles")
    limit = get_articles_limit()
    sorted_articles = sort_articles(all_articles)
    return sorted_articles[:limit]

def get_general_trends():
    """Get general trending topics with refined queries"""
    all_articles = []
    debug_log("get_general_trends", "Starting general trends aggregation...")
    
    scrapers = [
        ("Google-Trending", scrape_google_news, ["trending india news today viral", 6]),
        ("Google-TechTrends", scrape_google_news, ["technology trends 2024 2025 predictions", 5]),
        ("Google-Digital", scrape_google_news, ["digital transformation business innovation", 4]),
        ("Google-Skills", scrape_google_news, ["future skills demand jobs 2025", 4]),
        ("Google-Fintech", scrape_google_news, ["fintech digital payments UPI india", 4]),
        ("Google-EV", scrape_google_news, ["electric vehicles EV india tesla", 4]),
    ]
    
    with ThreadPoolExecutor(max_workers=6) as executor:
        future_to_name = {}
        for name, func, args in scrapers:
            future = executor.submit(func, *args)
            future_to_name[future] = name
        
        for future in future_to_name:
            name = future_to_name[future]
            try:
                articles = future.result(timeout=15)
                debug_log("get_general_trends", f"[{name}] returned {len(articles)} articles")
                all_articles.extend(articles)
            except TimeoutError:
                debug_log("get_general_trends", f"[{name}] TIMEOUT after 15s")
            except Exception as e:
                debug_log("get_general_trends", f"[{name}] FAILED", e)
    
    # Remove duplicates
    seen_titles = set()
    unique_articles = []
    for article in all_articles:
        title_key = article['title'].lower()[:50]
        if title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_articles.append(article)
    
    debug_log("get_general_trends", f"Returning {len(unique_articles)} unique articles")
    limit = get_articles_limit()
    sorted_articles = sort_articles(unique_articles)
    return sorted_articles[:limit]

# ============================================
# CACHE INTEGRATION
# ============================================

# Import cache (lazy import to avoid circular dependency)
_news_cache = None

def get_cache():
    """Get the news cache instance"""
    global _news_cache
    if _news_cache is None:
        try:
            from admin.cache import news_cache
            _news_cache = news_cache
        except ImportError:
            _news_cache = None
    return _news_cache

def get_cached_or_scrape(category: str, scraper_func, force_refresh: bool = False):
    """Get articles from cache or scrape if cache is empty/stale
    
    Priority:
    1. If cache is valid (not stale), return from local cache
    2. If cache is stale, try to load from Supabase first
    3. If Supabase fails or is also stale, scrape fresh data
    """
    cache = get_cache()
    
    # If no cache system or force refresh, scrape directly
    if cache is None or force_refresh:
        return scraper_func()
    
    # Try to get from cache first
    cached_articles = cache.get_articles(category)
    
    # If cache has data and is not stale, return it
    if cached_articles and not cache.is_stale(max_age_minutes=60):
        debug_log("Cache", f"Returning {len(cached_articles)} cached {category} articles")
        return cached_articles
    
    # Cache is stale - try to load from Supabase first
    debug_log("Cache", f"Local cache stale for {category}, trying Supabase...")
    if cache.sync_from_supabase():
        # Check if Supabase data is fresh
        cached_articles = cache.get_articles(category)
        if cached_articles and not cache.is_stale(max_age_minutes=60):
            debug_log("Cache", f"Loaded {len(cached_articles)} {category} articles from Supabase")
            return cached_articles
    
    # Both local and Supabase stale, scrape fresh data
    debug_log("Cache", f"Cache miss for {category}, scraping fresh data...")
    articles = scraper_func()
    
    # Update cache
    cache.update_category(category, articles)
    cache.save(sync_cloud=False)  # Don't sync to cloud on every request
    
    return articles

# ============================================
# API ROUTES (with caching)
# ============================================

@news_bp.route('/api/trends/version', methods=['GET'])
def get_feed_version():
    """Get current feed version - clients can poll this to check for updates"""
    cache = get_cache()
    if cache:
        return jsonify({
            'version': cache.get_version(),
            'last_updated': cache.get_stats().get('last_updated')
        }), 200
    return jsonify({'version': 0, 'last_updated': None}), 200

@news_bp.route('/api/trends', methods=['GET'])
def get_trends():
    """Get all trending news from multiple sources (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    try:
        tech_news = get_cached_or_scrape('tech', get_all_tech_news, force_refresh)
        education_news = get_cached_or_scrape('education', get_all_education_news, force_refresh)
        general_trends = get_cached_or_scrape('general', get_general_trends, force_refresh)
        
        return jsonify({
            'tech': tech_news,
            'education': education_news,
            'general': general_trends,
            '_cached': not force_refresh
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/all', methods=['GET'])
def get_all_trends():
    """Get comprehensive trends from all categories (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    try:
        result = {
            'tech': get_cached_or_scrape('tech', get_all_tech_news, force_refresh),
            'education': get_cached_or_scrape('education', get_all_education_news, force_refresh),
            'career': get_cached_or_scrape('career', get_career_news, force_refresh),
            'ai_ml': get_cached_or_scrape('ai_ml', get_ai_ml_news, force_refresh),
            'startups': get_cached_or_scrape('startups', get_startup_news, force_refresh),
            'general': get_cached_or_scrape('general', get_general_trends, force_refresh),
            '_cached': not force_refresh
        }
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/tech', methods=['GET'])
def get_tech_trends():
    """Get technology news from multiple sources (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        articles = get_cached_or_scrape('tech', get_all_tech_news, force_refresh)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/education', methods=['GET'])
def get_education_trends():
    """Get education news (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        articles = get_cached_or_scrape('education', get_all_education_news, force_refresh)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/career', methods=['GET'])
def get_career_trends():
    """Get career and job-related news (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        articles = get_cached_or_scrape('career', get_career_news, force_refresh)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/ai', methods=['GET'])
def get_ai_trends():
    """Get AI and Machine Learning news (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        articles = get_cached_or_scrape('ai_ml', get_ai_ml_news, force_refresh)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/startups', methods=['GET'])
def get_startup_trends():
    """Get startup and entrepreneurship news (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        articles = get_cached_or_scrape('startups', get_startup_news, force_refresh)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/developer', methods=['GET'])
def get_developer_trends():
    """Get developer-focused content (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        articles = get_cached_or_scrape('developer', get_developer_content, force_refresh)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/github', methods=['GET'])
def get_github_trends():
    """Get GitHub trending repositories (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        articles = get_cached_or_scrape('github', scrape_github_trending, force_refresh)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/hackernews', methods=['GET'])
def get_hackernews():
    """Get Hacker News top stories"""
    try:
        articles = scrape_hackernews()
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/reddit/<subreddit>', methods=['GET'])
def get_reddit_trends(subreddit):
    """Get Reddit posts from a specific subreddit"""
    try:
        articles = scrape_reddit(subreddit, 15)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/producthunt', methods=['GET'])
def get_producthunt():
    """Get Product Hunt trending products"""
    try:
        articles = scrape_producthunt()
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/medium/<tag>', methods=['GET'])
def get_medium_articles(tag):
    """Get Medium articles by tag"""
    try:
        articles = scrape_medium_tags(tag)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/search', methods=['GET'])
def search_news():
    """Search for specific news topics with refined results"""
    query = request.args.get('q', 'technology')
    limit = request.args.get('limit', 15, type=int)
    
    # Enhance the query for better results
    enhanced_queries = [
        query,
        f"{query} latest news",
        f"{query} india",
    ]
    
    try:
        all_articles = []
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(scrape_google_news, q, limit // 3 + 2) for q in enhanced_queries]
            for future in futures:
                try:
                    articles = future.result(timeout=10)
                    all_articles.extend(articles)
                except:
                    pass
        
        # Remove duplicates
        seen_titles = set()
        unique_articles = []
        for article in all_articles:
            title_key = article['title'].lower()[:50]
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_articles.append(article)
        
        return jsonify(unique_articles[:limit]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/category/<category>', methods=['GET'])
def get_category_news(category):
    """Get news by predefined category with optimized queries (cached)"""
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    category_handlers = {
        'tech': ('tech', get_all_tech_news),
        'education': ('education', get_all_education_news),
        'career': ('career', get_career_news),
        'ai': ('ai_ml', get_ai_ml_news),
        'ai_ml': ('ai_ml', get_ai_ml_news),
        'startups': ('startups', get_startup_news),
        'developer': ('developer', get_developer_content),
        'general': ('general', get_general_trends),
        'github': ('github', scrape_github_trending),
    }
    
    handler_info = category_handlers.get(category.lower())
    if not handler_info:
        return jsonify({
            "error": f"Unknown category: {category}",
            "available_categories": list(category_handlers.keys())
        }), 400
    
    cache_key, handler = handler_info
    
    try:
        articles = get_cached_or_scrape(cache_key, handler, force_refresh)
        return jsonify(articles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@news_bp.route('/api/trends/sources', methods=['GET'])
def get_available_sources():
    """Get list of all available news sources and categories"""
    cache = get_cache()
    cache_stats = cache.get_stats() if cache else None
    
    sources = {
        'categories': [
            {'name': 'Technology', 'endpoint': '/api/trends/tech', 'description': 'Tech news from TechCrunch, Wired, The Verge, etc.'},
            {'name': 'Education', 'endpoint': '/api/trends/education', 'description': 'Education, courses, scholarships, exams'},
            {'name': 'Career', 'endpoint': '/api/trends/career', 'description': 'Jobs, hiring, salaries, interviews'},
            {'name': 'AI & ML', 'endpoint': '/api/trends/ai', 'description': 'ChatGPT, AI tools, machine learning'},
            {'name': 'Startups', 'endpoint': '/api/trends/startups', 'description': 'Funding, unicorns, entrepreneurship'},
            {'name': 'Developer', 'endpoint': '/api/trends/developer', 'description': 'Dev.to, GitHub, Hacker News'},
            {'name': 'General', 'endpoint': '/api/trends/all', 'description': 'All categories combined'},
        ],
        'rss_feeds': [
            {'name': 'Google News', 'endpoint': '/api/trends/search?q=<query>'},
            {'name': 'TechCrunch', 'source': 'Included in /tech'},
            {'name': 'BBC News', 'source': 'Included in /tech'},
            {'name': 'Wired', 'source': 'Included in /tech'},
            {'name': 'Ars Technica', 'source': 'Included in /tech'},
            {'name': 'The Verge', 'source': 'Included in /tech'},
            {'name': 'Product Hunt', 'endpoint': '/api/trends/producthunt'},
            {'name': 'Medium', 'endpoint': '/api/trends/medium/<tag>'},
            {'name': 'NDTV Education', 'source': 'Included in /education'},
        ],
        'apis': [
            {'name': 'Hacker News', 'endpoint': '/api/trends/hackernews'},
            {'name': 'Dev.to', 'source': 'Included in /developer'},
            {'name': 'Reddit', 'endpoint': '/api/trends/reddit/<subreddit>'},
            {'name': 'GitHub Trending', 'endpoint': '/api/trends/github'},
        ],
        'cache': {
            'enabled': cache is not None,
            'stats': cache_stats
        },
        'suggested_subreddits': [
            'technology', 'programming', 'webdev', 'learnprogramming',
            'cscareerquestions', 'MachineLearning', 'artificial',
            'startups', 'entrepreneur', 'india', 'developersIndia'
        ],
        'suggested_medium_tags': [
            'technology', 'programming', 'artificial-intelligence',
            'startup', 'career', 'productivity', 'javascript', 'python'
        ],
        'playwright_status': 'available' if PLAYWRIGHT_AVAILABLE else 'not installed'
    }
    return jsonify(sources), 200
