import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, MessageSquare, PlusSquare, User, LogOut, Bell, BookOpen } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isTeacher } = useUserRole(); // 👈 Checks if you are a Teacher

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: BookOpen, label: "Classroom", path: "/classroom" },
    { icon: PlusSquare, label: "Create", path: "/create" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r border-border bg-card sticky top-0 left-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          PRASHIKSHAN
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;