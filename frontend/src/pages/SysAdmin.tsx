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
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [renderStatus, setRenderStatus] = useState<'unknown' | 'waking' | 'online' | 'offline'>('unknown');
  const [hfStatus, setHfStatus] = useState<'unknown' | 'waking' | 'online' | 'offline'>('unknown');
  const [hfLogs, setHfLogs] = useState<string[]>([]);
  const [playwrightEnabled, setPlaywrightEnabled] = useState(true);
  const [togglingPlaywright, setTogglingPlaywright] = useState(false);
  const [articlesLimit, setArticlesLimit] = useState(10);
  const [updatingLimit, setUpdatingLimit] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const HF_SCRAPER_URL = import.meta.env.VITE_HF_SCRAPER_URL || "https://parthnuwal7-prashikshan.hf.space";

  // Check if admin key is stored in session
  useEffect(() => {
    const storedKey = sessionStorage.getItem('adminKey');
    if (storedKey) {
      setAdminKey(storedKey);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch dashboard data and settings when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
      fetchSettings();
    }
  }, [isAuthenticated]);

  // Polling effect - keeps services awake when enabled
  useEffect(() => {
    let dashboardInterval: NodeJS.Timeout | null = null;
    let renderInterval: NodeJS.Timeout | null = null;
    let hfInterval: NodeJS.Timeout | null = null;

    if (isAuthenticated && pollingEnabled) {
      console.log('[SysAdmin] Polling ENABLED - starting intervals');
      
      // Initial ping to both services
      pingRenderHealth();
      pingHFHealth();
      
      // Poll dashboard data every 10s
      dashboardInterval = setInterval(() => {
        console.log('[SysAdmin] Polling: fetchDashboardData (every 10s)');
        fetchDashboardData();
      }, 10000);
      
      // Poll Render every 5 minutes to keep it awake (free tier sleeps after 15 min)
      renderInterval = setInterval(() => {
        console.log('[SysAdmin] Polling: pingRenderHealth (every 5min)');
        pingRenderHealth();
      }, 5 * 60 * 1000);
      
      // Poll HF Spaces every 10 minutes to keep it awake
      hfInterval = setInterval(() => {
        console.log('[SysAdmin] Polling: pingHFHealth (every 10min)');
        pingHFHealth();
      }, 10 * 60 * 1000);
    } else {
      console.log('[SysAdmin] Polling DISABLED');
    }

    return () => {
      console.log('[SysAdmin] Cleanup - clearing all intervals');
      if (dashboardInterval) clearInterval(dashboardInterval);
      if (renderInterval) clearInterval(renderInterval);
      if (hfInterval) clearInterval(hfInterval);
    };
  }, [isAuthenticated, pollingEnabled]);

  // Silent health check for Render (doesn't show messages)
  const pingRenderHealth = async () => {
    console.log(`[SysAdmin] API Call: GET ${API_URL}/health (Render health check)`);
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(30000)
      });
      console.log(`[SysAdmin] Render health: ${response.ok ? 'online' : 'offline'}`);
      setRenderStatus(response.ok ? 'online' : 'offline');
    } catch (err) {
      console.log('[SysAdmin] Render health: offline (error)', err);
      setRenderStatus('offline');
    }
  };

  // Silent health check for HF Spaces (doesn't show messages)
  const pingHFHealth = async () => {
    console.log(`[SysAdmin] API Call: GET ${HF_SCRAPER_URL}/health (HF Spaces health check)`);
    try {
      const response = await fetch(`${HF_SCRAPER_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(60000)
      });
      console.log(`[SysAdmin] HF Spaces health: ${response.ok ? 'online' : 'offline'}`);
      setHfStatus(response.ok ? 'online' : 'offline');
    } catch (err) {
      console.log('[SysAdmin] HF Spaces health: offline (error)', err);
      setHfStatus('offline');
    }
  };

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
    console.log(`[SysAdmin] API Call: GET ${API_URL}/api/admin/dashboard`);
    try {
      const response = await fetch(`${API_URL}/api/admin/dashboard`, {
        headers: { 'X-Admin-Key': adminKey }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[SysAdmin] Dashboard data fetched successfully');
        setDashboardData(data);
      } else {
        console.log('[SysAdmin] Dashboard fetch failed:', response.status);
      }
    } catch (error) {
      console.error("[SysAdmin] Failed to fetch dashboard data:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'X-Admin-Key': adminKey }
      });
      if (response.ok) {
        const data = await response.json();
        setPlaywrightEnabled(data.settings?.playwright_enabled ?? true);
        setArticlesLimit(data.settings?.articles_limit_per_category ?? 10);
      }
    } catch (error) {
      console.error("[SysAdmin] Failed to fetch settings:", error);
    }
  };

  const togglePlaywright = async () => {
    setTogglingPlaywright(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/playwright`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey 
        },
        body: JSON.stringify({ enabled: !playwrightEnabled })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlaywrightEnabled(data.playwright_enabled);
        setMessage({ 
          type: 'success', 
          text: `Playwright scraping ${data.playwright_enabled ? 'enabled' : 'disabled'}` 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to toggle Playwright' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle Playwright' });
    } finally {
      setTogglingPlaywright(false);
    }
  };

  const updateArticlesLimit = async (newLimit: number) => {
    setUpdatingLimit(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/settings/articles-limit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey 
        },
        body: JSON.stringify({ limit: newLimit })
      });
      
      if (response.ok) {
        const data = await response.json();
        setArticlesLimit(data.articles_limit_per_category);
        setMessage({ 
          type: 'success', 
          text: `Articles limit set to ${data.articles_limit_per_category} per category` 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to update articles limit' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update articles limit' });
    } finally {
      setUpdatingLimit(false);
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

  const wakeUpRender = async () => {
    setRenderStatus('waking');
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(60000) // 60 second timeout for cold start
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (response.ok) {
        setRenderStatus('online');
        setMessage({ 
          type: 'success', 
          text: `Render backend is awake! Response time: ${elapsed}s` 
        });
      } else {
        setRenderStatus('offline');
        setMessage({ type: 'error', text: 'Render backend returned an error' });
      }
    } catch (error: any) {
      setRenderStatus('offline');
      if (error.name === 'TimeoutError') {
        setMessage({ type: 'error', text: 'Render backend timed out (may still be starting)' });
      } else {
        setMessage({ type: 'error', text: `Failed to wake Render: ${error.message}` });
      }
    }
  };

  const wakeUpHFSpaces = async () => {
    setHfStatus('waking');
    setHfLogs([]);
    try {
      const startTime = Date.now();
      const response = await fetch(`${HF_SCRAPER_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(120000) // 120 second timeout for HF cold start
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (response.ok) {
        const data = await response.json();
        setHfStatus('online');
        setMessage({ 
          type: 'success', 
          text: `HuggingFace Spaces is awake! Response time: ${elapsed}s` 
        });
        
        // Try to fetch logs if available
        await fetchHFLogs();
      } else {
        setHfStatus('offline');
        setMessage({ type: 'error', text: 'HuggingFace Spaces returned an error' });
      }
    } catch (error: any) {
      setHfStatus('offline');
      if (error.name === 'TimeoutError') {
        setMessage({ type: 'error', text: 'HF Spaces timed out (may still be building/starting)' });
      } else {
        setMessage({ type: 'error', text: `Failed to wake HF Spaces: ${error.message}` });
      }
    }
  };

  const fetchHFLogs = async () => {
    try {
      const response = await fetch(`${HF_SCRAPER_URL}/logs`, {
        method: 'GET',
        headers: { 'X-API-Key': adminKey },
        signal: AbortSignal.timeout(10000)
      });
      if (response.ok) {
        const data = await response.json();
        setHfLogs(data.logs || []);
      }
    } catch (error) {
      console.log('Could not fetch HF logs:', error);
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
            {/* Polling Toggle - Keeps both Render and HF Spaces awake */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg border" title="Keep Render & HF Spaces awake">
              <span className="text-xs text-muted-foreground">Keep Alive</span>
              <button
                onClick={() => setPollingEnabled(!pollingEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  pollingEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    pollingEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              {pollingEnabled && (
                <RefreshCw className="w-3 h-3 text-green-500 animate-spin" />
              )}
            </div>
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

              {/* Service Wake-Up */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Service Status
                  </CardTitle>
                  <CardDescription>
                    Wake up services that may be sleeping (free tier)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Render Backend */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        renderStatus === 'online' ? 'bg-green-500' :
                        renderStatus === 'waking' ? 'bg-yellow-500 animate-pulse' :
                        renderStatus === 'offline' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium">Render Backend</p>
                        <p className="text-xs text-muted-foreground">Flask API Server</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={wakeUpRender}
                      disabled={renderStatus === 'waking'}
                    >
                      {renderStatus === 'waking' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Wake Up</>
                      )}
                    </Button>
                  </div>

                  {/* HuggingFace Spaces */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        hfStatus === 'online' ? 'bg-green-500' :
                        hfStatus === 'waking' ? 'bg-yellow-500 animate-pulse' :
                        hfStatus === 'offline' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium">HuggingFace Spaces</p>
                        <p className="text-xs text-muted-foreground">Playwright Scraper</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={wakeUpHFSpaces}
                      disabled={hfStatus === 'waking'}
                    >
                      {hfStatus === 'waking' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Wake Up</>
                      )}
                    </Button>
                  </div>

                  {/* Playwright Toggle */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${playwrightEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <p className="font-medium">Playwright Scraping</p>
                        <p className="text-xs text-muted-foreground">
                          {playwrightEnabled ? 'Using HF Spaces for JS sites' : 'Using RSS fallback only'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={togglePlaywright}
                      disabled={togglingPlaywright}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        playwrightEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                          playwrightEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Articles Limit Per Category */}
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <Newspaper className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Articles Limit Per Category</p>
                        <p className="text-xs text-muted-foreground">
                          Max articles to return per category (5-50)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={5}
                        max={50}
                        value={articlesLimit}
                        onChange={(e) => setArticlesLimit(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
                        className="w-20"
                        disabled={updatingLimit}
                      />
                      <Button
                        size="sm"
                        onClick={() => updateArticlesLimit(articlesLimit)}
                        disabled={updatingLimit}
                      >
                        {updatingLimit ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Update</>
                        )}
                      </Button>
                      <div className="flex gap-1 ml-2">
                        {[10, 15, 20, 25].map((preset) => (
                          <Button
                            key={preset}
                            size="sm"
                            variant={articlesLimit === preset ? "default" : "outline"}
                            className="w-10 h-8 p-0"
                            onClick={() => {
                              setArticlesLimit(preset);
                              updateArticlesLimit(preset);
                            }}
                            disabled={updatingLimit}
                          >
                            {preset}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* HF Spaces Logs */}
                  {hfLogs.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">HF Spaces Logs</p>
                        <Button size="sm" variant="ghost" onClick={fetchHFLogs}>
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                      <ScrollArea className="h-32">
                        <div className="space-y-1 font-mono text-xs">
                          {hfLogs.map((log, i) => (
                            <p key={i} className="text-muted-foreground">{log}</p>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
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
