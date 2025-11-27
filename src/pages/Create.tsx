import { Upload, FileText, Award, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Create = () => {
  const createOptions = [
    {
      icon: FileText,
      title: "Share Update",
      description: "Post about your achievements and progress",
      color: "from-primary to-accent"
    },
    {
      icon: Award,
      title: "Add Certificate",
      description: "Upload and showcase your certificates",
      color: "from-secondary to-primary"
    },
    {
      icon: Briefcase,
      title: "Add Project",
      description: "Showcase your latest projects",
      color: "from-accent to-secondary"
    },
    {
      icon: Upload,
      title: "Upload Document",
      description: "Add important documents to your vault",
      color: "from-primary to-secondary"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-foreground">Create New</h1>
          <p className="text-sm text-muted-foreground">Share your journey with the community</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {createOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <Card
              key={index}
              className="p-6 hover:shadow-md transition-all cursor-pointer animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${option.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            </Card>
          );
        })}

        <div className="pt-6">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Quick Upload</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop files here or click to browse
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                Choose Files
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Create;
