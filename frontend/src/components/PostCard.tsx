import React, { useState } from "react";
import { MessageCircle, Heart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import axios from "axios";
 
const API_URL = 'https://prashikshan-f.onrender.com/api'; 
const CURRENT_USER_ID = '368f5f25-57c2-4462-83be-d3af0c1e7fb9'; 

interface PostCardProps {
  id: string;
  author: string;
  role: string;
  content: string;
  timeAgo: string;
  likes: number;
  commentCount: number; 
  imageUrl?: string;
  onLike: (id: string) => void;
}

const PostCard = ({ 
  id, author, role, content, timeAgo, likes, commentCount, imageUrl, onLike 
}: PostCardProps) => {
  
  // State for showing the comment section
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // 1. Fetch comments when user clicks the icon
  const toggleComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const res = await axios.get(`${API_URL}/comments?post_id=${id}`);
        setComments(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  // 2. Submit a new comment
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      // Optimistic Update 
      const fakeComment = {
        id: Date.now(),
        content: newComment,
        profiles: { username: "Me" }
      };
      setComments([fakeComment, ...comments]);
      setNewComment("");

      // Send to server
      await axios.post(`${API_URL}/comments`, {
        user_id: CURRENT_USER_ID,
        post_id: id,
        content: newComment
      });
    } catch (err) {
      console.error("Failed to comment", err);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
            {author[0]}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{author}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{role}</span><span>•</span><span>{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <p className="text-sm mb-4 whitespace-pre-wrap">{content}</p>
      {imageUrl && (
        <div className="mb-4 rounded-lg overflow-hidden border border-border">
          <img src={imageUrl} alt="Post" className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-4">
          <Button 
            variant="ghost" size="sm" 
            className="gap-2 text-muted-foreground hover:text-red-500 hover:bg-red-50"
            onClick={() => onLike(id)}
          >
            <Heart className={`w-4 h-4 ${likes > 0 ? "fill-red-500 text-red-500" : ""}`} />
            <span>{likes}</span>
          </Button>

          <Button 
            variant="ghost" size="sm" 
            className="gap-2 text-muted-foreground hover:text-blue-500"
            onClick={toggleComments}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentCount}</span>
          </Button>
        </div>
      </div>

      {/* COMMENT SECTION (Hidden by default) */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-dashed border-border">
          {/* List of Comments */}
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
            {loadingComments ? <p className="text-xs text-muted-foreground">Loading...</p> : 
             comments.length === 0 ? <p className="text-xs text-muted-foreground">No comments yet.</p> :
             comments.map((c: any) => (
              <div key={c.id} className="bg-muted/30 p-2 rounded-lg text-sm">
                <span className="font-bold mr-2">{c.profiles?.username || "User"}:</span>
                {c.content}
              </div>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={submitComment} className="flex gap-2">
            <Input 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..." 
              className="h-9"
            />
            <Button type="submit" size="sm" variant="secondary">
              <Send className="w-3 h-3" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostCard;