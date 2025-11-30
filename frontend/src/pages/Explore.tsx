import { Search, Briefcase, Users, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Explore = () => {
  const internships = [
    {
      company: "TechInnovate Solutions",
      role: "Full Stack Developer Intern",
      location: "Bangalore",
      duration: "3 months",
      stipend: "₹15,000/month",
      tags: ["React", "Node.js", "MongoDB"],
      posted: "2 days ago"
    },
    {
      company: "DataScience Corp",
      role: "ML Engineering Intern",
      location: "Remote",
      duration: "6 months",
      stipend: "₹20,000/month",
      tags: ["Python", "TensorFlow", "ML"],
      posted: "1 week ago"
    },
    {
      company: "Design Studio Pro",
      role: "UI/UX Design Intern",
      location: "Mumbai",
      duration: "3 months",
      stipend: "₹12,000/month",
      tags: ["Figma", "UI/UX", "Prototyping"],
      posted: "3 days ago"
    }
  ];

  const categories = [
    { icon: Briefcase, label: "Internships", count: 142 },
    { icon: Users, label: "Companies", count: 89 },
    { icon: TrendingUp, label: "Trending", count: 23 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-foreground mb-3">Explore Opportunities</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search internships, companies..."
              className="pl-10 bg-background"
            />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Categories */}
        <div className="grid grid-cols-3 gap-3">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card
                key={index}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <Icon className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{category.label}</p>
                    <p className="text-xs text-muted-foreground">{category.count}+</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Internship Listings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Latest Internships</h2>
          {internships.map((internship, index) => (
            <Card key={index} className="p-5 hover:shadow-md transition-shadow animate-fade-in">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-foreground">{internship.role}</h3>
                    <p className="text-sm text-muted-foreground">{internship.company}</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {internship.posted}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>📍 {internship.location}</span>
                  <span>⏱️ {internship.duration}</span>
                  <span className="text-primary font-semibold">💰 {internship.stipend}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {internship.tags.map((tag, tagIndex) => (
                    <Badge key={tagIndex} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Apply Now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Explore;
