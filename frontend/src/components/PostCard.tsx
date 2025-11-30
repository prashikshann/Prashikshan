import React from "react";
import { MessageCircle, Heart, Share2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

// 1. We update the type definition to include optional imageUrl
interface PostCardProps {
  author: string;
  role: string;
  content: string;
  timeAgo: string;
  likes: number;
  comments: number;
  imageUrl?: string; // <--- ADD THIS LINE (The ? means it's optional)
}

const PostCard = ({ 
  author, 
  role, 
  content, 
  timeAgo, 
  likes, 
  comments,
  imageUrl // <--- Destructure it here
}: PostCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
            {author[0]}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{author}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{role}</span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-sm mb-4 whitespace-pre-wrap">{content}</p>

      {/* 2. Logic to display the image if it exists */}
      {imageUrl && (
        <div className="mb-4 rounded-lg overflow-hidden border border-border">
          <img 
            src={imageUrl} 
            alt="Post content" 
            className="w-full h-auto object-cover max-h-[500px]"
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-4">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Heart className="w-4 h-4" />
            <span>{likes}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span>{comments}</span>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PostCard;