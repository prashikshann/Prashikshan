/**
 * InternshipFilters Component
 * Filter sidebar/panel for internship search
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDomains } from '@/hooks/useInternships';
import type { InternshipFilters as FilterType } from '@/types/internship';
import { X, Filter } from 'lucide-react';

interface InternshipFiltersProps {
  filters: FilterType;
  onChange?: (filters: FilterType) => void;
  onFilterChange?: (filters: FilterType) => void;
  onReset?: () => void;
  onClear?: () => void;
}

export function InternshipFilters({ filters, onChange, onFilterChange, onReset, onClear }: InternshipFiltersProps) {
  const { data: domainsData } = useDomains();
  const domains = domainsData?.data || [];

  // Support both naming conventions
  const handleChange = onChange || onFilterChange || (() => {});
  const handleReset = onReset || onClear || (() => {});

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Search internships..."
            value={filters.search || ''}
            onChange={(e) => handleChange({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Domain */}
        <div className="space-y-2">
          <Label>Domain</Label>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={filters.domain || ''}
            onChange={(e) => handleChange({ ...filters, domain: e.target.value || undefined })}
          >
            <option value="">All Domains</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.icon} {domain.name}
              </option>
            ))}
          </select>
        </div>

        {/* Location Type */}
        <div className="space-y-3">
          <Label>Work Mode</Label>
          <RadioGroup
            value={filters.location_type || 'all'}
            onValueChange={(value) => 
              handleChange({ ...filters, location_type: value === 'all' ? undefined : value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="font-normal">All</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="remote" id="remote" />
              <Label htmlFor="remote" className="font-normal">Remote</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="onsite" id="onsite" />
              <Label htmlFor="onsite" className="font-normal">On-site</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hybrid" id="hybrid" />
              <Label htmlFor="hybrid" className="font-normal">Hybrid</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Duration */}
        <div className="space-y-3">
          <Label>Duration</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="number"
                placeholder="Min months"
                min={1}
                max={12}
                value={filters.duration_min || ''}
                onChange={(e) => handleChange({ 
                  ...filters, 
                  duration_min: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Max months"
                min={1}
                max={12}
                value={filters.duration_max || ''}
                onChange={(e) => handleChange({ 
                  ...filters, 
                  duration_max: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
            </div>
          </div>
        </div>

        {/* Minimum Stipend */}
        <div className="space-y-3">
          <Label>Minimum Stipend</Label>
          <div className="px-2">
            <Slider
              value={[filters.stipend_min || 0]}
              onValueChange={([value]) => handleChange({ ...filters, stipend_min: value || undefined })}
              max={50000}
              step={1000}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>₹0</span>
              <span>₹{(filters.stipend_min || 0).toLocaleString()}</span>
              <span>₹50,000</span>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="space-y-2">
          <Label>Quick Filters</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChange({ ...filters, stipend_min: 10000 })}
            >
              ₹10k+ stipend
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChange({ ...filters, location_type: 'remote' })}
            >
              Remote only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChange({ ...filters, duration_max: 3 })}
            >
              Short term
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InternshipFilters;
