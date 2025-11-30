import os
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
        # We get a list of rows like: [{'following_id': '123'}, {'following_id': '456'}]
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
    

# Route to create a new post
@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    
    # 1. Get data from the frontend
    user_id = data.get('user_id')
    content = data.get('content')
    image_url = data.get('image_url')

    # 2. Insert into Supabase
    try:
        response = supabase.table('posts').insert({
            'user_id': user_id,
            'content': content,
            'image_url': image_url
        }).execute()
        
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    app.run(debug=True)
