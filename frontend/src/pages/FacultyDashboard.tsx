/**
 * Faculty Dashboard Page
 * For faculty members to review and approve/reject student applications
 */
import React, { useState } from 'react';
import {
  useFacultyProfile,
  usePendingApprovals,
  useApprovalHistory,
  useApproveApplication,
  useUpsertFacultyProfile,
} from '@/hooks/useInternships';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  Loader2,
  GraduationCap,
  Building2,
  Calendar,
  AlertCircle,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import type { InternshipApplication, FacultyFormData, Faculty } from '@/types/internship';

export function FacultyDashboard() {
  const [selectedTab, setSelectedTab] = useState('pending');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<InternshipApplication | null>(null);
  const [remarks, setRemarks] = useState('');

  const { data: profileData, isLoading: profileLoading, isError: profileError } = useFacultyProfile();
  const { data: pendingData, isLoading: pendingLoading } = usePendingApprovals();
  const { data: historyData, isLoading: historyLoading } = useApprovalHistory();
  const upsertProfileMutation = useUpsertFacultyProfile();
  const approveMutation = useApproveApplication();

  const profile = profileData?.data;
  const pendingApprovals = pendingData?.data || [];
  const approvalHistory = historyData?.data || [];

  // If no profile, show setup
  if (profileLoading) {
    return <LoadingSkeleton />;
  }

  if (profileError || !profile) {
    return (
      <FacultyProfileSetup
        onSubmit={async (data) => {
          await upsertProfileMutation.mutateAsync(data);
        }}
        isLoading={upsertProfileMutation.isPending}
      />
    );
  }

  const handleReview = (application: InternshipApplication) => {
    setSelectedApplication(application);
    setRemarks('');
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedApplication) return;
    await approveMutation.mutateAsync({
      applicationId: selectedApplication.id,
      action: 'approve',
      remarks: remarks || undefined,
    });
    setReviewDialogOpen(false);
  };

  const handleReject = async () => {
    if (!selectedApplication) return;
    await approveMutation.mutateAsync({
      applicationId: selectedApplication.id,
      action: 'reject',
      remarks: remarks || undefined,
    });
    setReviewDialogOpen(false);
  };

  const approvedCount = approvalHistory.filter(a => a.status === 'approved').length;
  const rejectedCount = approvalHistory.filter(a => a.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {profile.designation} • {profile.department}
              </p>
            </div>
          </div>

          <Button variant="outline" onClick={() => setProfileDialogOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Pending Review"
            value={pendingApprovals.length}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Approved"
            value={approvedCount}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="Rejected"
            value={rejectedCount}
            icon={XCircle}
            color="red"
          />
          <StatsCard
            title="Total Reviewed"
            value={approvalHistory.length}
            icon={FileText}
          />
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingApprovals.length > 0 && (
                <Badge className="ml-2 bg-yellow-500">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingApplicationsList
              applications={pendingApprovals}
              isLoading={pendingLoading}
              onReview={handleReview}
            />
          </TabsContent>

          <TabsContent value="history">
            <ApprovalHistoryList
              history={approvalHistory}
              isLoading={historyLoading}
            />
          </TabsContent>

          <TabsContent value="profile">
            <FacultyProfileCard
              profile={profile}
              onEdit={() => setProfileDialogOpen(true)}
            />
          </TabsContent>
        </Tabs>

        {/* Profile Edit Dialog */}
        <FacultyProfileDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          profile={profile}
          onSubmit={async (data) => {
            await upsertProfileMutation.mutateAsync(data);
            setProfileDialogOpen(false);
          }}
          isLoading={upsertProfileMutation.isPending}
        />

        {/* Review Dialog */}
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          application={selectedApplication}
          remarks={remarks}
          onRemarksChange={setRemarks}
          onApprove={handleApprove}
          onReject={handleReject}
          isLoading={approveMutation.isPending}
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

function FacultyProfileSetup({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: FacultyFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<FacultyFormData>({
    name: '',
    email: '',
    department: '',
    designation: '',
    college: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Set Up Your Faculty Profile</CardTitle>
          <CardDescription>
            Complete your profile to start reviewing student applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>College/University</Label>
              <Input
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g., Associate Professor"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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

function FacultyProfileDialog({
  open,
  onOpenChange,
  profile,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Faculty;
  onSubmit: (data: FacultyFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<FacultyFormData>({
    name: profile.name,
    email: profile.email,
    department: profile.department || '',
    designation: profile.designation || '',
    college: profile.college || '',
    phone: profile.phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Faculty Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label>College/University</Label>
            <Input
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
            />
          </div>
          <div>
            <Label>Department</Label>
            <Input
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>
          <div>
            <Label>Designation</Label>
            <Input
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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

function FacultyProfileCard({
  profile,
  onEdit,
}: {
  profile: Faculty;
  onEdit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Faculty Profile</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-gray-500">Name</Label>
            <p className="font-medium">{profile.name}</p>
          </div>
          <div>
            <Label className="text-gray-500">Email</Label>
            <p className="font-medium">{profile.email}</p>
          </div>
          <div>
            <Label className="text-gray-500">College</Label>
            <p className="font-medium">{profile.college || 'Not specified'}</p>
          </div>
          <div>
            <Label className="text-gray-500">Department</Label>
            <p className="font-medium">{profile.department || 'Not specified'}</p>
          </div>
          <div>
            <Label className="text-gray-500">Designation</Label>
            <p className="font-medium">{profile.designation || 'Not specified'}</p>
          </div>
          <div>
            <Label className="text-gray-500">Phone</Label>
            <p className="font-medium">{profile.phone || 'Not specified'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingApplicationsList({
  applications,
  isLoading,
  onReview,
}: {
  applications: InternshipApplication[];
  isLoading: boolean;
  onReview: (application: InternshipApplication) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-gray-500">No pending applications to review</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          onReview={() => onReview(application)}
        />
      ))}
    </div>
  );
}

function ApplicationCard({
  application,
  onReview,
}: {
  application: InternshipApplication;
  onReview: () => void;
}) {
  const internship = application.internships;
  const company = internship?.companies;
  const student = application.student || application.profiles;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Student Info */}
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{student?.name || student?.full_name || 'Student'}</h3>
              <p className="text-gray-500 text-sm">{student?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {format(new Date(application.created_at || application.applied_at), 'MMM d, yyyy')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Internship Info */}
          <div className="flex-1 lg:px-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Building2 className="w-4 h-4" />
              <span>Applied for</span>
            </div>
            <p className="font-medium">{internship?.title || 'Internship'}</p>
            <p className="text-sm text-gray-500">{company?.name || 'Company'}</p>
            <Badge className="mt-2">{internship?.domain}</Badge>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
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
            </div>
            <Button onClick={onReview}>
              Review Application
            </Button>
          </div>
        </div>

        {/* Cover Letter / Note */}
        {(application.cover_letter || application.student_note) && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {application.cover_letter && (
              <div className="mb-2">
                <p className="text-sm font-medium mb-1">Cover Letter</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{application.cover_letter}</p>
              </div>
            )}
            {application.student_note && (
              <div>
                <p className="text-sm font-medium mb-1">Additional Note</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{application.student_note}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalHistoryList({
  history,
  isLoading,
}: {
  history: any[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No history yet</h3>
          <p className="text-gray-500">Your review history will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {history.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {item.status === 'approved' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">
                    {item.internship_applications?.profiles?.full_name || 'Student'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.internship_applications?.internships?.title || 'Internship'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={item.status === 'approved' ? 'default' : 'destructive'}>
                  {item.status}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(item.reviewed_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewDialog({
  open,
  onOpenChange,
  application,
  remarks,
  onRemarksChange,
  onApprove,
  onReject,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: InternshipApplication | null;
  remarks: string;
  onRemarksChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}) {
  if (!application) return null;

  const internship = application.internships;
  const student = application.student || application.profiles;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Application</DialogTitle>
          <DialogDescription>
            Review and approve or reject this student's application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-2">Student Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{' '}
                {student?.name || student?.full_name}
              </div>
              <div>
                <span className="text-gray-500">Email:</span> {student?.email}
              </div>
            </div>
          </div>

          {/* Internship Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-2">Internship Details</h4>
            <div className="text-sm">
              <p><span className="text-gray-500">Position:</span> {internship?.title}</p>
              <p><span className="text-gray-500">Company:</span> {internship?.companies?.name}</p>
              <p><span className="text-gray-500">Domain:</span> {internship?.domain}</p>
            </div>
          </div>

          {/* Documents */}
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={application.resume_url} target="_blank" rel="noopener noreferrer">
                <FileText className="w-4 h-4 mr-2" />
                View Resume
              </a>
            </Button>
            {application.portfolio_url && (
              <Button variant="outline" asChild>
                <a href={application.portfolio_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Portfolio
                </a>
              </Button>
            )}
          </div>

          {/* Cover Letter */}
          {application.cover_letter && (
            <div>
              <Label>Cover Letter</Label>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                {application.cover_letter}
              </p>
            </div>
          )}

          {/* Remarks */}
          <div>
            <Label>Your Remarks (Optional)</Label>
            <Textarea
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              placeholder="Add any remarks or feedback..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
            Reject
          </Button>
          <Button
            onClick={onApprove}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FacultyDashboard;
