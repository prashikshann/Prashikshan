import React, { useState, useEffect } from "react";
import axios from "axios";
import { Send, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

//const API_URL = 'http://127.0.0.1:5000/api';
const API_URL = 'https://prashikshan-f.onrender.com/api';

const Create = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 1. Check Auth on Load
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUserId(user.id);
    };
    getUser();
  }, [navigate]);

  // 2. Handle Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile) return;
    if (!currentUserId) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      formData.append('content', content);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await axios.post(`${API_URL}/posts`, formData);
      
      // Success: Redirect to Home to see the post
      navigate('/');
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <h1 className="text-xl font-bold">Create Post</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Text Area */}
          <textarea
            placeholder="What do you want to share today?"
            className="w-full h-40 p-4 rounded-xl border border-border bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Image Preview */}
          {selectedFile && (
            <div className="relative w-full">
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Preview" 
                className="w-full max-h-64 object-cover rounded-xl border border-border"
              />
              <button 
                type="button"
                onClick={() => setSelectedFile(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              />
              <label 
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Add Photo</span>
              </label>
            </div>

            <Button disabled={loading} className="gap-2">
              <Send className="w-4 h-4" />
              {loading ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </div>

      <BottomNav />
    </div>
  );
};

export default Create;