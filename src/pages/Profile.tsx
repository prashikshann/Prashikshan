import { Settings, Award, Briefcase, GraduationCap, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

const Profile = () => {
  const achievements = [
    { icon: Award, title: "Top Performer", color: "text-primary" },
    { icon: Briefcase, title: "3 Internships", color: "text-secondary" },
    { icon: FileCheck, title: "5 Certificates", color: "text-accent" },
  ];

  const skills = ["React", "Node.js", "Python", "Machine Learning", "UI/UX Design"];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                AS
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Ananya Sharma</h2>
              <p className="text-muted-foreground">Computer Science Engineering</p>
              <p className="text-sm text-muted-foreground">Final Year · GPA 3.8</p>
            </div>
            <div className="flex gap-8 pt-2">
              <div>
                <p className="text-2xl font-bold text-primary">234</p>
                <p className="text-xs text-muted-foreground">Connections</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">12</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">3</p>
                <p className="text-xs text-muted-foreground">Internships</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Achievements */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Achievements
          </h3>
          <div className="flex gap-4 flex-wrap">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-primary/10 min-w-[100px]"
                >
                  <Icon className={`w-8 h-8 ${achievement.color}`} />
                  <span className="text-xs text-center">{achievement.title}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Skills */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <Badge key={index} variant="secondary" className="bg-primary/10 text-primary">
                {skill}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Bio */}
        <Card className="p-6">
          <h3 className="font-semibold mb-3">About</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Passionate computer science student with a keen interest in full-stack development and AI. 
            Completed internships at leading tech companies and actively seeking opportunities to 
            contribute to innovative projects.
          </p>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
