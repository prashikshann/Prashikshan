"""
Internship Routes - Phase 1 Internship MVP
Handles all internship-related API endpoints
"""
import os
from datetime import datetime
from functools import wraps
from flask import Blueprint, jsonify, request
from supabase import create_client, Client

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

internship_bp = Blueprint('internships', __name__, url_prefix='/api/internships')
internship_bp.strict_slashes = False  # Allow both /api/internships and /api/internships/

# ============================================
# AUTH HELPERS
# ============================================

def get_user_from_token():
    """Extract user from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    try:
        user = supabase.auth.get_user(token)
        return user.user if user else None
    except Exception:
        return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_token()
        if not user:
            return jsonify({"error": "Unauthorized", "message": "Valid authentication required"}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated

def require_role(roles):
    """Decorator to require specific role(s)"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_user_from_token()
            if not user:
                return jsonify({"error": "Unauthorized"}), 401
            
            # Get user profile to check role
            try:
                profile = supabase.table('profiles').select('role').eq('id', user.id).single().execute()
                user_role = profile.data.get('role') if profile.data else 'student'
            except Exception as e:
                # If profiles table doesn't have role column or other error, default to student
                print(f"[Auth] Error checking role: {e}")
                user_role = 'student'
            
            if user_role not in roles:
                return jsonify({"error": "Forbidden", "message": f"Required role: {roles}"}), 403
            
            request.user = user
            request.user_role = user_role
            return f(*args, **kwargs)
        return decorated
    return decorator

# ============================================
# PUBLIC ENDPOINTS
# ============================================

@internship_bp.route('/', methods=['GET'])
def list_internships():
    """
    GET /api/internships
    List all active internships with optional filters
    
    Query Params:
    - domain: string (software, data, design, marketing, etc.)
    - location_type: string (remote, onsite, hybrid)
    - duration_min: int (minimum months)
    - duration_max: int (maximum months)
    - stipend_min: int
    - search: string (search in title/description)
    - page: int (default 1)
    - limit: int (default 20, max 50)
    """
    try:
        # Parse query params
        domain = request.args.get('domain')
        location_type = request.args.get('location_type')
        duration_min = request.args.get('duration_min', type=int)
        duration_max = request.args.get('duration_max', type=int)
        stipend_min = request.args.get('stipend_min', type=int)
        search = request.args.get('search', '').strip()
        page = request.args.get('page', 1, type=int)
        limit = min(request.args.get('limit', 20, type=int), 50)
        offset = (page - 1) * limit
        
        # Build query
        query = supabase.table('internships').select(
            '*, companies(id, name, logo_url, industry, location)'
        ).eq('status', 'active')
        
        # Apply filters
        if domain:
            query = query.eq('domain', domain)
        if location_type:
            query = query.eq('location_type', location_type)
        if duration_min:
            query = query.gte('duration_months', duration_min)
        if duration_max:
            query = query.lte('duration_months', duration_max)
        if stipend_min:
            query = query.gte('stipend_min', stipend_min)
        if search:
            query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
        
        # Order and paginate
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Get total count for pagination
        count_query = supabase.table('internships').select('id', count='exact').eq('status', 'active')
        if domain:
            count_query = count_query.eq('domain', domain)
        if location_type:
            count_query = count_query.eq('location_type', location_type)
        count_result = count_query.execute()
        
        total = count_result.count if count_result.count else len(result.data)
        total_pages = (total + limit - 1) // limit  # Ceiling division
        
        return jsonify({
            "success": True,
            "data": result.data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_more": len(result.data) == limit
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/<internship_id>', methods=['GET'])
def get_internship(internship_id):
    """
    GET /api/internships/:id
    Get single internship details
    """
    try:
        result = supabase.table('internships').select(
            '*, companies(id, name, logo_url, industry, location, website, description, company_size)'
        ).eq('id', internship_id).single().execute()
        
        if not result.data:
            return jsonify({"error": "Internship not found"}), 404
        
        # Increment view count
        supabase.table('internships').update({
            'views_count': result.data['views_count'] + 1
        }).eq('id', internship_id).execute()
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/domains', methods=['GET'])
def get_domains():
    """GET /api/internships/domains - Get all available domains"""
    domains = [
        {"id": "software", "name": "Software Development", "icon": "💻"},
        {"id": "data", "name": "Data Science & Analytics", "icon": "📊"},
        {"id": "design", "name": "UI/UX Design", "icon": "🎨"},
        {"id": "marketing", "name": "Digital Marketing", "icon": "📱"},
        {"id": "content", "name": "Content Writing", "icon": "✍️"},
        {"id": "finance", "name": "Finance & Accounting", "icon": "💰"},
        {"id": "hr", "name": "Human Resources", "icon": "👥"},
        {"id": "operations", "name": "Operations", "icon": "⚙️"},
        {"id": "sales", "name": "Sales & BD", "icon": "🤝"},
        {"id": "research", "name": "Research", "icon": "🔬"},
        {"id": "other", "name": "Other", "icon": "📋"}
    ]
    return jsonify({"success": True, "data": domains})

# ============================================
# STUDENT ENDPOINTS
# ============================================

@internship_bp.route('/<internship_id>/apply', methods=['POST'])
@require_auth
def apply_to_internship(internship_id):
    """
    POST /api/internships/:id/apply
    Apply to an internship
    
    Request Body:
    {
        "resume_url": "string (required)",
        "cover_letter": "string (optional)",
        "portfolio_url": "string (optional)",
        "student_note": "string (optional)"
    }
    """
    try:
        data = request.get_json() or {}
        user = request.user
        
        # Validate required fields
        if not data.get('resume_url'):
            return jsonify({"error": "Resume URL is required"}), 400
        
        # Check if internship exists and is active
        internship = supabase.table('internships').select('id, status').eq('id', internship_id).single().execute()
        if not internship.data:
            return jsonify({"error": "Internship not found"}), 404
        if internship.data['status'] != 'active':
            return jsonify({"error": "This internship is no longer accepting applications"}), 400
        
        # Check if already applied
        existing = supabase.table('internship_applications').select('id').eq('internship_id', internship_id).eq('student_id', user.id).execute()
        if existing.data:
            return jsonify({"error": "You have already applied to this internship"}), 400
        
        # Create application
        application = {
            "internship_id": internship_id,
            "student_id": user.id,
            "resume_url": data['resume_url'],
            "cover_letter": data.get('cover_letter'),
            "portfolio_url": data.get('portfolio_url'),
            "student_note": data.get('student_note'),
            "status": "pending"
        }
        
        result = supabase.table('internship_applications').insert(application).execute()
        
        return jsonify({
            "success": True,
            "message": "Application submitted successfully",
            "data": result.data[0] if result.data else None
        }), 201
        
    except Exception as e:
        if 'duplicate' in str(e).lower():
            return jsonify({"error": "You have already applied to this internship"}), 400
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/my-applications', methods=['GET'])
@require_auth
def get_my_applications():
    """
    GET /api/internships/my-applications
    Get all applications for the current student
    """
    try:
        user = request.user
        
        result = supabase.table('internship_applications').select(
            '*, internships(id, title, domain, location, location_type, stipend_min, stipend_max, companies(name, logo_url))'
        ).eq('student_id', user.id).order('applied_at', desc=True).execute()
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/<internship_id>/save', methods=['POST'])
@require_auth
def save_internship(internship_id):
    """POST /api/internships/:id/save - Bookmark an internship"""
    try:
        user = request.user
        
        # Check if already saved
        existing = supabase.table('saved_internships').select('id').eq('user_id', user.id).eq('internship_id', internship_id).execute()
        
        if existing.data:
            # Unsave
            supabase.table('saved_internships').delete().eq('user_id', user.id).eq('internship_id', internship_id).execute()
            return jsonify({"success": True, "data": {"saved": False}, "message": "Internship unsaved"})
        else:
            # Save
            supabase.table('saved_internships').insert({
                "user_id": user.id,
                "internship_id": internship_id
            }).execute()
            return jsonify({"success": True, "data": {"saved": True}, "message": "Internship saved"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/saved', methods=['GET'])
@require_auth
def get_saved_internships():
    """GET /api/internships/saved - Get all saved internships"""
    try:
        user = request.user
        
        result = supabase.table('saved_internships').select(
            '*, internships(*, companies(name, logo_url))'
        ).eq('user_id', user.id).order('saved_at', desc=True).execute()
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# COMPANY ENDPOINTS
# ============================================

@internship_bp.route('/company/profile', methods=['GET'])
@require_role(['company'])
def get_company_profile():
    """GET /api/internships/company/profile - Get company profile"""
    try:
        user = request.user
        
        result = supabase.table('companies').select('*').eq('user_id', user.id).single().execute()
        
        if not result.data:
            return jsonify({"error": "Company profile not found"}), 404
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/company/profile', methods=['POST', 'PUT'])
@require_auth
def upsert_company_profile():
    """POST/PUT /api/internships/company/profile - Create or update company profile"""
    try:
        user = request.user
        data = request.get_json() or {}
        
        # Check if profile exists
        existing = supabase.table('companies').select('id').eq('user_id', user.id).execute()
        
        company_data = {
            "user_id": user.id,
            "name": data.get('name'),
            "description": data.get('description'),
            "logo_url": data.get('logo_url'),
            "website": data.get('website'),
            "industry": data.get('industry'),
            "company_size": data.get('company_size'),
            "location": data.get('location')
        }
        
        if existing.data:
            # Update
            result = supabase.table('companies').update(company_data).eq('user_id', user.id).execute()
        else:
            # Insert
            result = supabase.table('companies').insert(company_data).execute()
            # Update user role to company
            supabase.table('profiles').update({"role": "company"}).eq('id', user.id).execute()
        
        return jsonify({
            "success": True,
            "data": result.data[0] if result.data else None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/company/internships', methods=['GET'])
@require_role(['company'])
def get_company_internships():
    """GET /api/internships/company/internships - Get all internships posted by company"""
    try:
        user = request.user
        
        # Get company ID
        company = supabase.table('companies').select('id').eq('user_id', user.id).single().execute()
        if not company.data:
            return jsonify({"error": "Company profile not found"}), 404
        
        result = supabase.table('internships').select('*').eq('company_id', company.data['id']).order('created_at', desc=True).execute()
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/company/internships', methods=['POST'])
@require_role(['company'])
def create_internship():
    """
    POST /api/internships/company/internships
    Create a new internship posting
    
    Request Body:
    {
        "title": "string",
        "description": "string",
        "requirements": "string",
        "responsibilities": "string",
        "domain": "string",
        "location": "string",
        "location_type": "remote|onsite|hybrid",
        "stipend_min": int,
        "stipend_max": int,
        "duration_months": int,
        "start_date": "YYYY-MM-DD",
        "application_deadline": "YYYY-MM-DD",
        "positions_available": int,
        "skills_required": ["string"],
        "perks": ["string"],
        "status": "draft|active"
    }
    """
    try:
        user = request.user
        data = request.get_json() or {}
        
        # Get company ID
        company = supabase.table('companies').select('id').eq('user_id', user.id).single().execute()
        if not company.data:
            return jsonify({"error": "Company profile not found. Please create company profile first."}), 400
        
        # Validate required fields
        required = ['title', 'description', 'domain', 'duration_months']
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        internship = {
            "company_id": company.data['id'],
            "title": data['title'],
            "description": data['description'],
            "requirements": data.get('requirements'),
            "responsibilities": data.get('responsibilities'),
            "domain": data['domain'],
            "location": data.get('location'),
            "location_type": data.get('location_type', 'remote'),
            "stipend_min": data.get('stipend_min', 0),
            "stipend_max": data.get('stipend_max'),
            "duration_months": data['duration_months'],
            "start_date": data.get('start_date'),
            "application_deadline": data.get('application_deadline'),
            "positions_available": data.get('positions_available', 1),
            "skills_required": data.get('skills_required', []),
            "perks": data.get('perks', []),
            "status": data.get('status', 'active')
        }
        
        result = supabase.table('internships').insert(internship).execute()
        
        return jsonify({
            "success": True,
            "message": "Internship created successfully",
            "data": result.data[0] if result.data else None
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/company/internships/<internship_id>', methods=['PUT'])
@require_role(['company'])
def update_internship(internship_id):
    """PUT /api/internships/company/internships/:id - Update an internship"""
    try:
        user = request.user
        data = request.get_json() or {}
        
        # Verify ownership
        company = supabase.table('companies').select('id').eq('user_id', user.id).single().execute()
        if not company.data:
            return jsonify({"error": "Company not found"}), 404
        
        internship = supabase.table('internships').select('id').eq('id', internship_id).eq('company_id', company.data['id']).single().execute()
        if not internship.data:
            return jsonify({"error": "Internship not found or access denied"}), 404
        
        # Update fields
        update_data = {}
        allowed_fields = ['title', 'description', 'requirements', 'responsibilities', 'domain', 
                         'location', 'location_type', 'stipend_min', 'stipend_max', 'duration_months',
                         'start_date', 'application_deadline', 'positions_available', 'skills_required',
                         'perks', 'status']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        result = supabase.table('internships').update(update_data).eq('id', internship_id).execute()
        
        return jsonify({
            "success": True,
            "data": result.data[0] if result.data else None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/company/internships/<internship_id>/applications', methods=['GET'])
@require_role(['company'])
def get_internship_applications(internship_id):
    """GET /api/internships/company/internships/:id/applications - Get applications for an internship"""
    try:
        user = request.user
        
        # Verify ownership
        company = supabase.table('companies').select('id').eq('user_id', user.id).single().execute()
        if not company.data:
            return jsonify({"error": "Company not found"}), 404
        
        internship = supabase.table('internships').select('id').eq('id', internship_id).eq('company_id', company.data['id']).single().execute()
        if not internship.data:
            return jsonify({"error": "Internship not found or access denied"}), 404
        
        result = supabase.table('internship_applications').select(
            '*, profiles:student_id(id, username, full_name, avatar_url, college, department, year_of_study, cgpa, skills)'
        ).eq('internship_id', internship_id).order('applied_at', desc=True).execute()
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/company/applications/<application_id>/status', methods=['PUT'])
@require_role(['company'])
def update_application_status(application_id):
    """
    PUT /api/internships/company/applications/:id/status
    Update application status (shortlist, reject, hire)
    
    Request Body:
    {
        "status": "company_shortlisted|company_rejected|hired",
        "company_note": "string (optional)"
    }
    """
    try:
        user = request.user
        data = request.get_json() or {}
        
        status = data.get('status')
        if status not in ['company_shortlisted', 'company_rejected', 'hired']:
            return jsonify({"error": "Invalid status"}), 400
        
        # Verify ownership through internship
        application = supabase.table('internship_applications').select(
            'id, internships!inner(company_id)'
        ).eq('id', application_id).single().execute()
        
        if not application.data:
            return jsonify({"error": "Application not found"}), 404
        
        company = supabase.table('companies').select('id').eq('user_id', user.id).single().execute()
        if not company.data or application.data['internships']['company_id'] != company.data['id']:
            return jsonify({"error": "Access denied"}), 403
        
        update_data = {"status": status}
        if data.get('company_note'):
            update_data['company_note'] = data['company_note']
        
        result = supabase.table('internship_applications').update(update_data).eq('id', application_id).execute()
        
        return jsonify({
            "success": True,
            "data": result.data[0] if result.data else None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# FACULTY ENDPOINTS
# ============================================

@internship_bp.route('/faculty/profile', methods=['GET'])
@require_role(['faculty'])
def get_faculty_profile():
    """GET /api/internships/faculty/profile - Get faculty profile"""
    try:
        user = request.user
        
        result = supabase.table('faculty').select('*').eq('user_id', user.id).single().execute()
        
        if not result.data:
            return jsonify({"error": "Faculty profile not found"}), 404
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/faculty/profile', methods=['POST', 'PUT'])
@require_auth
def upsert_faculty_profile():
    """POST/PUT /api/internships/faculty/profile - Create or update faculty profile"""
    try:
        user = request.user
        data = request.get_json() or {}
        
        existing = supabase.table('faculty').select('id').eq('user_id', user.id).execute()
        
        faculty_data = {
            "user_id": user.id,
            "name": data.get('name'),
            "email": data.get('email', user.email),
            "department": data.get('department'),
            "designation": data.get('designation'),
            "college": data.get('college'),
            "phone": data.get('phone')
        }
        
        if existing.data:
            result = supabase.table('faculty').update(faculty_data).eq('user_id', user.id).execute()
        else:
            result = supabase.table('faculty').insert(faculty_data).execute()
            supabase.table('profiles').update({"role": "faculty"}).eq('id', user.id).execute()
        
        return jsonify({
            "success": True,
            "data": result.data[0] if result.data else None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/faculty/pending-approvals', methods=['GET'])
@require_role(['faculty'])
def get_pending_approvals():
    """GET /api/internships/faculty/pending-approvals - Get applications pending faculty approval"""
    try:
        # Get applications with status 'pending' that haven't been reviewed by faculty
        result = supabase.table('internship_applications').select(
            '''*, 
            internships(id, title, domain, companies(name, logo_url)),
            profiles:student_id(id, username, full_name, avatar_url, college, department, year_of_study, cgpa, skills, resume_url)'''
        ).eq('status', 'pending').order('applied_at', desc=True).execute()
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/faculty/approve/<application_id>', methods=['POST'])
@require_role(['faculty'])
def approve_application(application_id):
    """
    POST /api/internships/faculty/approve/:id
    Approve or reject a student application
    
    Request Body:
    {
        "action": "approve|reject",
        "remarks": "string (optional)"
    }
    """
    try:
        user = request.user
        data = request.get_json() or {}
        
        action = data.get('action')
        if action not in ['approve', 'reject']:
            return jsonify({"error": "Action must be 'approve' or 'reject'"}), 400
        
        # Get faculty profile
        faculty = supabase.table('faculty').select('id').eq('user_id', user.id).single().execute()
        if not faculty.data:
            return jsonify({"error": "Faculty profile not found"}), 404
        
        # Verify application exists
        application = supabase.table('internship_applications').select('id, status').eq('id', application_id).single().execute()
        if not application.data:
            return jsonify({"error": "Application not found"}), 404
        
        # Update application status
        new_status = 'faculty_approved' if action == 'approve' else 'faculty_rejected'
        supabase.table('internship_applications').update({
            "status": new_status,
            "faculty_note": data.get('remarks')
        }).eq('id', application_id).execute()
        
        # Create faculty approval record
        supabase.table('faculty_approvals').insert({
            "application_id": application_id,
            "faculty_id": faculty.data['id'],
            "status": action + 'd',  # 'approved' or 'rejected'
            "remarks": data.get('remarks')
        }).execute()
        
        return jsonify({
            "success": True,
            "message": f"Application {action}d successfully"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@internship_bp.route('/faculty/approval-history', methods=['GET'])
@require_role(['faculty'])
def get_approval_history():
    """GET /api/internships/faculty/approval-history - Get faculty's approval history"""
    try:
        user = request.user
        
        faculty = supabase.table('faculty').select('id').eq('user_id', user.id).single().execute()
        if not faculty.data:
            return jsonify({"error": "Faculty profile not found"}), 404
        
        result = supabase.table('faculty_approvals').select(
            '''*, 
            internship_applications(
                id, 
                internships(title, companies(name)),
                profiles:student_id(full_name, college)
            )'''
        ).eq('faculty_id', faculty.data['id']).order('reviewed_at', desc=True).execute()
        
        return jsonify({
            "success": True,
            "data": result.data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# STATS ENDPOINTS
# ============================================

@internship_bp.route('/stats', methods=['GET'])
def get_stats():
    """GET /api/internships/stats - Get public internship statistics"""
    try:
        # Count active internships
        internships = supabase.table('internships').select('id', count='exact').eq('status', 'active').execute()
        
        # Count companies
        companies = supabase.table('companies').select('id', count='exact').execute()
        
        # Count applications
        applications = supabase.table('internship_applications').select('id', count='exact').execute()
        
        return jsonify({
            "success": True,
            "data": {
                "active_internships": internships.count or 0,
                "companies": companies.count or 0,
                "total_applications": applications.count or 0
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
