import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar"; 
import BottomNav from "./components/BottomNav"; 

// Pages
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Create from "./pages/Create"; 
import Profile from "./pages/Profile";
import Classroom from "./pages/Classroom";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// A wrapper to hide Sidebar on Login page
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login";

  return (
    <div className="flex min-h-screen bg-background w-full">
      {/* 1. Sidebar (Desktop Only) */}
      {!isAuthPage && <Sidebar />}

      {/* 2. Main Content Area */}
      <main className="flex-1 w-full relative">
        {children}
      </main>
      
      {/* 3. Bottom Nav (Mobile Only) */}
      {!isAuthPage && <BottomNav />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/classroom" element={<Classroom />} />
            <Route path="/create" element={<Create />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;