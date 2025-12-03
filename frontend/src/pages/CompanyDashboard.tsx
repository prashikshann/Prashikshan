/**
 * Company Dashboard Page
 * For companies to manage internships and applications
 */
import React, { useState } from 'react';
import { useCompanyProfile, useCompanyInternships, useInternshipApplications, useCreateInternship, useUpdateInternship, useUpsertCompanyProfile, useUpdateApplicationStatus } from '@/hooks/useInternships';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Plus,
  Users,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Internship, InternshipFormData, InternshipApplication, Company, CompanyFormData } from '@/types/internship';

const DOMAIN_OPTIONS = [
  'Technology', 'Marketing', 'Design', 'Finance', 'Operations',
  'HR', 'Sales', 'Content', 'Data Science', 'Engineering', 'Other'
];

const LOCATION_TYPES = ['remote', 'onsite', 'hybrid'];

export function CompanyDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [internshipDialogOpen, setInternshipDialogOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [viewingApplications, setViewingApplications] = useState<string | null>(null);

  const { data: profileData, isLoading: profileLoading, isError: profileError } = useCompanyProfile();
  const { data: internshipsData, isLoading: internshipsLoading } = useCompanyInternships();
  const upsertProfileMutation = useUpsertCompanyProfile();
  const createInternshipMutation = useCreateInternship();
  const updateInternshipMutation = useUpdateInternship();

  const profile = profileData?.data;
  const internships = internshipsData?.data || [];

  // If no profile, show setup
  if (profileLoading) {
    return <LoadingSkeleton />;
  }

  if (profileError || !profile) {
    return (
      <CompanyProfileSetup
        onSubmit={async (data) => {
          await upsertProfileMutation.mutateAsync(data);
        }}
        isLoading={upsertProfileMutation.isPending}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                alt={profile.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Company Dashboard</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setProfileDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button onClick={() => {
              setSelectedInternship(null);
              setInternshipDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Post Internship
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Internships"
            value={internships.length}
            icon={Briefcase}
          />
          <StatsCard
            title="Active"
            value={internships.filter(i => i.status === 'active').length}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="Total Applications"
            value={internships.reduce((sum, i) => sum + (i.application_count || 0), 0)}
            icon={Users}
          />
          <StatsCard
            title="Pending Review"
            value={internships.reduce((sum, i) => sum + (i.pending_applications || 0), 0)}
            icon={Clock}
            color="yellow"
          />
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="internships">Internships</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Internships */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Internships</CardTitle>
                  <CardDescription>Your latest posted internships</CardDescription>
                </CardHeader>
                <CardContent>
                  {internshipsLoading ? (
                    <Skeleton className="h-32" />
                  ) : internships.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No internships posted yet</p>
                  ) : (
                    <div className="space-y-3">
                      {internships.slice(0, 5).map((internship) => (
                        <div
                          key={internship.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{internship.title}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant={internship.status === 'active' ? 'default' : 'secondary'}>
                                {internship.status}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {internship.application_count || 0} applications
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingApplications(internship.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Company Profile */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Profile</CardTitle>
                  <CardDescription>How candidates see your company</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-500">Industry</Label>
                      <p className="font-medium">{profile.industry || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Size</Label>
                      <p className="font-medium">{profile.size || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Location</Label>
                      <p className="font-medium">{profile.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Website</Label>
                      <p className="font-medium">
                        {profile.website ? (
                          <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {profile.website}
                          </a>
                        ) : (
                          'Not specified'
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Description</Label>
                      <p className="text-sm">{profile.description || 'No description'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="internships">
            <InternshipsTable
              internships={internships}
              isLoading={internshipsLoading}
              onEdit={(internship) => {
                setSelectedInternship(internship);
                setInternshipDialogOpen(true);
              }}
              onViewApplications={(id) => setViewingApplications(id)}
            />
          </TabsContent>

          <TabsContent value="applications">
            {viewingApplications ? (
              <ApplicationsView
                internshipId={viewingApplications}
                onBack={() => setViewingApplications(null)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Applications</CardTitle>
                  <CardDescription>Select an internship to view applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {internships.map((internship) => (
                      <Button
                        key={internship.id}
                        variant="ghost"
                        className="w-full justify-between"
                        onClick={() => setViewingApplications(internship.id)}
                      >
                        <span>{internship.title}</span>
                        <Badge>{internship.application_count || 0} applications</Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Profile Edit Dialog */}
        <CompanyProfileDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          profile={profile}
          onSubmit={async (data) => {
            await upsertProfileMutation.mutateAsync(data);
            setProfileDialogOpen(false);
          }}
          isLoading={upsertProfileMutation.isPending}
        />

        {/* Internship Create/Edit Dialog */}
        <InternshipFormDialog
          open={internshipDialogOpen}
          onOpenChange={setInternshipDialogOpen}
          internship={selectedInternship}
          onSubmit={async (data) => {
            if (selectedInternship) {
              await updateInternshipMutation.mutateAsync({ id: selectedInternship.id, data });
            } else {
              await createInternshipMutation.mutateAsync(data);
            }
            setInternshipDialogOpen(false);
          }}
          isLoading={createInternshipMutation.isPending || updateInternshipMutation.isPending}
        />
      </div>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-16 w-64 mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

function CompanyProfileSetup({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: CompanyFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    description: '',
    website: '',
    location: '',
    industry: '',
    size: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Set Up Your Company Profile</CardTitle>
          <CardDescription>
            Complete your profile to start posting internships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Industry</Label>
              <Select
                value={formData.industry}
                onValueChange={(v) => setFormData({ ...formData, industry: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {['Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce', 'Manufacturing', 'Other'].map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Company Size</Label>
              <Select
                value={formData.size}
                onValueChange={(v) => setFormData({ ...formData, size: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map((s) => (
                    <SelectItem key={s} value={s}>{s} employees</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Website</Label>
              <Input
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                placeholder="City, Country"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Tell candidates about your company..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CompanyProfileDialog({
  open,
  onOpenChange,
  profile,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Company;
  onSubmit: (data: CompanyFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: profile.name,
    description: profile.description || '',
    website: profile.website || '',
    location: profile.location || '',
    industry: profile.industry || '',
    size: profile.size || '',
    logo_url: profile.logo_url || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Company Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Company Name *</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            />
          </div>
          <div>
            <Label>Industry</Label>
            <Select
              value={formData.industry}
              onValueChange={(v) => setFormData({ ...formData, industry: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {['Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce', 'Manufacturing', 'Other'].map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Company Size</Label>
            <Select
              value={formData.size}
              onValueChange={(v) => setFormData({ ...formData, size: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map((s) => (
                  <SelectItem key={s} value={s}>{s} employees</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Website</Label>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InternshipsTable({
  internships,
  isLoading,
  onEdit,
  onViewApplications,
}: {
  internships: Internship[];
  isLoading: boolean;
  onEdit: (internship: Internship) => void;
  onViewApplications: (id: string) => void;
}) {
  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (internships.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No internships posted yet</h3>
          <p className="text-gray-500 mb-4">Create your first internship to start receiving applications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Domain</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Applications</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Posted</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {internships.map((internship) => (
                <tr key={internship.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium">{internship.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{internship.domain}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={internship.status === 'active' ? 'default' : 'secondary'}>
                      {internship.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{internship.application_count || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {format(new Date(internship.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewApplications(internship.id)}
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(internship)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function InternshipFormDialog({
  open,
  onOpenChange,
  internship,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  internship: Internship | null;
  onSubmit: (data: InternshipFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<InternshipFormData>({
    title: internship?.title || '',
    description: internship?.description || '',
    domain: internship?.domain || '',
    location_type: internship?.location_type || 'remote',
    location: internship?.location || '',
    duration_months: internship?.duration_months || 3,
    stipend_min: internship?.stipend_min || undefined,
    stipend_max: internship?.stipend_max || undefined,
    requirements: internship?.requirements || '',
    responsibilities: internship?.responsibilities || '',
    skills_required: internship?.skills_required || [],
    openings: internship?.openings || 1,
    deadline: internship?.deadline || '',
    status: internship?.status || 'active',
  });

  const [skillInput, setSkillInput] = useState('');

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills_required?.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills_required: [...(formData.skills_required || []), skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills_required: formData.skills_required?.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{internship ? 'Edit Internship' : 'Post New Internship'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Title *</Label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Software Engineering Intern"
              />
            </div>

            <div>
              <Label>Domain *</Label>
              <Select
                value={formData.domain}
                onValueChange={(v) => setFormData({ ...formData, domain: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAIN_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location Type *</Label>
              <Select
                value={formData.location_type}
                onValueChange={(v) => setFormData({ ...formData, location_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>

            <div>
              <Label>Duration (months) *</Label>
              <Input
                type="number"
                min="1"
                max="12"
                required
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <Label>Min Stipend (₹/month)</Label>
              <Input
                type="number"
                min="0"
                value={formData.stipend_min || ''}
                onChange={(e) => setFormData({ ...formData, stipend_min: parseInt(e.target.value) || undefined })}
              />
            </div>

            <div>
              <Label>Max Stipend (₹/month)</Label>
              <Input
                type="number"
                min="0"
                value={formData.stipend_max || ''}
                onChange={(e) => setFormData({ ...formData, stipend_max: parseInt(e.target.value) || undefined })}
              />
            </div>

            <div>
              <Label>Number of Openings</Label>
              <Input
                type="number"
                min="1"
                value={formData.openings}
                onChange={(e) => setFormData({ ...formData, openings: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <Label>Application Deadline</Label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label>Description *</Label>
              <Textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the internship opportunity..."
                rows={4}
              />
            </div>

            <div className="col-span-2">
              <Label>Requirements</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="What qualifications or skills are required?"
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label>Responsibilities</Label>
              <Textarea
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                placeholder="What will the intern be working on?"
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label>Skills Required</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddSkill}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills_required?.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {internship && (
              <div className="col-span-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {internship ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                internship ? 'Update Internship' : 'Post Internship'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationsView({
  internshipId,
  onBack,
}: {
  internshipId: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useInternshipApplications(internshipId);
  const updateStatusMutation = useUpdateApplicationStatus();
  const applications = data?.data || [];

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  const handleStatusUpdate = async (
    applicationId: string,
    status: 'company_shortlisted' | 'company_rejected' | 'hired',
    note?: string
  ) => {
    await updateStatusMutation.mutateAsync({ applicationId, status, company_note: note });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <CardTitle>Applications</CardTitle>
            <CardDescription>{applications.length} total applications</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No applications yet</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onStatusUpdate={handleStatusUpdate}
                isUpdating={updateStatusMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApplicationCard({
  application,
  onStatusUpdate,
  isUpdating,
}: {
  application: InternshipApplication;
  onStatusUpdate: (id: string, status: 'company_shortlisted' | 'company_rejected' | 'hired', note?: string) => void;
  isUpdating: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    faculty_approved: 'bg-blue-100 text-blue-800',
    company_shortlisted: 'bg-green-100 text-green-800',
    company_rejected: 'bg-red-100 text-red-800',
    hired: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="font-medium">{application.student?.name || 'Student'}</p>
          <p className="text-sm text-gray-500">{application.student?.email}</p>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={statusColors[application.status] || ''}>
              {application.status.replace(/_/g, ' ')}
            </Badge>
            <span className="text-sm text-gray-500">
              Applied {format(new Date(application.created_at), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={application.resume_url} target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4 mr-1" />
              Resume
            </a>
          </Button>
          {application.portfolio_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={application.portfolio_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" />
                Portfolio
              </a>
            </Button>
          )}
          {(application.status === 'faculty_approved' || application.status === 'company_shortlisted') && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-600"
                disabled={isUpdating}
                onClick={() => onStatusUpdate(application.id, 'company_shortlisted')}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Shortlist
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600"
                disabled={isUpdating}
                onClick={() => onStatusUpdate(application.id, 'company_rejected')}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                disabled={isUpdating}
                onClick={() => onStatusUpdate(application.id, 'hired')}
              >
                Hire
              </Button>
            </>
          )}
        </div>
      </div>
      {application.cover_letter && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <p className="text-sm font-medium mb-1">Cover Letter</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{application.cover_letter}</p>
        </div>
      )}
      {application.student_note && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <p className="text-sm font-medium mb-1">Student Note</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{application.student_note}</p>
        </div>
      )}
    </div>
  );
}

export default CompanyDashboard;
