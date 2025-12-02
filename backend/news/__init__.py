# News Scraper Module
from .scraper import (
    news_bp, 
    scrape_google_news, 
    scrape_techcrunch,
    scrape_hackernews,
    scrape_dev_to,
    scrape_reddit,
    scrape_github_trending,
    get_all_tech_news,
    get_all_education_news,
    get_developer_content,
    get_career_news,
    get_ai_ml_news,
    get_startup_news,
)

__all__ = [
    'news_bp', 
    'scrape_google_news', 
    'scrape_techcrunch',
    'scrape_hackernews',
    'scrape_dev_to',
    'scrape_reddit',
    'scrape_github_trending',
    'get_all_tech_news',
    'get_all_education_news',
    'get_developer_content',
    'get_career_news',
    'get_ai_ml_news',
    'get_startup_news',
]
