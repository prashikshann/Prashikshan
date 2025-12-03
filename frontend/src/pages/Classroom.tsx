import React, { useState } from "react";
import BottomNav from "@/components/BottomNav";
import axios from "axios";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, Download, Clock, CheckCircle, 
  Users, Briefcase, Code, GraduationCap, MoreVertical,
  Link as LinkIcon, X, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Classroom = () => {
  const [activeTab, setActiveTab] = useState("people");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // --- MOCK DATA: STUDENTS ---
  const students = [
    { id: 1, name: "Rahul S.", avatar: "RS", status: "interning", color: "border-blue-500 text-blue-500" },
    { id: 2, name: "Priya K.", avatar: "PK", status: "course", color: "border-green-500 text-green-500" },
    { id: 3, name: "Amit V.", avatar: "AV", status: "project", color: "border-purple-500 text-purple-500" },
    { id: 4, name: "Sneha J.", avatar: "SJ", status: "idle", color: "border-gray-200 text-gray-400" },
    { id: 5, name: "Vikram", avatar: "VR", status: "course", color: "border-green-500 text-green-500" },
    { id: 6, name: "Arjun", avatar: "AM", status: "idle", color: "border-gray-200 text-gray-400" },
    { id: 7, name: "Zara", avatar: "ZK", status: "interning", color: "border-blue-500 text-blue-500" },
    { id: 8, name: "Dev", avatar: "DP", status: "project", color: "border-purple-500 text-purple-500" },
    { id: 9, name: "Riya", avatar: "RL", status: "idle", color: "border-gray-200 text-gray-400" },
    { id: 10, name: "Karan", avatar: "KS", status: "course", color: "border-green-500 text-green-500" },
  ];

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. Get Current User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Call API
      // const API_URL = 'https://prashikshan-f.onrender.com/api';
      const API_URL = 'http://127.0.0.1:5000/api'; 

      const res = await axios.post(`${API_URL}/classrooms/join`, {
        user_id: user.id,
        code: joinCode
      });

      alert(res.data.message); 
      setShowJoinModal(false);
      setJoinCode("");
      
      // TODO: Refresh the student grid here

    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to join class");
    }
  };

  // --- MOCK DATA: ASSIGNMENTS ---
  const assignments = [
    {
      id: 1,
      title: "Data Structures: Linked Lists",
      description: "Implement a doubly linked list in C++.",
      status: "pending",
      date: "Due: Tomorrow",
      isOfflineReady: true,
    },
    {
      id: 2,
      title: "Internship Logbook: Week 4",
      description: "NEP Compliance Report submission.",
      status: "submitted",
      date: "Submitted",
      isOfflineReady: true,
    }
  ];

  // Helper: Get Tiny Icon for Status
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'interning': return <Briefcase className="w-3 h-3 fill-current" />;
      case 'course': return <GraduationCap className="w-3 h-3 fill-current" />;
      case 'project': return <Code className="w-3 h-3 fill-current" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 relative">
      
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Join Classroom</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">ENTER CLASS CODE</label>
                <input 
                  type="text" 
                  placeholder="e.g. 8X-29-A" 
                  className="w-full bg-muted/50 border border-border rounded-lg p-3 text-center text-xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  Ask your teacher for the code written on the board.
                </p>
              </div>
              <Button type="submit" className="w-full gap-2 font-bold">
                Join Class <ArrowRight className="w-4 h-4"/>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Header:College Context */}
      <header className="sticky top-0 z-10 bg-card border-b border-border p-4 flex justify-between items-start">
        <div>
            <h1 className="text-xl font-bold text-foreground">
              B.Tech CS - Sem 5
            </h1>
            <p className="text-xs text-muted-foreground">Software Engineering Batch '25</p>
        </div>
        <div className="flex flex-col items-end gap-1">
             <span className="text-[10px] font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                CODE: 8X-29-A
             </span>
        </div>
      </header>

      {/* Compact Tabs */}
      <div className="flex border-b border-border bg-card">
        <button 
          onClick={() => setActiveTab("people")}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide ${activeTab === "people" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Classmates ({students.length})
        </button>
        <button 
          onClick={() => setActiveTab("assignments")}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide ${activeTab === "assignments" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Assignments
        </button>
      </div>

      <div className="p-4">
        
        {/* --- TAB 1: PEOPLE GRID (Compact & Professional) --- */}
        {activeTab === "people" && (
          <div>
            {/* Legend / Key */}
            <div className="flex gap-4 mb-6 justify-center">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Interning</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2 h-2 rounded-full bg-green-500"></div>Course</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Project</div>
            </div>

            {/* The Grid: 4 columns for mobile */}
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                
                {/* Invite Button - Now clickable! */}
                <div 
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                  onClick={() => setShowJoinModal(true)} 
                >
                    <div className="w-14 h-14 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center text-muted-foreground bg-muted/20 group-hover:bg-primary/10 transition-colors">
                        <LinkIcon className="w-5 h-5"/>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">Invite</span>
                </div>

                {/* Students */}
                {students.map((student) => (
                    <div key={student.id} className="flex flex-col items-center gap-2 relative group cursor-pointer">
                        {/* Avatar Container with Status Ring */}
                        <div className={`relative w-14 h-14 rounded-full border-2 p-[2px] ${student.color} hover:scale-105 transition-transform`}>
                            {/* The Actual Image/Avatar */}
                            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground overflow-hidden">
                                {student.avatar}
                            </div>
                            
                            {/* Tiny Status Badge Icon (Bottom Right) */}
                            {student.status !== 'idle' && (
                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center shadow-sm ${student.color}`}>
                                    {getStatusIcon(student.status)}
                                </div>
                            )}
                        </div>
                        
                        {/* Name */}
                        <span className="text-[10px] font-medium text-center truncate w-full px-1">
                            {student.name}
                        </span>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* --- TAB 2: ASSIGNMENTS (Clean List) --- */}
        {activeTab === "assignments" && (
          <div className="space-y-3">
             {assignments.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                  <div className={`mt-1 p-2 rounded-md ${task.status === 'submitted' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {task.status === 'submitted' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate">{task.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                            {task.date}
                        </span>
                        {task.isOfflineReady && (
                            <span className="text-[10px] border border-border px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Download className="w-2 h-2" /> Packet
                            </span>
                        )}
                      </div>
                  </div>
              </div>
            ))}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
};

export default Classroom;