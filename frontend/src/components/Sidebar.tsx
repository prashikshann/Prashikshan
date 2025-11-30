import { Home, Compass, PlusSquare, MessageCircle, User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Compass, label: "Explore", path: "/explore" },
    { icon: PlusSquare, label: "Create", path: "/create" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <aside 
      className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex-col z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          PRASHISKSHAN
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Academia-Industry Interface</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4" aria-label="Primary">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <button 
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          aria-label="Log out of your account"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
