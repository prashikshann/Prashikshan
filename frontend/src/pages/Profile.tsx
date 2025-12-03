import React, { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Calendar, Briefcase, BookOpen, 
  Edit, Settings, LogOut 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

     
      const { data, error } = await (supabase as any)
        .from('profiles') 
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* 1. Header / Cover Area */}
      <div className="h-32 bg-gradient-to-r from-primary/80 to-secondary/80 relative">
        <div className="absolute top-4 right-4 flex gap-2">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                <Settings className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
            </Button>
        </div>
      </div>

      {/* 2. Main Profile Card */}
      <div className="px-4 -mt-12 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center -mt-16 mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-background bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground overflow-hidden">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        profile?.username?.[0]?.toUpperCase()
                    )}
                </div>
                
                <h2 className="mt-2 text-xl font-bold">{profile?.username || "Unnamed User"}</h2>
                
                {/* ROLE BADGE (RBAC Visual) */}
                <span className={`mt-1 px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border 
                    ${profile?.role === 'faculty' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                      profile?.role === 'industry' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                      'bg-green-100 text-green-700 border-green-200'}`}>
                    {profile?.role || "Student"}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 border-y border-border py-4 mb-4">
                <div className="text-center">
                    <div className="text-lg font-bold">12</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                </div>
                <div className="text-center border-l border-border">
                    <div className="text-lg font-bold">245</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                </div>
                <div className="text-center border-l border-border">
                    <div className="text-lg font-bold">180</div>
                    <div className="text-xs text-muted-foreground">Following</div>
                </div>
            </div>

            {/* Bio & Details */}
            <div className="space-y-3">
                {profile?.bio && <p className="text-sm text-center px-4">{profile.bio}</p>}
                
                <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span>{profile?.college || "Add College"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span>{profile?.branch ? `${profile.branch} (${profile.batch})` : "Add Branch"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>Jaipur, India</span>
                    </div>
                </div>
            </div>

            <Button className="w-full mt-6" variant="outline">
                <Edit className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
        </div>
      </div>

      {/* 3. Skills Section */}
      <div className="px-4 space-y-4">
         <h3 className="font-semibold text-sm">Skills & Interests</h3>
         <div className="flex flex-wrap gap-2">
            {profile?.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-muted rounded-full text-xs font-medium">
                        {skill}
                    </span>
                ))
            ) : (
                <span className="text-xs text-muted-foreground italic">No skills added yet.</span>
            )}
         </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;