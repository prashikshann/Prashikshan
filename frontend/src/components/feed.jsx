import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Replace this with your actual Python Backend URL
// For now, it is localhost. Later, it will be your Render URL.
const API_URL = 'http://127.0.0.1:5000/api';

// HARDCODED USER ID for testing (Use the one you copied earlier!)
const CURRENT_USER_ID = 'PASTE_YOUR_UUID_HERE'; 

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');

  // 1. Fetch the Feed when component loads
  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API_URL}/feed?user_id=${CURRENT_USER_ID}`);
      setPosts(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching feed:", error);
      setLoading(false);
    }
  };

  // 2. Handle creating a new post
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPostContent) return;

    try {
      await axios.post(`${API_URL}/posts`, {
        user_id: CURRENT_USER_ID,
        content: newPostContent,
        image_url: "" // We will handle images later
      });
      
      // Clear input and refresh feed
      setNewPostContent('');
      fetchFeed(); 
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <div style={styles.container}>
      {/* Post Input Section */}
      <div style={styles.inputBox}>
        <form onSubmit={handlePostSubmit}>
          <textarea
            style={styles.textarea}
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What's on your mind?"
          />
          <button type="submit" style={styles.button}>Post</button>
        </form>
      </div>

      {/* Feed List Section */}
      <div style={styles.feedList}>
        {loading ? (
          <p>Loading feed...</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={styles.card}>
              <div style={styles.cardHeader}>
                {/* Check if profiles exists before trying to access username */}
                <strong>{post.profiles?.username || 'Unknown User'}</strong>
                <span style={styles.date}>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              <p>{post.content}</p>
              {post.image_url && (
                <img src={post.image_url} alt="Post" style={styles.image} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Simple CSS-in-JS for quick styling (Web First Responsive)
const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  inputBox: {
    background: '#fff',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    marginBottom: '10px',
    resize: 'vertical',
  },
  button: {
    backgroundColor: '#0070f3',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  card: {
    background: '#fff',
    border: '1px solid #eaeaea',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    color: '#555',
  },
  date: {
    fontSize: '0.8rem',
    color: '#999',
  },
  image: {
    width: '100%',
    borderRadius: '8px',
    marginTop: '10px',
  }
};

export default Feed;