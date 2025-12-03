/**
 * InternshipCard Component
 * Displays a single internship in list view
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Clock, 
  IndianRupee, 
  Bookmark, 
  BookmarkCheck,
  Building2,
  Calendar,
  Users
} from 'lucide-react';
import type { Internship } from '@/types/internship';

interface InternshipCardProps {
  internship: Internship;
  saved?: boolean;
  onSave?: (id: string) => void;
  showActions?: boolean;
}

const locationTypeColors = {
  remote: 'bg-green-100 text-green-800',
  onsite: 'bg-blue-100 text-blue-800',
  hybrid: 'bg-purple-100 text-purple-800',
};

const domainIcons: Record<string, string> = {
  software: '💻',
  data: '📊',
  design: '🎨',
  marketing: '📱',
  content: '✍️',
  finance: '💰',
  hr: '👥',
  operations: '⚙️',
  sales: '🤝',
  research: '🔬',
  other: '📋',
};

export function InternshipCard({ 
  internship, 
  saved = false, 
  onSave,
  showActions = true 
}: InternshipCardProps) {
  // Debug: Check if onSave is passed
  console.log('InternshipCard props:', { id: internship.id, saved, hasOnSave: !!onSave, showActions });
  
  const formatStipend = (min: number, max?: number) => {
    if (!min && !max) return 'Unpaid';
    if (min && max) return `₹${min.toLocaleString()} - ₹${max.toLocaleString()}/month`;
    return `₹${(min || max)?.toLocaleString()}/month`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const daysUntilDeadline = internship.application_deadline 
    ? Math.ceil((new Date(internship.application_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Company Logo */}
          <div className="flex-shrink-0">
            {internship.companies?.logo_url ? (
              <img 
                src={internship.companies.logo_url} 
                alt={internship.companies.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link to={`/internships/${internship.id}`}>
                  <h3 className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1">
                    {internship.title}
                  </h3>
                </Link>
                <p className="text-muted-foreground text-sm">
                  {internship.companies?.name || 'Company'}
                </p>
              </div>

              {showActions && onSave && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Save button clicked for:', internship.id);
                    onSave(internship.id);
                  }}
                  className="flex-shrink-0"
                >
                  {saved ? (
                    <BookmarkCheck className="w-5 h-5 text-primary" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </Button>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {domainIcons[internship.domain] || '📋'} {internship.domain}
              </Badge>
              <Badge className={`text-xs ${locationTypeColors[internship.location_type]}`}>
                {internship.location_type}
              </Badge>
              {internship.skills_required?.slice(0, 2).map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {(internship.skills_required?.length || 0) > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{internship.skills_required!.length - 2}
                </Badge>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              {internship.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {internship.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {internship.duration_months} months
              </span>
              <span className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {formatStipend(internship.stipend_min, internship.stipend_max)}
              </span>
              {internship.positions_available > 1 && (
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {internship.positions_available - internship.positions_filled} openings
                </span>
              )}
            </div>

            {/* Deadline Warning */}
            {daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline > 0 && (
              <div className="mt-2">
                <Badge variant="destructive" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {daysUntilDeadline} days left to apply
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InternshipCard;
