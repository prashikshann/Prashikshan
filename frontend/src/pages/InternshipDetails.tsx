/**
 * Internship Details Page
 * Shows full details of a single internship
 */
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInternship, useSaveInternship, useSavedInternships } from '@/hooks/useInternships';
import { ApplyModal } from '@/components/internships/ApplyModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Users,
  ExternalLink,
  Share2,
  Bookmark,
  BookmarkCheck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

export function InternshipDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useInternship(id!);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: savedData } = useSavedInternships();
  const saveInternship = useSaveInternship();
  
  // Check if this internship is saved
  const isSaved = savedData?.data?.some(s => s.internship_id === id) || false;

  const internship = data?.data;
  
  const handleSave = () => {
    if (!id) return;
    saveInternship.mutate(id, {
      onSuccess: (response) => {
        const saved = response.data?.saved;
        toast({
          title: saved ? 'Saved!' : 'Removed',
          description: saved 
            ? 'Internship added to your saved list' 
            : 'Internship removed from saved list',
        });
      },
      onError: (err) => {
        toast({
          title: 'Error',
          description: err.message || 'Please log in to save internships.',
          variant: 'destructive',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <Skeleton className="h-10 w-2/3 mb-4" />
            <Skeleton className="h-6 w-1/3 mb-6" />
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !internship) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Internship not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {(error as Error)?.message || 'The internship you are looking for does not exist.'}
          </p>
          <Button asChild>
            <Link to="/internships">Browse Internships</Link>
          </Button>
        </div>
      </div>
    );
  }

  const company = internship.companies;
  const isExpired = internship.deadline && new Date(internship.deadline) < new Date();

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: internship.title,
        text: `Check out this internship: ${internship.title} at ${company?.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Link
          to="/internships"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Internships
        </Link>

        {/* Main Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div className="flex gap-4">
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {internship.title}
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {company?.name || 'Company'}
                  </p>
                  {company?.verified && (
                    <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" /> Verified Company
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleSave}
                  disabled={saveInternship.isPending}
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-4 h-4 text-primary" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>{internship.location || internship.location_type}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{internship.duration_months} months</span>
              </div>
              {(internship.stipend_min || internship.stipend_max) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <DollarSign className="w-4 h-4" />
                  <span>
                    ₹{internship.stipend_min?.toLocaleString()}
                    {internship.stipend_max && internship.stipend_max !== internship.stipend_min
                      ? ` - ₹${internship.stipend_max.toLocaleString()}`
                      : ''}
                    /month
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  Posted {format(new Date(internship.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge>{internship.domain}</Badge>
              <Badge variant="outline">{internship.location_type}</Badge>
              {internship.openings && (
                <Badge variant="secondary">
                  <Users className="w-3 h-3 mr-1" /> {internship.openings} openings
                </Badge>
              )}
              {internship.deadline && (
                <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                  {isExpired ? 'Expired' : `Apply by ${format(new Date(internship.deadline), 'MMM d')}`}
                </Badge>
              )}
            </div>

            <Separator className="my-6" />

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">About the Internship</h2>
              <div
                className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: internship.description }}
              />
            </div>

            {/* Requirements */}
            {internship.requirements && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Requirements</h2>
                <div
                  className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: internship.requirements }}
                />
              </div>
            )}

            {/* Responsibilities */}
            {internship.responsibilities && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Responsibilities</h2>
                <div
                  className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: internship.responsibilities }}
                />
              </div>
            )}

            {/* Skills */}
            {internship.skills_required && internship.skills_required.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Skills Required</h2>
                <div className="flex flex-wrap gap-2">
                  {internship.skills_required.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Perks */}
            {internship.perks && internship.perks.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Perks</h2>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                  {internship.perks.map((perk, index) => (
                    <li key={index}>{perk}</li>
                  ))}
                </ul>
              </div>
            )}

            <Separator className="my-6" />

            {/* Apply Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="flex-1"
                disabled={isExpired}
                onClick={() => setApplyModalOpen(true)}
              >
                {isExpired ? 'Application Closed' : 'Apply Now'}
              </Button>
              {company?.website && (
                <Button variant="outline" size="lg" asChild>
                  <a href={company.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Company
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Info Card */}
        {company && (
          <Card>
            <CardHeader>
              <CardTitle>About {company.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {company.description || 'No company description available.'}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {company.industry && (
                  <div>
                    <span className="text-gray-500">Industry:</span>{' '}
                    <span className="font-medium">{company.industry}</span>
                  </div>
                )}
                {company.size && (
                  <div>
                    <span className="text-gray-500">Size:</span>{' '}
                    <span className="font-medium">{company.size}</span>
                  </div>
                )}
                {company.location && (
                  <div>
                    <span className="text-gray-500">Location:</span>{' '}
                    <span className="font-medium">{company.location}</span>
                  </div>
                )}
                {company.website && (
                  <div>
                    <span className="text-gray-500">Website:</span>{' '}
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Apply Modal */}
      <ApplyModal
        internship={internship}
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
      />
    </div>
  );
}

export default InternshipDetails;
