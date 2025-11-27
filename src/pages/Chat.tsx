import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";

const Chat = () => {
  const [messages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I'm your AI mentor. How can I help you today?",
      time: "10:30 AM"
    },
    {
      id: 2,
      sender: "user",
      text: "I need help finding internships in web development",
      time: "10:32 AM"
    },
    {
      id: 3,
      sender: "ai",
      text: "Great! I've analyzed your profile and found 8 internships that match your skills. Would you like me to show you the top 3 opportunities?",
      time: "10:32 AM"
    }
  ]);

  const suggestions = [
    "Show me internship matches",
    "Review my profile",
    "Skill gap analysis",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
              <Sparkles className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-bold text-foreground">AI Mentor</h1>
            <p className="text-xs text-muted-foreground">Always here to help</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.sender === "user" ? "flex-row-reverse" : ""
            } animate-fade-in`}
          >
            {message.sender === "ai" && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary">
                  <Sparkles className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <Card
              className={`max-w-[75%] p-3 ${
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card"
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}>
                {message.time}
              </p>
            </Card>
          </div>
        ))}

        {/* Quick Suggestions */}
        <div className="space-y-2 pt-4">
          <p className="text-xs text-muted-foreground text-center">Quick actions</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-16 md:bottom-0 bg-background border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button size="icon" className="bg-primary hover:bg-primary/90 flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Chat;
