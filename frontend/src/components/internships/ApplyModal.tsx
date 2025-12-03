/**
 * ApplyModal Component
 * Modal for applying to internships
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApplyToInternship, useUploadResume } from '@/hooks/useInternships';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Internship } from '@/types/internship';

interface ApplyModalProps {
  internship: Internship;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyModal({ internship, open, onOpenChange }: ApplyModalProps) {
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [studentNote, setStudentNote] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const applyMutation = useApplyToInternship();
  const uploadMutation = useUploadResume();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadedFile(file);

    try {
      const url = await uploadMutation.mutateAsync(file);
      setResumeUrl(url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resumeUrl) {
      alert('Please upload your resume');
      return;
    }

    try {
      await applyMutation.mutateAsync({
        internshipId: internship.id,
        data: {
          resume_url: resumeUrl,
          cover_letter: coverLetter || undefined,
          portfolio_url: portfolioUrl || undefined,
          student_note: studentNote || undefined,
        },
      });

      onOpenChange(false);
      // Reset form
      setResumeUrl('');
      setCoverLetter('');
      setPortfolioUrl('');
      setStudentNote('');
      setUploadedFile(null);
    } catch (error) {
      console.error('Application failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply for {internship.title}</DialogTitle>
          <DialogDescription>
            at {internship.companies?.name || 'Company'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resume Upload */}
          <div className="space-y-2">
            <Label>Resume *</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {uploadMutation.isPending ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </div>
              ) : resumeUrl ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>{uploadedFile?.name || 'Resume uploaded'}</span>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <span>Click to upload resume (PDF, DOC)</span>
                    <span className="text-xs">Max 5MB</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Cover Letter */}
          <div className="space-y-2">
            <Label>Cover Letter (Optional)</Label>
            <Textarea
              placeholder="Write a brief cover letter explaining why you're interested in this role..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
            />
          </div>

          {/* Portfolio URL */}
          <div className="space-y-2">
            <Label>Portfolio / GitHub URL (Optional)</Label>
            <Input
              type="url"
              placeholder="https://github.com/yourusername"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
          </div>

          {/* Additional Note */}
          <div className="space-y-2">
            <Label>Additional Note (Optional)</Label>
            <Textarea
              placeholder="Any additional information you'd like to share..."
              value={studentNote}
              onChange={(e) => setStudentNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* Error Display */}
          {applyMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(applyMutation.error as Error).message || 'Failed to submit application'}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {applyMutation.isSuccess && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Application submitted successfully!
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={applyMutation.isPending || !resumeUrl}>
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ApplyModal;
