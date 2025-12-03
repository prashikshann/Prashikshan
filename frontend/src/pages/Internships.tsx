/**
 * Internships Page
 * Main page for browsing and searching internships
 */
import React, { useState } from 'react';
import { useInternships, useInternshipStats, useDomains, useSaveInternship, useSavedInternships } from '@/hooks/useInternships';
import { InternshipCard } from '@/components/internships/InternshipCard';
import { InternshipFilters } from '@/components/internships/InternshipFilters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Search, SlidersHorizontal, Briefcase, Building2, Users, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InternshipFilters as IFilters } from '@/types/internship';

export function Internships() {
  const [filters, setFilters] = useState<IFilters>({});
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'stipend_high' | 'stipend_low'>('recent');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { toast } = useToast();

  const { data: internshipsData, isLoading, isFetching } = useInternships(
    { ...filters, search },
    page,
    20
  );
  const { data: statsData } = useInternshipStats();
  const { data: savedData } = useSavedInternships();
  const saveInternship = useSaveInternship();

  const internships = internshipsData?.data || [];
  const pagination = internshipsData?.pagination;
  const stats = statsData?.data;
  
  // Get saved internship IDs for quick lookup
  const savedIds = new Set(savedData?.data?.map(s => s.internship_id) || []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already reactive via useInternships
    setPage(1);
  };

  const handleFilterChange = (newFilters: IFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearch('');
    setPage(1);
  };

  const handleSaveInternship = (internshipId: string) => {
    console.log('Saving internship:', internshipId);
    saveInternship.mutate(internshipId, {
      onSuccess: (response) => {
        console.log('Save response:', response);
        const isSaved = response.data?.saved;
        toast({
          title: isSaved ? 'Saved!' : 'Removed',
          description: isSaved 
            ? 'Internship added to your saved list' 
            : 'Internship removed from saved list',
        });
      },
      onError: (error) => {
        console.error('Save error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to save internship. Please log in.',
          variant: 'destructive',
        });
      },
    });
  };

  // Sort internships client-side
  const sortedInternships = [...internships].sort((a, b) => {
    switch (sortBy) {
      case 'stipend_high':
        return (b.stipend_max || 0) - (a.stipend_max || 0);
      case 'stipend_low':
        return (a.stipend_min || 0) - (b.stipend_min || 0);
      case 'recent':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Find Internships
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discover opportunities that match your skills and interests
          </p>

          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Briefcase className="w-4 h-4" />
                <span>{stats.active_internships} active internships</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Building2 className="w-4 h-4" />
                <span>{stats.companies_hiring} companies hiring</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>{stats.total_applications} applications</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>{stats.hired_this_month} hired this month</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search and Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by title, company, or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="stipend_high">Highest Stipend</SelectItem>
                <SelectItem value="stipend_low">Lowest Stipend</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile Filter Button */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px]">
                <InternshipFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClear={handleClearFilters}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6">
              <InternshipFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClear={handleClearFilters}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.domain && (
                  <Badge variant="secondary" className="gap-1">
                    Domain: {filters.domain}
                    <button
                      onClick={() => setFilters({ ...filters, domain: undefined })}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filters.location_type && (
                  <Badge variant="secondary" className="gap-1">
                    Type: {filters.location_type}
                    <button
                      onClick={() => setFilters({ ...filters, location_type: undefined })}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {(filters.duration_min || filters.duration_max) && (
                  <Badge variant="secondary" className="gap-1">
                    Duration: {filters.duration_min || 1}-{filters.duration_max || 12} months
                    <button
                      onClick={() =>
                        setFilters({ ...filters, duration_min: undefined, duration_max: undefined })
                      }
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filters.stipend_min && (
                  <Badge variant="secondary" className="gap-1">
                    Min Stipend: ₹{filters.stipend_min}
                    <button
                      onClick={() => setFilters({ ...filters, stipend_min: undefined })}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear all
                </Button>
              </div>
            )}

            {/* Results Count */}
            {pagination && !isLoading && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Showing {internships.length} of {pagination.total} internships
              </p>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="grid gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6">
                    <div className="flex gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-1/4 mb-4" />
                        <div className="flex gap-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Internships Grid */}
            {!isLoading && (
              <>
                {sortedInternships.length > 0 ? (
                  <div className="grid gap-4">
                    {sortedInternships.map((internship) => (
                      <InternshipCard 
                        key={internship.id} 
                        internship={internship}
                        saved={savedIds.has(internship.id)}
                        onSave={handleSaveInternship}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                    <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No internships found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Try adjusting your filters or search terms
                    </p>
                    <Button variant="outline" onClick={handleClearFilters}>
                      Clear all filters
                    </Button>
                  </div>
                )}

                {/* Pagination */}
                {pagination && pagination.total_pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={page === 1 || isFetching}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
                      Page {page} of {pagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page >= pagination.total_pages || isFetching}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Internships;
