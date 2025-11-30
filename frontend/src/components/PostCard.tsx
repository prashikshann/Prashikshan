import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

interface PostCardProps {
  author: string;
  role: string;
  content: string;
  image?: string;
  likes?: number;
  comments?: number;
  timeAgo: string;
}

const PostCard = ({ author, role, content, image, likes = 0, comments = 0, timeAgo }: PostCardProps) => {
  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow animate-fade-in">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/20 text-primary">
              {author.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">{author}</h3>
            <p className="text-xs text-muted-foreground">{role} · {timeAgo}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-foreground mb-3">{content}</p>

        {/* Image */}
        {image && (
          <div className="rounded-lg overflow-hidden mb-3">
            <img src={image} alt="Post content" className="w-full h-auto object-cover" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex gap-4">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-primary">
              <Heart className="w-4 h-4" />
              <span className="text-xs">{likes}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-primary">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{comments}</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PostCard;
