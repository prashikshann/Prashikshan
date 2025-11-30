import React from "react";
import { Home, Compass, MessageSquare, PlusSquare, User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; 

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  // --- FINAL FIX: LOGOUT FUNCTION ---
const handleLogout = async () => {
  // 1. Check if supabase client exists before calling methods
  if (!supabase || !supabase.auth || typeof window === 'undefined') {
      console.error("🔴 Fatal Error: Supabase client is not initialized.");
      // If we can't sign out, we still force the visual logout.
      window.location.href = "/login";
      return;
  }
  
  console.log("🔴 Logout Button Clicked!");

  try {
    console.log("🔴 Attempting Supabase SignOut...");
    // 2. Clear the session
    await supabase.auth.signOut();
    console.log("🟢 Supabase SignOut Success");
  } catch (err) {
    console.error("🔴 Supabase Error:", err);
  } finally {
    // 3. Force redirect and clear storage, regardless of database error
    console.log("🔴 Clearing Storage & Redirecting...");
    localStorage.clear();
    window.location.href = "/login";
  }
};

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: PlusSquare, label: "Create", path: "/create" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 border-r border-border bg-card px-4 py-8">
      <div className="mb-8 px-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          PRASHISKSHAN
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-border pt-4">
        {/* Simplified Button Structure to ensure clicks register */}
        <div 
          onClick={handleLogout} 
          className="flex w-full items-center gap-4 px-4 py-3 text-muted-foreground hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;