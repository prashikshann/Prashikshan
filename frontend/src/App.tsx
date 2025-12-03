import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import Chat from "./pages/Chat";
import Create from "./pages/Create";
import Trends from "./pages/Trends";
import SysAdmin from "./pages/SysAdmin";
import NotFound from "./pages/NotFound";
import Sidebar from "./components/Sidebar";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import DM from "./pages/DM";
// Internship MVP imports
import Internships from "./pages/Internships";
import InternshipDetails from "./pages/InternshipDetails";
import CompanyDashboard from "./pages/CompanyDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";

const queryClient = new QueryClient();

// Create a wrapper component to conditionally hide the Sidebar
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  // Don't show sidebar on login or onboarding pages
  const hideSidebar = ["/login", "/onboarding"].includes(location.pathname);

  return (
    <div className="flex min-h-screen">
      {!hideSidebar && <Sidebar />}
      <main className={`flex-1 ${!hideSidebar ? "md:ml-64" : ""}`}>
        {children}
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dm/:friendId" element={<DM />} />
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/sysadmin" element={<SysAdmin />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/create" element={<Create />} />
            {/* Internship MVP Routes */}
            <Route path="/internships" element={<Internships />} />
            <Route path="/internships/:id" element={<InternshipDetails />} />
            <Route path="/company" element={<CompanyDashboard />} />
            <Route path="/faculty" element={<FacultyDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;