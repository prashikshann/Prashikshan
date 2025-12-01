import os
import time 
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
import google.generativeai as genai  # <--- Essential Import

# Load environment variables
load_dotenv()

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

# --- SETUP 3: FLASK ---
app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return jsonify({"status": "System Operational"})

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
    

if __name__ == "__main__":
    app.run(debug=True)