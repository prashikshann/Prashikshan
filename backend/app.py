import os
import time 
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase Client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing required environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Flask and enable CORS
app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return jsonify({"status": "System Operational"})

# --- 1. GET FEED (Updated to count Likes & Comments) ---
@app.route('/api/feed', methods=['GET'])
def get_feed():
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    try:
        # A. Find who this user follows
        follows_response = supabase.table('follows')\
            .select('following_id')\
            .eq('follower_id', user_id)\
            .execute()
            
        following_ids = [row['following_id'] for row in follows_response.data]
        following_ids.append(user_id) # Add self

        # B. Get posts + Counts
        # The syntax 'likes(count)' tells Supabase to just count them
        posts_response = supabase.table('posts')\
            .select('*, profiles(username, avatar_url), likes(count), comments(count)')\
            .in_('user_id', following_ids)\
            .order('created_at', desc=True)\
            .execute()

        return jsonify(posts_response.data), 200
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 400
    

# --- 2. CREATE POST  ---
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
            
            supabase.storage.from_('posts').upload(
                path=filename,
                file=file_data,
                file_options={"content-type": file.content_type}
            )
            image_url = supabase.storage.from_('posts').get_public_url(filename)

        response = supabase.table('posts').insert({
            'user_id': user_id,
            'content': content,
            'image_url': image_url
        }).execute()
        
        return jsonify(response.data), 201

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 400


# --- 3. TOGGLE LIKE (New Feature) ---
@app.route('/api/posts/like', methods=['POST'])
def toggle_like():
    data = request.json
    user_id = data.get('user_id')
    post_id = data.get('post_id')

    try:
        # Check if user already liked this post
        existing_like = supabase.table('likes')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('post_id', post_id)\
            .execute()

        if len(existing_like.data) > 0:
            # If exists -> DELETE (Unlike)
            supabase.table('likes')\
                .delete()\
                .eq('user_id', user_id)\
                .eq('post_id', post_id)\
                .execute()
            return jsonify({"status": "unliked"}), 200
        else:
            # If not exists -> INSERT (Like)
            supabase.table('likes').insert({
                'user_id': user_id,
                'post_id': post_id
            }).execute()
            return jsonify({"status": "liked"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- 4. COMMENTS SYSTEM  ---
@app.route('/api/comments', methods=['GET', 'POST'])
def handle_comments():
    try:
        # GET: Fetch comments for a specific post
        if request.method == 'GET':
            post_id = request.args.get('post_id')
            
            response = supabase.table('comments')\
                .select('*, profiles(username)')\
                .eq('post_id', post_id)\
                .order('created_at', desc=True)\
                .execute()
            
            return jsonify(response.data), 200

        # POST: Create a new comment
        if request.method == 'POST':
            data = request.json
            
            response = supabase.table('comments').insert({
                'user_id': data['user_id'],
                'post_id': data['post_id'],
                'content': data['content']
            }).execute()
            
            return jsonify(response.data), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)