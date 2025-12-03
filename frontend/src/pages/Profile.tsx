/**
 * User Profile / Dashboard Page
 * Shows user profile, applications, saved internships, and activity
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  Award, 
  Briefcase, 
  GraduationCap, 
  FileCheck,
  Bookmark,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogOut,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  ChevronRight,
  Building2,
  FileText,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { useMyApplications, useSavedInternships } from '@/hooks/useInternships';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

// Application status colors and icons
const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
  under_review: { color: 'bg-blue-100 text-blue-800', icon: FileText, label: 'Under Review' },
  shortlisted: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle, label: 'Shortlisted' },
  accepted: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Accepted' },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
  withdrawn: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Withdrawn' },
};

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch current user
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Return user without profile for now (profile table may not exist)
      return { ...user, profile: null as any };
    },
  });

  // Fetch applications
  const { data: applicationsData, isLoading: applicationsLoading } = useMyApplications();
  
  // Fetch saved internships
  const { data: savedData, isLoading: savedLoading } = useSavedInternships();

  const user = userData;
  const applications = applicationsData?.data || [];
  const savedInternships = savedData?.data || [];

  // Calculate stats
  const stats = {
    applications: applications.length,
    saved: savedInternships.length,
    accepted: applications.filter((a: any) => a.status === 'accepted').length,
    pending: applications.filter((a: any) => a.status === 'pending' || a.status === 'under_review').length,
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    navigate('/auth');
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <Card className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="w-24 h-24 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20 md:pb-0">
        <Card className="p-8 max-w-md mx-4 text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Not Logged In</h2>
          <p className="text-muted-foreground mb-4">
            Please log in to view your profile and applications.
          </p>
          <Button asChild>
            <Link to="/auth">Log In</Link>
          </Button>
        </Card>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                {getInitials(user.user_metadata?.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
              {(user as any).profile?.department && (
                <p className="text-sm text-muted-foreground">{(user as any).profile.department}</p>
              )}
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-8 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.applications}</p>
                <p className="text-xs text-muted-foreground">Applications</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.saved}</p>
                <p className="text-xs text-muted-foreground">Saved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
            </div>

            <Button variant="outline" size="sm" className="gap-2">
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Link to="/internships">
                    <Briefcase className="w-5 h-5" />
                    <span className="text-sm">Browse Internships</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Link to="/explore">
                    <GraduationCap className="w-5 h-5" />
                    <span className="text-sm">Explore Courses</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Applications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Applications</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('applications')}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No applications yet</p>
                    <Button asChild variant="link" size="sm">
                      <Link to="/internships">Start applying</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.slice(0, 3).map((app: any) => {
                      const status = statusConfig[app.status as string] || statusConfig.pending;
                      const StatusIcon = status.icon;
                      return (
                        <Link
                          key={app.id}
                          to={`/internships/${app.internship_id}`}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium line-clamp-1">
                                {app.internships?.title || 'Internship'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {app.internships?.companies?.name || 'Company'}
                              </p>
                            </div>
                          </div>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4 mt-4">
            {applicationsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <Card className="p-8 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start applying to internships to track your progress here.
                </p>
                <Button asChild>
                  <Link to="/internships">Browse Internships</Link>
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {applications.map((app: any) => {
                  const status = statusConfig[app.status as string] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <Card key={app.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/internships/${app.internship_id}`}
                              className="font-semibold hover:text-primary transition-colors line-clamp-1"
                            >
                              {app.internships?.title || 'Internship'}
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {app.internships?.companies?.name || 'Company'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Applied {new Date(app.applied_at).toLocaleDateString()}
                              </span>
                              {app.internships?.location_type && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {app.internships.location_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      {app.resume_url && (
                        <div className="mt-3 pt-3 border-t">
                          <a 
                            href={app.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            View Resume
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="saved" className="space-y-4 mt-4">
            {savedLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : savedInternships.length === 0 ? (
              <Card className="p-8 text-center">
                <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Saved Internships</h3>
                <p className="text-muted-foreground mb-4">
                  Save internships you're interested in to apply later.
                </p>
                <Button asChild>
                  <Link to="/internships">Browse Internships</Link>
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {savedInternships.map((saved: any) => {
                  const internship = saved.internships;
                  if (!internship) return null;
                  return (
                    <Card key={saved.id} className="p-4">
                      <Link 
                        to={`/internships/${saved.internship_id}`}
                        className="flex items-start gap-3"
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {internship.companies?.logo_url ? (
                            <img 
                              src={internship.companies.logo_url} 
                              alt=""
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                            {internship.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {internship.companies?.name || 'Company'}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {internship.domain}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {internship.location_type}
                            </Badge>
                            {internship.stipend_min && (
                              <span className="text-xs text-muted-foreground">
                                ₹{internship.stipend_min.toLocaleString()}/mo
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </Link>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
