import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bell, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoryCircle from "@/components/StoryCircle";
import PostCard from "@/components/PostCard";
import BottomNav from "@/components/BottomNav";

// --- CONFIGURATION ---
// 1. Python Backend URL
const API_URL = 'https://prashikshan-f.onrender.com/api'; 
// 2. TEST USER ID
const CURRENT_USER_ID = '368f5f25-57c2-4462-83be-d3af0c1e7fb9'; 

const Home = () => {
  // --- STATE ---
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");

  // Hardcoded stories for now (Visual only)
  const stories = [
    { name: "Your Story", hasStory: false },
    { name: "Priya S.", hasStory: true },
    { name: "Rahul K.", hasStory: true },
    { name: "Tech Corp", hasStory: true },
  ];

  // --- LOGIC ---

  // 1. Fetch Feed on Load
  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const response = await axios.get(`${API_URL}/feed?user_id=${CURRENT_USER_ID}`);
      setPosts(response.data);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Create Post
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    try {
      // Optimistic UI update 
      const optimisticPost = {
        id: Date.now(),
        content: newPostContent,
        created_at: new Date().toISOString(),
        profiles: { username: "Me", avatar_url: "" }
      };
      setPosts([optimisticPost, ...posts]);

      // Send to Backend
      await axios.post(`${API_URL}/posts`, {
        user_id: CURRENT_USER_ID,
        content: newPostContent,
        image_url: "" 
      });
      
      setNewPostContent("");
      fetchFeed(); // Refresh to get the real data from DB
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to post. Check backend connection.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            PRASHISKSHAN
          </h1>
          <Button variant="ghost" size="icon" className="text-foreground">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* Stories Section */}
        <div className="px-4 py-4 border-b border-border bg-card">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {stories.map((story, index) => (
              <StoryCircle key={index} name={story.name} hasStory={story.hasStory} />
            ))}
          </div>
        </div>

        {/* Create Post Input */}
        <div className="px-4 py-4 border-b border-border bg-card">
          <form onSubmit={handlePostSubmit} className="flex gap-2">
            <input 
              type="text"
              placeholder="What's happening?"
              className="flex-1 bg-muted/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            <Button size="icon" type="submit" variant="default" className="rounded-full">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Feed Section */}
        <div className="px-4 py-4 space-y-4">
          {loading ? (
             <p className="text-center text-muted-foreground py-10">Loading updates...</p>
          ) : posts.length === 0 ? (
             <div className="text-center py-10">
                <p className="text-muted-foreground">No posts yet.</p>
                <p className="text-xs text-muted-foreground">Try creating one above!</p>
             </div>
          ) : (
            posts.map((post, index) => (
              <PostCard 
                key={post.id || index}
                // MAPPING: Database Data -> UI Component Props
                author={post.profiles?.username || "Unknown User"} 
                role="Community Member" // We don't have 'role' in DB yet, so we use a default
                content={post.content}
                likes={0} // Default for now
                comments={0} // Default for now
                timeAgo={new Date(post.created_at).toLocaleDateString()}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;