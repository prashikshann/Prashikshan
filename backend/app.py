import os
import time
import logging
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
import google.generativeai as genai  # <--- Essential Import
from news import news_bp  # Import the news blueprint
from admin import admin_bp, NewsCache  # Import admin blueprint and cache

# Load environment variables
load_dotenv()

# --- Filter out Render's internal health check logs ---
class HealthCheckFilter(logging.Filter):
    def filter(self, record):
        # Filter out GET /health requests from Render/1.0
        message = record.getMessage()
        if 'GET /health' in message and 'Render/1.0' in message:
            return False
        return True

# Apply filter to werkzeug logger (Flask's default logger)
logging.getLogger('werkzeug').addFilter(HealthCheckFilter())

# --- SETUP 1: SUPABASE ---
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase variables")
supabase: Client = create_client(supabase_url, supabase_key)

# --- SETUP 2: GEMINI AI ---
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
else:
    print("WARNING: GEMINI_API_KEY is missing in .env")
    model = None # Prevent crash if key is missing

# --- SETUP 3: NEWS CACHE ---
news_cache = NewsCache()
news_cache.set_supabase(supabase)

# Try to load from Supabase on startup (important for Render where local files don't persist)
if news_cache.sync_from_supabase():
    print(f"[Cache] Loaded {news_cache.get_stats()['total_articles']} articles from Supabase")
else:
    print(f"[Cache] Using local cache with {news_cache.get_stats()['total_articles']} articles")

# --- SETUP 4: FLASK ---
app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(news_bp)
app.register_blueprint(admin_bp)

@app.route("/")
def index():
    cache_stats = news_cache.get_stats()
    return jsonify({
        "status": "System Operational",
        "cache": {
            "total_articles": cache_stats['total_articles'],
            "last_updated": cache_stats['last_updated']
        }
    })

@app.route("/health")
def health_check():
    """Health check endpoint for Render deployment"""
    return jsonify({
        "status": "healthy",
        "service": "prashikshan-backend"
    }), 200

@app.route("/debug/cache")
def debug_cache():
    """Debug endpoint to check cache status"""
    cache_stats = news_cache.get_stats()
    return jsonify({
        "cache_stats": cache_stats,
        "supabase_connected": news_cache._supabase is not None,
        "categories": list(news_cache._cache.get('categories', {}).keys()),
        "sample_articles": {
            cat: len(articles) 
            for cat, articles in news_cache._cache.get('categories', {}).items()
        }
    })

# --- ROUTES ---

@app.route('/api/feed', methods=['GET'])
def get_feed():
    user_id = request.args.get('user_id')
    if not user_id: return jsonify({"error": "User ID required"}), 400
    try:
        follows_response = supabase.table('follows').select('following_id').eq('follower_id', user_id).execute()
        following_ids = [row['following_id'] for row in follows_response.data]
        following_ids.append(user_id)

        posts_response = supabase.table('posts')\
            .select('*, profiles(username, avatar_url), likes(count), comments(count)')\
            .in_('user_id', following_ids)\
            .order('created_at', desc=True)\
            .execute()
        return jsonify(posts_response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/posts', methods=['POST'])
def create_post():
    try:
        user_id = request.form.get('user_id')
        content = request.form.get('content')
        file = request.files.get('file')
        image_url = ""
        if file:
            filename = f"{int(time.time())}_{file.filename}"
            file_data = file.read()
            supabase.storage.from_('Posts').upload(filename, file_data, file_options={"content-type": file.content_type})
            image_url = supabase.storage.from_('Posts').get_public_url(filename)

        response = supabase.table('posts').insert({
            'user_id': user_id, 'content': content, 'image_url': image_url
        }).execute()
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/posts/like', methods=['POST'])
def toggle_like():
    data = request.json
    try:
        existing = supabase.table('likes').select('*').eq('user_id', data['user_id']).eq('post_id', data['post_id']).execute()
        if len(existing.data) > 0:
            supabase.table('likes').delete().eq('user_id', data['user_id']).eq('post_id', data['post_id']).execute()
            return jsonify({"status": "unliked"}), 200
        else:
            supabase.table('likes').insert({'user_id': data['user_id'], 'post_id': data['post_id']}).execute()
            return jsonify({"status": "liked"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/comments', methods=['GET', 'POST'])
def handle_comments():
    try:
        if request.method == 'GET':
            post_id = request.args.get('post_id')
            response = supabase.table('comments').select('*, profiles(username)').eq('post_id', post_id).order('created_at', desc=True).execute()
            return jsonify(response.data), 200
        if request.method == 'POST':
            data = request.json
            response = supabase.table('comments').insert({
                'user_id': data['user_id'], 'post_id': data['post_id'], 'content': data['content']
            }).execute()
            return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/chat', methods=['POST'])
def chat_with_mentor():
    try:
        if not gemini_key or not model:
            return jsonify({"reply": "AI not configured on server."}), 500
            
        data = request.json
        user_message = data.get('message')
        
        # --- PERSONA PROMPT ---
        prompt = f"""
        Role: You are 'Prashikshan AI', an expert career mentor bridging the gap between Academia and Industry.
        Target Audience: Computer Science & Engineering students (often from Tier 2/3 colleges).
        
        Guidelines:
        1. Be Encouraging but Realistic.
        2. Use structured Bullet Points.
        3. Keep response under 150 words.

        User Question: {user_message}
        """
        
        response = model.generate_content(prompt)
        return jsonify({"reply": response.text})

    except Exception as e:
        print(f"AI Error: {e}")
        return jsonify({"reply": "I am having trouble connecting to my brain right now."}), 500

# --- USER PROFILE & ONBOARDING ---

@app.route('/api/profile', methods=['POST'])
def update_profile():
    try:
        data = request.json
        user_id = data.get('user_id')
        
        # Data to update
        updates = {
            'full_name': data.get('full_name'),
            'college': data.get('college'),
            'branch': data.get('branch'),
            'skills': data.get('skills'), # Sent as string "React, Python"
            'graduation_year': data.get('graduation_year')
        }

        # Update the row in Supabase
        response = supabase.table('profiles').update(updates).eq('id', user_id).execute()
        
        return jsonify({"status": "success", "data": response.data}), 200

    except Exception as e:
        print(f"Profile Update Error: {e}")
        return jsonify({"error": str(e)}), 400

@app.route('/api/profile', methods=['GET'])
def get_profile():
    try:
        user_id = request.args.get('user_id')
        response = supabase.table('profiles').select('*').eq('id', user_id).execute()
        
        if len(response.data) > 0:
            return jsonify(response.data[0]), 200
        else:
            return jsonify({"error": "Profile not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    # --- EXPLORE & FOLLOW SYSTEM ---

@app.route('/api/explore', methods=['GET'])
def explore_users():
    try:
        current_user_id = request.args.get('user_id')
        search_query = request.args.get('q', '') # Get search text, default empty

        # 1. Base Query: Get all profiles except self
        query = supabase.table('profiles').select('*').neq('id', current_user_id)
        
        # 2. If searching, filter by username or full_name
        if search_query:
            # ilike is case-insensitive search
            query = query.or_(f"username.ilike.%{search_query}%,full_name.ilike.%{search_query}%")
        
        # Limit results to 20 to keep it fast
        profiles = query.limit(20).execute().data

        # 3. Enhance Data: Check Follow Status for each profile
        # (This is a simple way; for millions of users we would use a SQL Join)
        results = []
        
        # Get list of people I follow
        my_follows = supabase.table('follows').select('following_id').eq('follower_id', current_user_id).execute()
        my_following_ids = [row['following_id'] for row in my_follows.data]

        # Get list of people following ME (for mutual check)
        follows_me = supabase.table('follows').select('follower_id').eq('following_id', current_user_id).execute()
        follows_me_ids = [row['follower_id'] for row in follows_me.data]

        for p in profiles:
            is_following = p['id'] in my_following_ids
            is_followed_by = p['id'] in follows_me_ids
            is_mutual = is_following and is_followed_by

            results.append({
                **p,
                "is_following": is_following,
                "is_mutual": is_mutual
            })

        return jsonify(results), 200

    except Exception as e:
        print(f"Explore Error: {e}")
        return jsonify({"error": str(e)}), 400


@app.route('/api/follow', methods=['POST'])
def toggle_follow():
    try:
        data = request.json
        follower_id = data.get('follower_id') # ME
        following_id = data.get('following_id') # THEM

        # Check if already following
        check = supabase.table('follows').select('*').eq('follower_id', follower_id).eq('following_id', following_id).execute()

        if len(check.data) > 0:
            # Unfollow
            supabase.table('follows').delete().eq('follower_id', follower_id).eq('following_id', following_id).execute()
            return jsonify({"status": "unfollowed"}), 200
        else:
            # Follow
            supabase.table('follows').insert({'follower_id': follower_id, 'following_id': following_id}).execute()
            return jsonify({"status": "followed"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400
    
    # --- DIRECT MESSAGING SYSTEM ---

@app.route('/api/messages', methods=['GET'])
def get_messages():
    try:
        user1 = request.args.get('user1') # Me
        user2 = request.args.get('user2') # Friend

        # Fetch chat history: (Me -> Friend) OR (Friend -> Me)
        # We use a special Supabase syntax for "OR + AND" logic
        response = supabase.table('messages')\
            .select('*')\
            .or_(f"and(sender_id.eq.{user1},receiver_id.eq.{user2}),and(sender_id.eq.{user2},receiver_id.eq.{user1})")\
            .order('created_at', desc=False)\
            .execute()
            
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/messages', methods=['POST'])
def send_message():
    try:
        data = request.json
        # Insert message
        response = supabase.table('messages').insert({
            'sender_id': data.get('sender_id'),
            'receiver_id': data.get('receiver_id'),
            'content': data.get('content')
        }).execute()
        
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)