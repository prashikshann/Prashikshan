import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bell, Send, Image as ImageIcon } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import StoryCircle from "@/components/StoryCircle";
import PostCard from "@/components/PostCard";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// CONFIGURATION
//const API_URL = 'http://127.0.0.1:5000/api'; 
const API_URL = 'https://prashikshan-f.onrender.com/api';

const Home = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // NEW: Store the Real User ID here (No more hardcoding!)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const stories = [
    { name: "Your Story", hasStory: false },
    { name: "Priya S.", hasStory: true },
    { name: "Rahul K.", hasStory: true },
    { name: "Tech Corp", hasStory: true },
  ];

  // --- LOGIC ---

  // 1. Get the Real User on Load
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login"); // Protect the route
        return;
      }
      
      setCurrentUserId(user.id);
      fetchFeed(user.id); 
    };

    checkUser();
  }, []);

  const fetchFeed = async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/feed?user_id=${userId}`);
      setPosts(response.data);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Post with Image
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !selectedFile) return;
    if (!currentUserId) return; 

    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId); // Use Real ID
      formData.append('content', newPostContent);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await axios.post(`${API_URL}/posts`, formData);
      
      setNewPostContent("");
      setSelectedFile(null); 
      fetchFeed(currentUserId); 
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to post.");
    }
  };
  
  // 3. Handle Like Logic
  const handleLike = async (postId: string) => {
    if (!currentUserId) return;

    // Optimistic UI Update
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return { 
          ...post, 
          likes: [{ count: (post.likes?.[0]?.count || 0) + 1 }] 
        };
      }
      return post;
    }));

    try {
      await axios.post(`${API_URL}/posts/like`, {
        user_id: currentUserId, // Use Real ID
        post_id: postId
      });
    } catch (error) {
      console.error("Error liking:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
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
        <div className="px-4 py-4 border-b border-border bg-card">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {stories.map((story, index) => (
              <StoryCircle key={index} name={story.name} hasStory={story.hasStory} />
            ))}
          </div>
        </div>

        {/* Create Post Input */}
        <div className="px-4 py-4 border-b border-border bg-card">
          <form onSubmit={handlePostSubmit} className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-2">
              <input 
                type="text"
                placeholder="What's happening?"
                className="w-full bg-muted/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              
              {selectedFile && (
                <div className="relative w-fit">
                   <img 
                     src={URL.createObjectURL(selectedFile)} 
                     alt="Preview" 
                     className="h-20 rounded-md border border-border" 
                   />
                   <button 
                     type="button"
                     onClick={() => setSelectedFile(null)}
                     className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                   >
                     ×
                   </button>
                </div>
              )}
            </div>

            <input
              type="file"
              id="image-upload"
              accept="image/*"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
            />
            
            <label 
              htmlFor="image-upload" 
              className="p-2 cursor-pointer hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
            </label>

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
                <p className="text-xs text-muted-foreground">Follow people to see updates!</p>
             </div>
          ) : (
            posts.map((post, index) => (
              <PostCard 
                key={post.id || index}
                id={post.id}
                author={post.profiles?.username || "Unknown User"} 
                role="Community Member"
                content={post.content}
                imageUrl={post.image_url} 
                likes={post.likes?.[0]?.count || 0} 
                commentCount={post.comments?.[0]?.count || 0} 
                onLike={handleLike}
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