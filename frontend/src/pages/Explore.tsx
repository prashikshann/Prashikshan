import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, UserPlus, UserCheck, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const API_URL = 'https://prashikshan-f.onrender.com/api';
//const API_URL = 'http://127.0.0.1:5000/api';

const Explore = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 1. Get My ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchUsers(user.id, ""); 
      }
    };
    getUser();
  }, []);

  // 2. Fetch Users
  const fetchUsers = async (myId: string, searchTerm: string) => {
    setLoading(true);
    try {
      // Note: We use + here too just to be safe
      const url = API_URL + '/explore?user_id=' + myId + '&q=' + searchTerm;
      const response = await axios.get(url);
      setUsers(response.data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    if (currentUserId) {
      setTimeout(() => fetchUsers(currentUserId, text), 300);
    }
  };

  const handleFollow = async (targetId: string) => {
    if (!currentUserId) return;

    setUsers(users.map(u => {
      if (u.id === targetId) {
        return { ...u, is_following: !u.is_following };
      }
      return u;
    }));

    try {
      await axios.post(`${API_URL}/follow`, {
        follower_id: currentUserId,
        following_id: targetId
      });
      fetchUsers(currentUserId, query);
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4 space-y-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Explore
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search people, colleges..." 
            className="pl-9 bg-muted/50 border-none"
            value={query}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading && <p className="text-sm text-muted-foreground text-center">Searching...</p>}
        
        {!loading && users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-10">No users found.</p>
        )}

        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {(user.full_name || user.username || "U")[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{user.full_name || user.username}</h3>
                <p className="text-xs text-muted-foreground">{user.college || "Student"}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Message Button (Only if Mutual) */}
              {user.is_mutual && (
                <Button 
                  size="icon" 
                  variant="secondary"
                  onClick={() => navigate('/dm/' + user.id)} 
                >
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                </Button>
              )}

              <Button 
                size="sm" 
                variant={user.is_following ? "outline" : "default"}
                className={user.is_following ? "text-muted-foreground" : ""}
                onClick={() => handleFollow(user.id)}
              >
                {user.is_following ? <UserCheck className="w-4 h-4 mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                {user.is_following ? "Following" : "Connect"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Explore;