import os
from dotenv import load_dotenv
from flask import Flask, jsonify
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


if __name__ == "__main__":
    app.run(debug=True)
