# Prashikshan - System Features Summary

## 📋 Overview

Prashikshan is a full-stack news aggregation and trends platform that scrapes content from multiple sources and presents it in a modern, social-media-style interface.

---

## 🏗️ Architecture

### Frontend
- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Deployment**: Vercel
- **Features**: PWA support, responsive design, dark mode

### Backend
- **Framework**: Flask (Python 3.11.4)
- **Deployment**: Render (Free Tier)
- **Database**: Supabase (PostgreSQL)
- **Caching**: Local JSON + Supabase Storage

### Playwright Scraper Service
- **Platform**: HuggingFace Spaces
- **URL**: `https://parthnuwal7-prashikshan.hf.space`
- **Purpose**: Scrape JavaScript-heavy sites (Product Hunt, Medium)

---

## 📰 News Sources (15+ Sources)

### Tech News
- TechCrunch
- The Verge
- Wired
- Ars Technica

### Developer Content
- Hacker News
- Dev.to
- GitHub Trending
- Reddit (r/programming, r/webdev, etc.)

### Startup & Products
- Product Hunt (via Playwright)
- Medium Tags (via Playwright)

### General News
- Google News (multiple queries)
- Indian news sources (NDTV, IndiaToday, Times of India)

---

## 🔧 Admin Panel Features (`/sysadmin`)

### Authentication
- Password-protected access (default: `123456`)
- Session-based authentication via `X-Admin-Key` header

### Dashboard
- Cache statistics (total articles, per-category counts)
- Last refresh time and duration
- Cache file size

### Service Management
- **Render Backend**: Wake-up button, status indicator
- **HF Spaces Scraper**: Wake-up button, status indicator, logs viewer
- **Keep-Alive Polling**: Toggle to keep services awake (polls every 5-10 min)

### Scraping Settings
| Setting | Description | Range/Options |
|---------|-------------|---------------|
| **Playwright Toggle** | Enable/disable HF Spaces Playwright scraping | On/Off |
| **Articles Limit** | Max articles per category | 5-50 (default: 10) |
| **Sort Order** | How articles are ordered | Priority / Time / Random |

### Sort Order Options
1. **Priority**: Articles sorted by source importance
   - TechCrunch → Hacker News → Dev.to → GitHub → Product Hunt → Medium → The Verge → Wired → etc.
2. **Time**: Newest articles first (by timestamp)
3. **Random**: Shuffled order for variety

### Cache Management
- Manual refresh (all categories or individual)
- Cloud sync to Supabase Storage
- View article samples per category

---

## 📱 Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Main feed with posts |
| `/trends` | Trends | News aggregator with category tabs |
| `/explore` | Explore | Discovery page |
| `/create` | Create | Create new posts |
| `/chat` | Chat | Messaging interface |
| `/dm` | Direct Messages | Private conversations |
| `/profile` | Profile | User profile |
| `/auth` | Authentication | Login/Register |
| `/onboarding` | Onboarding | New user setup |
| `/sysadmin` | Admin Panel | System administration |

---

## 🗂️ Trends Categories

1. **Tech** - Technology news and updates
2. **Education** - Learning, courses, certifications
3. **Developer** - Programming, tools, tutorials
4. **Career** - Jobs, interviews, salaries
5. **AI/ML** - Artificial intelligence, machine learning
6. **Startup** - Funding, entrepreneurs, Product Hunt
7. **General** - Trending topics, viral content

---

## 🔌 API Endpoints

### Public Endpoints
```
GET  /health                    - Health check
GET  /api/news/trends           - Get all trending news
GET  /api/news/trends/<category> - Get news by category
```

### Admin Endpoints (require X-Admin-Key header)
```
POST /api/admin/login           - Authenticate admin
GET  /api/admin/dashboard       - Get dashboard data
GET  /api/admin/settings        - Get current settings
POST /api/admin/settings/playwright     - Toggle Playwright
POST /api/admin/settings/articles-limit - Set articles limit
POST /api/admin/settings/sort-order     - Set sort order
POST /api/admin/settings/source-priority - Update source priority
POST /api/admin/news/refresh    - Trigger cache refresh
GET  /api/admin/news/refresh/status - Get refresh status
POST /api/admin/cache/sync      - Sync cache to cloud
```

### HF Spaces Scraper Endpoints
```
GET  /health                    - Health check
GET  /logs                      - View recent logs
POST /scrape                    - Scrape a URL with Playwright
POST /scrape-news               - Scrape news from a source
```

---

## 🚀 Deployment

### Environment Variables

**Frontend (Vercel)**
```
VITE_API_URL=https://your-backend.onrender.com
VITE_HF_SCRAPER_URL=https://your-space.hf.space
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (Render)**
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
HF_SCRAPER_URL=https://your-space.hf.space
HF_SCRAPER_API_KEY=123456
ADMIN_API_KEY=123456
```

---

## 📦 Key Dependencies

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- Supabase JS Client

### Backend
- Flask
- BeautifulSoup4
- Requests
- Supabase Python Client
- Gunicorn

### Scraper Service
- Flask
- Playwright
- BeautifulSoup4

---

## 🔒 Security Features

- Admin authentication via API key
- CORS configuration for allowed origins
- SSL certificate handling for image extraction
- Rate limiting on scraper requests

---

## 📊 Caching Strategy

1. **Local Cache**: JSON file (`cache/news_cache.json`)
2. **Cloud Backup**: Supabase Storage bucket (`news-cache`)
3. **Auto-refresh**: Triggered via admin panel
4. **Stale detection**: Based on last update timestamp

---

## � Internship MVP (Phase 1)

### Overview
A comprehensive internship discovery, posting, and application system with faculty approval workflow.

### User Roles
| Role | Capabilities |
|------|-------------|
| **Student** | Browse internships, apply, track applications |
| **Company** | Post internships, review applications, hire |
| **Faculty** | Approve/reject student applications |
| **Admin** | Manage all users and content |

### Database Schema

**Tables:**
- `companies` - Company profiles (name, industry, size, etc.)
- `faculty` - Faculty profiles (department, designation, college)
- `internships` - Internship listings
- `internship_applications` - Student applications
- `faculty_approvals` - Faculty review records

### Frontend Routes
| Route | Page | Description |
|-------|------|-------------|
| `/internships` | Internships | Browse and search internships |
| `/internships/:id` | Details | View single internship |
| `/company` | Company Dashboard | Manage internships & applications |
| `/faculty` | Faculty Dashboard | Review student applications |

### Key Features

**Students:**
- Browse internships with filters (domain, location, stipend, duration)
- Search functionality
- Apply with resume upload (Supabase Storage)
- Cover letter and portfolio support
- Track application status

**Companies:**
- Create company profile
- Post internships with rich details
- Define skills, requirements, responsibilities
- Review applications
- Shortlist, reject, or hire candidates

**Faculty:**
- Faculty profile setup
- Review pending applications
- Approve or reject with remarks
- View approval history

### API Endpoints

**Public:**
```
GET  /api/internships           - List internships with filters
GET  /api/internships/:id       - Get internship details
GET  /api/internships/domains   - Get available domains
GET  /api/internships/stats     - Get platform statistics
```

**Student:**
```
POST /api/internships/:id/apply - Apply to internship
GET  /api/internships/my-applications - Get student's applications
POST /api/internships/:id/save  - Save/unsave internship
GET  /api/internships/saved     - Get saved internships
```

**Company:**
```
GET  /api/internships/company/profile    - Get company profile
POST /api/internships/company/profile    - Create/update profile
GET  /api/internships/company/internships - Get company's internships
POST /api/internships/company/internships - Create internship
PUT  /api/internships/company/internships/:id - Update internship
GET  /api/internships/company/internships/:id/applications - Get applications
PUT  /api/internships/company/applications/:id/status - Update status
```

**Faculty:**
```
GET  /api/internships/faculty/profile    - Get faculty profile
POST /api/internships/faculty/profile    - Create/update profile
GET  /api/internships/faculty/pending-approvals - Get pending applications
POST /api/internships/faculty/approve/:id - Approve/reject application
GET  /api/internships/faculty/approval-history - Get review history
```

### Application Flow
1. Student applies → Status: `pending`
2. Faculty reviews → Status: `faculty_approved` or `faculty_rejected`
3. Company reviews → Status: `company_shortlisted` or `company_rejected`
4. Final decision → Status: `hired`

### Frontend Components
- `InternshipCard` - Card component for listings
- `InternshipFilters` - Filter sidebar with domain, duration, location, stipend
- `ApplyModal` - Application modal with resume upload
- `CompanyDashboard` - Full company management interface
- `FacultyDashboard` - Faculty review interface

---

## �🐛 Known Considerations

- Render free tier sleeps after 15 min of inactivity (use Keep-Alive)
- HuggingFace Spaces may cold-start (use Wake-Up button)
- Some sites block scraping (fallback to RSS/API)
- SSL certificate issues on some sites (bypassed with verify=False)

---

## 📅 Last Updated

December 3, 2025
