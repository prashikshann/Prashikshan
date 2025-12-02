import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, RefreshCw, Database, Users, Newspaper, Settings,
  Clock, HardDrive, Cloud, CloudOff, Check, X, AlertCircle,
  TrendingUp, BarChart3, Activity, Lock, Unlock
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CacheStats {
  last_updated: string | null;
  last_refresh_duration: number;
  total_articles: number;
  category_counts: Record<string, number>;
  metadata: {
    refresh_count: number;
    created_at: string;
    version: string;
  };
  cache_file: string;
  cache_size_kb: number;
}

interface RefreshStatus {
  is_running: boolean;
  started_at: string | null;
  progress: number;
  current_task: string | null;
  last_error: string | null;
}

interface DashboardData {
  cache_stats: CacheStats;
  refresh_status: RefreshStatus;
  article_samples: Record<string, any[]>;
  is_cache_stale: boolean;
  timestamp: string;
}

const SysAdmin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Check if admin key is stored in session
  useEffect(() => {
    const storedKey = sessionStorage.getItem('adminKey');
    if (storedKey) {
      setAdminKey(storedKey);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch dashboard data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    setLoading(true);
    setLoginError("");
    
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({ admin_key: adminKey })
      });
      
      const data = await response.json();
      
      if (data.success) {
        sessionStorage.setItem('adminKey', adminKey);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.message || "Authentication failed");
      }
    } catch (error) {
      setLoginError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminKey');
    setIsAuthenticated(false);
    setAdminKey("");
    setDashboardData(null);
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/dashboard`, {
        headers: { 'X-Admin-Key': adminKey }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  const triggerRefresh = async (categories?: string[]) => {
    setRefreshing(true);
    setMessage(null);
    
    try {
      const response = await fetch(`${API_URL}/api/admin/news/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({ 
          sync_cloud: true,
          categories: categories 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'News refresh started!' });
        // Poll for status
        const pollInterval = setInterval(async () => {
          const statusRes = await fetch(`${API_URL}/api/admin/news/refresh/status`, {
            headers: { 'X-Admin-Key': adminKey }
          });
          const status = await statusRes.json();
          
          if (!status.is_running) {
            clearInterval(pollInterval);
            setRefreshing(false);
            fetchDashboardData();
            setMessage({ type: 'success', text: 'News refresh completed!' });
          }
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.message });
        setRefreshing(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to trigger refresh' });
      setRefreshing(false);
    }
  };

  const syncToCloud = async () => {
    setSyncingCloud(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/cloud/sync`, {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey }
      });
      const data = await response.json();
      setMessage({ type: data.success ? 'success' : 'error', text: data.message });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync to cloud' });
    } finally {
      setSyncingCloud(false);
    }
  };

  const clearCache = async () => {
    if (!confirm('Are you sure you want to clear the cache?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/cache/clear`, {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey }
      });
      const data = await response.json();
      setMessage({ type: data.success ? 'success' : 'error', text: data.message });
      fetchDashboardData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear cache' });
    }
  };

  const forceFeedUpdate = async () => {
    if (!confirm('This will force all users to reload the news feed. Continue?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/news/force-update`, {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey }
      });
      const data = await response.json();
      setMessage({ 
        type: data.success ? 'success' : 'error', 
        text: data.success ? `Feed updated to version ${data.new_version}. All clients will reload.` : data.message 
      });
      fetchDashboardData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to force feed update' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleString('en-IN');
    } catch {
      return dateStr;
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">System Admin</CardTitle>
            <CardDescription>
              Enter your admin key to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Admin Key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}
            </div>
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={loading || !adminKey}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Authenticate
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">System Admin</h1>
              <p className="text-sm text-muted-foreground">Prashikshan Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Connected
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <Unlock className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{message.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Refresh Status */}
        {dashboardData?.refresh_status?.is_running && (
          <Card className="border-primary">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span className="font-medium">Refreshing News...</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {dashboardData.refresh_status.current_task}
                </span>
              </div>
              <Progress value={dashboardData.refresh_status.progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <Newspaper className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.cache_stats?.total_articles || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Cached articles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {formatDate(dashboardData?.cache_stats?.last_updated || null)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.is_cache_stale ? (
                  <Badge variant="destructive" className="text-xs">Stale</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Fresh</Badge>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Refresh Time</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.cache_stats?.last_refresh_duration?.toFixed(1) || 0}s
              </div>
              <p className="text-xs text-muted-foreground">
                Last refresh duration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
              <HardDrive className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.cache_stats?.cache_size_kb || 0} KB
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.cache_stats?.metadata?.refresh_count || 0} total refreshes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Category Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData?.cache_stats?.category_counts && 
                      Object.entries(dashboardData.cache_stats.category_counts).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="capitalize">{category.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(count / (dashboardData.cache_stats.total_articles || 1)) * 100} 
                              className="w-24 h-2"
                            />
                            <span className="text-sm font-medium w-8">{count}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    onClick={() => triggerRefresh()}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh All News'}
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    className="w-full justify-start"
                    onClick={syncToCloud}
                    disabled={syncingCloud}
                  >
                    <Cloud className={`w-4 h-4 mr-2 ${syncingCloud ? 'animate-pulse' : ''}`} />
                    {syncingCloud ? 'Syncing...' : 'Sync to Cloud'}
                  </Button>

                  <Button 
                    variant="default" 
                    className="w-full justify-start bg-orange-500 hover:bg-orange-600"
                    onClick={forceFeedUpdate}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Force Feed Update (Bypass Cache)
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={fetchDashboardData}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Refresh Dashboard
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={clearCache}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Cache
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Refresh Individual Categories</CardTitle>
                <CardDescription>
                  Click to refresh specific category only
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['tech', 'education', 'career', 'ai_ml', 'startups', 'developer', 'github', 'general'].map((cat) => (
                    <Button
                      key={cat}
                      variant="outline"
                      size="sm"
                      onClick={() => triggerRefresh([cat])}
                      disabled={refreshing}
                      className="capitalize"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {cat.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sample Articles */}
            {dashboardData?.article_samples && (
              <Card>
                <CardHeader>
                  <CardTitle>Sample Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {Object.entries(dashboardData.article_samples).map(([category, articles]) => (
                        <div key={category}>
                          <h4 className="font-medium capitalize mb-2">{category}</h4>
                          <div className="space-y-2">
                            {articles.map((article: any, idx: number) => (
                              <div key={idx} className="text-sm p-2 bg-muted rounded">
                                <p className="font-medium line-clamp-1">{article.title}</p>
                                <p className="text-xs text-muted-foreground">{article.source}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Cloud Sync
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sync the local cache to Supabase storage for persistence across server restarts.
                  </p>
                  <Button onClick={syncToCloud} disabled={syncingCloud}>
                    {syncingCloud ? 'Syncing...' : 'Upload to Cloud'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CloudOff className="w-5 h-5" />
                    Load from Cloud
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Download the latest cache from Supabase storage.
                  </p>
                  <Button 
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/api/admin/cloud/load`, {
                          method: 'POST',
                          headers: { 'X-Admin-Key': adminKey }
                        });
                        const data = await res.json();
                        setMessage({ type: data.success ? 'success' : 'error', text: data.message });
                        fetchDashboardData();
                      } catch {
                        setMessage({ type: 'error', text: 'Failed to load from cloud' });
                      }
                    }}
                  >
                    Download from Cloud
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SysAdmin;
