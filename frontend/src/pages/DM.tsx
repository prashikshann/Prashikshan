import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; // To get friend's ID from URL
import axios from "axios";
import { Send, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const API_URL = 'https://prashikshan-f.onrender.com/api';
//const API_URL = 'http://127.0.0.1:5000/api'; 

const DM = () => {
  const { friendId } = useParams(); // Get friend's ID from the URL link
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [myId, setMyId] = useState("");
  const [friendName, setFriendName] = useState("Loading...");

  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Initialize: Get My ID + Friend's Name + Load Chats
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate('/login');
      setMyId(user.id);
      
      // Fetch Friend's Name (Using our existing Profile API)
      try {
        const profile = await axios.get(`${API_URL}/profile?user_id=${friendId}`);
        if (profile.data) {
            setFriendName(profile.data.full_name || profile.data.username);
        }
      } catch (e) {
        console.error("Friend not found");
      }

      // Load Chat History
      fetchMessages(user.id);
      
      // POLL: Check for new messages every 3 seconds (Simple real-time)
      const interval = setInterval(() => fetchMessages(user.id), 3000);
      return () => clearInterval(interval);
    };
    init();
  }, [friendId, navigate]);

  const fetchMessages = async (userId: string) => {
    if (!friendId) return;
    try {
      const res = await axios.get(`${API_URL}/messages?user1=${userId}&user2=${friendId}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      // Send to Backend
      await axios.post(`${API_URL}/messages`, {
        sender_id: myId,
        receiver_id: friendId,
        content: input
      });
      
      // Optimistic UI Update (Add to list immediately)
      // Note: The polling will refresh this from the DB in 3 seconds anyway
      setMessages([...messages, { 
          id: Date.now(), 
          sender_id: myId, 
          content: input, 
          created_at: new Date().toISOString() 
      }]);
      
      setInput("");
    } catch (err) {
      console.error(err);
      alert("Failed to send");
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-4 bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-4 h-4" />
            </div>
            <div>
                <h2 className="font-bold text-sm">{friendName}</h2>
                <p className="text-xs text-muted-foreground">Online</p>
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === myId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                isMe 
                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                : 'bg-muted text-foreground rounded-tl-none border border-border'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-background border-t border-border">
        <form onSubmit={handleSend} className="flex gap-2 max-w-2xl mx-auto">
          <Input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Type a message..." 
            className="rounded-full"
          />
          <Button type="submit" size="icon" className="rounded-full">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DM;