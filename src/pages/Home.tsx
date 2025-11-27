import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import StoryCircle from "@/components/StoryCircle";
import PostCard from "@/components/PostCard";
import BottomNav from "@/components/BottomNav";

const Home = () => {
  const stories = [
    { name: "Your Story", hasStory: false },
    { name: "Priya S.", hasStory: true },
    { name: "Rahul K.", hasStory: true },
    { name: "Tech Corp", hasStory: true },
    { name: "Dr. Shah", hasStory: true },
  ];

  const posts = [
    {
      author: "Priya Sharma",
      role: "Computer Science Student",
      content: "Excited to share that I just completed my internship at TechCorp! Learned so much about full-stack development. #InternshipComplete #WebDev",
      likes: 45,
      comments: 12,
      timeAgo: "2h ago"
    },
    {
      author: "Dr. Rajesh Kumar",
      role: "Faculty - Computer Science",
      content: "Proud to announce our students' projects will be showcased at the National Tech Summit next month! Great work everyone! 🎉",
      likes: 128,
      comments: 34,
      timeAgo: "5h ago"
    },
    {
      author: "TechInnovate Solutions",
      role: "Industry Partner",
      content: "Looking for talented interns in Data Science and ML. Check out our latest internship opportunities on PRASHISKSHAN!",
      likes: 89,
      comments: 23,
      timeAgo: "1d ago"
    }
  ];

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

        {/* Feed */}
        <div className="px-4 py-4 space-y-4">
          {posts.map((post, index) => (
            <PostCard key={index} {...post} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
