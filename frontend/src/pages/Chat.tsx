import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import ReactMarkdown from "react-markdown";

//const API_URL = 'https://prashikshan-f.onrender.com/api';
const API_URL = 'http://127.0.0.1:5000/api'; 

const Chat = () => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I'm your Prashikshan AI Mentor. Ask me anything about your career!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Add User Message
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 2. Send to Backend
      const response = await axios.post(`${API_URL}/chat`, {
        message: input
      });

      // 3. Add AI Response
      const aiMsg = { role: 'ai', text: response.data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = { role: 'ai', text: "Error: Is your Python Backend running?" };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg">AI Mentor</h1>
          <p className="text-xs text-muted-foreground">Powered by Gemini</p>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
              ${msg.role === 'ai' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {msg.role === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>

            <div className={`max-w-[80%] rounded-2xl p-3 text-sm 
              ${msg.role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                : 'bg-card border border-border rounded-tl-none shadow-sm'}`}>
              
              {msg.role === 'ai' ? (
                /* AI Messages: Render Markdown */
                <div className="space-y-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>strong]:font-bold">
                 <ReactMarkdown>
                   {msg.text}
                 </ReactMarkdown>
                 </div>
              ) : (
                /* User Messages: Plain Text */
                msg.text
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="text-xs text-muted-foreground ml-12 animate-pulse">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border">
        <form onSubmit={handleSend} className="flex gap-2 max-w-2xl mx-auto">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for advice..."
            className="rounded-full"
            disabled={loading}
          />
          <Button type="submit" size="icon" className="rounded-full" disabled={loading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
};

export default Chat;