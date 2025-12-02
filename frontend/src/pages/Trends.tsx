import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  ExternalLink, Search, TrendingUp, BookOpen, Laptop, RefreshCw,
  Briefcase, Brain, Rocket, Code, Github, Star, MessageSquare
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface Article {
  title: string;
  link: string;
  published: string;
  source: string;
  description?: string;
  image?: string | null;
  category?: string;
  score?: number;
  comments?: number;
  language?: string;
  stars?: string;
  tags?: string[];
  reactions?: number;
}

interface TrendsData {
  tech: Article[];
  education: Article[];
  general: Article[];
  career?: Article[];
  ai_ml?: Article[];
  startups?: Article[];
}

const Trends = () => {
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<Article[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [currentFeedVersion, setCurrentFeedVersion] = useState<number>(0);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const categories = [
    { id: 'tech', label: 'Technology', icon: Laptop, color: 'bg-blue-500' },
    { id: 'education', label: 'Education', icon: BookOpen, color: 'bg-green-500' },
    { id: 'career', label: 'Career & Jobs', icon: Briefcase, color: 'bg-purple-500' },
    { id: 'ai', label: 'AI & ML', icon: Brain, color: 'bg-pink-500' },
    { id: 'startups', label: 'Startups', icon: Rocket, color: 'bg-orange-500' },
    { id: 'developer', label: 'Developer', icon: Code, color: 'bg-cyan-500' },
    { id: 'github', label: 'GitHub Trending', icon: Github, color: 'bg-gray-700' },
  ];

  // Check for feed version updates
  const checkFeedVersion = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trends/version`);
      const data = await response.json();
      if (data.version && data.version !== currentFeedVersion) {
        if (currentFeedVersion > 0) {
          // Feed was updated by admin, reload
          console.log(`Feed updated: v${currentFeedVersion} -> v${data.version}`);
          fetchTrends();
        }
        setCurrentFeedVersion(data.version);
      }
    } catch (error) {
      console.error("Error checking feed version:", error);
    }
  };

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/trends`);
      const data = await response.json();
      setTrends(data);
    } catch (error) {
      console.error("Error fetching trends:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategory = async (categoryId: string) => {
    setCategoryLoading(true);
    setActiveCategory(categoryId);
    try {
      const response = await fetch(`${API_URL}/api/trends/${categoryId}`);
      const data = await response.json();
      setCategoryData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(`Error fetching ${categoryId}:`, error);
      setCategoryData([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(`${API_URL}/api/trends/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error searching news:", error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchTrends();
    // Only check version once on load, not constantly polling
    // This saves Render free tier resources
    checkFeedVersion();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Source-based placeholder images
  const getPlaceholderImage = (source: string, category?: string): string => {
    const sourceImages: Record<string, string> = {
      'TechCrunch': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
      'Hacker News': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop',
      'Dev.to': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop',
      'GitHub': 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&h=300&fit=crop',
      'Product Hunt': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop',
      'The Verge': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop',
      'Wired': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop',
      'Ars Technica': 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&h=300&fit=crop',
      'BBC News': 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=400&h=300&fit=crop',
      'NDTV Education': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      'Google News': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=300&fit=crop',
    };

    const categoryImages: Record<string, string> = {
      'tech': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
      'education': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      'career': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
      'ai_ml': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
      'startup': 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop',
      'developer': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop',
      'reddit': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
      'general': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=300&fit=crop',
    };

    // First try source-based image
    for (const [key, url] of Object.entries(sourceImages)) {
      if (source?.toLowerCase().includes(key.toLowerCase())) {
        return url;
      }
    }

    // Then try category-based image
    if (category && categoryImages[category]) {
      return categoryImages[category];
    }

    // Default fallback
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=300&fit=crop';
  };

  const NewsCard = ({ article }: { article: Article }) => {
    const imageUrl = article.image || getPlaceholderImage(article.source, article.category);
    
    return (
      <Card className="hover:shadow-lg transition-all duration-300 h-full flex flex-col overflow-hidden group">
        {/* Image Section - Always show */}
        <div className="relative w-full h-44 overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getPlaceholderImage(article.source, article.category);
            }}
          />
          {/* Source badge overlay */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-black/70 text-white hover:bg-black/80 text-xs">
              {article.source}
            </Badge>
          </div>
          {/* Stats overlay for Reddit/HN */}
          {(article.score !== undefined || article.stars) && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              {article.score !== undefined && (
                <Badge variant="secondary" className="bg-white/90 text-xs flex items-center gap-1">
                  <Star className="w-3 h-3" /> {article.score}
                </Badge>
              )}
              {article.comments !== undefined && (
                <Badge variant="secondary" className="bg-white/90 text-xs flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> {article.comments}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {formatDate(article.published)}
            </span>
            {article.category && (
              <Badge variant="outline" className="text-xs capitalize">
                {article.category}
              </Badge>
            )}
          </div>
          <CardTitle className="text-sm md:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col justify-end pt-0">
          {article.description && (
            <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">
              {article.description}
            </p>
          )}
          {/* Tags for Dev.to articles */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {article.tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
          >
            Read more <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>
    );
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-64">
          <Skeleton className="h-44 w-full rounded-t-lg" />
          <CardHeader>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Trends</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrends}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Search for news topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searching}>
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Category Quick Access */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Browse by Category</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2 whitespace-nowrap"
                onClick={() => fetchCategory(cat.id)}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Category Results */}
        {activeCategory && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {categories.find(c => c.id === activeCategory)?.label} News
                {categoryLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveCategory(null);
                  setCategoryData([]);
                }}
              >
                Close
              </Button>
            </div>
            {categoryLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryData.map((article, index) => (
                  <NewsCard key={index} article={article} />
                ))}
              </div>
            )}
            {!categoryLoading && categoryData.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No articles found in this category.
              </p>
            )}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Search Results for "{searchQuery}" ({searchResults.length} results)
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchResults([]);
                  setSearchQuery("");
                }}
              >
                Clear
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((article, index) => (
                <NewsCard key={index} article={article} />
              ))}
            </div>
          </div>
        )}

        {/* Main Tabs for different categories */}
        <Tabs defaultValue="tech" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="tech" className="flex items-center gap-2">
              <Laptop className="w-4 h-4" />
              <span className="hidden sm:inline">Technology</span>
              <span className="sm:hidden">Tech</span>
            </TabsTrigger>
            <TabsTrigger value="education" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Education</span>
              <span className="sm:hidden">Edu</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">General</span>
              <span className="sm:hidden">Trends</span>
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <TabsContent value="tech">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trends?.tech?.map((article, index) => (
                    <NewsCard key={index} article={article} />
                  ))}
                </div>
                {(!trends?.tech || trends.tech.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No tech news available at the moment.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="education">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trends?.education?.map((article, index) => (
                    <NewsCard key={index} article={article} />
                  ))}
                </div>
                {(!trends?.education || trends.education.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No education news available at the moment.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="general">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trends?.general?.map((article, index) => (
                    <NewsCard key={index} article={article} />
                  ))}
                </div>
                {(!trends?.general || trends.general.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No trending news available at the moment.
                  </p>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Quick Search Suggestions */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-3">🔥 Popular Searches</h3>
          <div className="flex flex-wrap gap-2">
            {[
              'ChatGPT', 'Remote Jobs India', 'React JS', 'Python Tutorial',
              'Startup Funding', 'GATE 2025', 'Web Development', 'Machine Learning',
              'Campus Placement', 'Internship'
            ].map((term) => (
              <Badge
                key={term}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => {
                  setSearchQuery(term);
                  handleSearch();
                }}
              >
                {term}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Trends;
