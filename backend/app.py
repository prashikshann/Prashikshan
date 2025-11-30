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
    raise ValueError("Missing required environment variables: SUPABASE_URL and/or SUPABASE_KEY")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Flask and enable CORS
app = Flask(__name__)
CORS(app)


@app.route("/")
def index():
    return jsonify({"status": "System Operational"})


# Route to get the feed
@app.route('/api/feed', methods=['GET'])
def get_feed():
    # 1. Who is asking for the feed?
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    try:
        # 2. Find who this user follows
        follows_response = supabase.table('follows')\
            .select('following_id')\
            .eq('follower_id', user_id)\
            .execute()
            
        # Extract just the IDs into a clean list: ['123', '456']
        following_ids = [row['following_id'] for row in follows_response.data]
        
        # Add the user's OWN ID so they see their own posts too
        following_ids.append(user_id)

        # 3. Get posts from these authors
        posts_response = supabase.table('posts')\
            .select('*, profiles(username, avatar_url)')\
            .in_('user_id', following_ids)\
            .order('created_at', desc=True)\
            .execute()

        return jsonify(posts_response.data), 200
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 400
    

# Route to create a new post with Image Upload ---
@app.route('/api/posts', methods=['POST'])
def create_post():
    try:
        # 1. Get data from the frontend (Using form/files, not JSON)
        user_id = request.form.get('user_id')
        content = request.form.get('content')
        file = request.files.get('file') # Catch the file
        image_url = ""

        # 2. If there is an image, upload it to Supabase Storage
        if file:
            # Create a unique filename so they don't overwrite each other
            filename = f"{int(time.time())}_{file.filename}"
            
            # Read file data
            file_data = file.read()
            
            # Upload to Supabase Storage 'posts' bucket
            bucket_response = supabase.storage.from_('posts').upload(
                path=filename,
                file=file_data,
                file_options={"content-type": file.content_type}
            )
            
            # Get the Public URL so the frontend can display it
            image_url = supabase.storage.from_('posts').get_public_url(filename)

        # 3. Save to Database
        response = supabase.table('posts').insert({
            'user_id': user_id,
            'content': content,
            'image_url': image_url
        }).execute()
        
        return jsonify(response.data), 201

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)