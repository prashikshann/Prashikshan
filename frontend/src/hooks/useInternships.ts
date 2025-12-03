/**
 * Internship API Hooks
 * React Query hooks for internship-related API calls
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  Internship,
  InternshipApplication,
  Company,
  Faculty,
  Domain,
  InternshipFilters,
  InternshipFormData,
  ApplicationFormData,
  CompanyFormData,
  FacultyFormData,
  ApiResponse,
  PaginatedResponse,
  InternshipStats,
  FacultyApproval,
  SavedInternship,
} from '@/types/internship';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Helper for authenticated fetch
async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }
  
  return data;
}

// ============================================
// PUBLIC HOOKS
// ============================================

/**
 * Fetch all active internships with filters
 */
export function useInternships(filters: InternshipFilters = {}, page = 1, limit = 20) {
  const queryParams = new URLSearchParams();
  
  if (filters.domain) queryParams.set('domain', filters.domain);
  if (filters.location_type) queryParams.set('location_type', filters.location_type);
  if (filters.duration_min) queryParams.set('duration_min', String(filters.duration_min));
  if (filters.duration_max) queryParams.set('duration_max', String(filters.duration_max));
  if (filters.stipend_min) queryParams.set('stipend_min', String(filters.stipend_min));
  if (filters.search) queryParams.set('search', filters.search);
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));

  return useQuery({
    queryKey: ['internships', filters, page, limit],
    queryFn: () => authFetch<PaginatedResponse<Internship>>(`/api/internships?${queryParams}`),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch single internship by ID
 */
export function useInternship(id: string) {
  return useQuery({
    queryKey: ['internship', id],
    queryFn: () => authFetch<ApiResponse<Internship>>(`/api/internships/${id}`),
    enabled: !!id,
  });
}

/**
 * Fetch available domains
 */
export function useDomains() {
  return useQuery({
    queryKey: ['internship-domains'],
    queryFn: () => authFetch<ApiResponse<Domain[]>>('/api/internships/domains'),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Fetch internship stats
 */
export function useInternshipStats() {
  return useQuery({
    queryKey: ['internship-stats'],
    queryFn: () => authFetch<ApiResponse<InternshipStats>>('/api/internships/stats'),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// STUDENT HOOKS
// ============================================

/**
 * Apply to an internship
 */
export function useApplyToInternship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ internshipId, data }: { internshipId: string; data: ApplicationFormData }) => {
      return authFetch<ApiResponse<InternshipApplication>>(`/api/internships/${internshipId}/apply`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['internships'] });
    },
  });
}

/**
 * Get student's applications
 */
export function useMyApplications() {
  return useQuery({
    queryKey: ['my-applications'],
    queryFn: () => authFetch<ApiResponse<InternshipApplication[]>>('/api/internships/my-applications'),
  });
}

/**
 * Save/unsave internship
 */
export function useSaveInternship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (internshipId: string) => {
      return authFetch<ApiResponse<{ saved: boolean }>>(`/api/internships/${internshipId}/save`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-internships'] });
    },
  });
}

/**
 * Get saved internships
 */
export function useSavedInternships() {
  return useQuery({
    queryKey: ['saved-internships'],
    queryFn: () => authFetch<ApiResponse<SavedInternship[]>>('/api/internships/saved'),
  });
}

// ============================================
// COMPANY HOOKS
// ============================================

/**
 * Get company profile
 */
export function useCompanyProfile() {
  return useQuery({
    queryKey: ['company-profile'],
    queryFn: () => authFetch<ApiResponse<Company>>('/api/internships/company/profile'),
    retry: false,
  });
}

/**
 * Create/update company profile
 */
export function useUpsertCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompanyFormData) => {
      return authFetch<ApiResponse<Company>>('/api/internships/company/profile', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
    },
  });
}

/**
 * Get company's internships
 */
export function useCompanyInternships() {
  return useQuery({
    queryKey: ['company-internships'],
    queryFn: () => authFetch<ApiResponse<Internship[]>>('/api/internships/company/internships'),
  });
}

/**
 * Create internship
 */
export function useCreateInternship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InternshipFormData) => {
      return authFetch<ApiResponse<Internship>>('/api/internships/company/internships', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-internships'] });
    },
  });
}

/**
 * Update internship
 */
export function useUpdateInternship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InternshipFormData> }) => {
      return authFetch<ApiResponse<Internship>>(`/api/internships/company/internships/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-internships'] });
    },
  });
}

/**
 * Get applications for an internship
 */
export function useInternshipApplications(internshipId: string) {
  return useQuery({
    queryKey: ['internship-applications', internshipId],
    queryFn: () => authFetch<ApiResponse<InternshipApplication[]>>(
      `/api/internships/company/internships/${internshipId}/applications`
    ),
    enabled: !!internshipId,
  });
}

/**
 * Update application status (company)
 */
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      status, 
      company_note 
    }: { 
      applicationId: string; 
      status: 'company_shortlisted' | 'company_rejected' | 'hired';
      company_note?: string;
    }) => {
      return authFetch<ApiResponse<InternshipApplication>>(
        `/api/internships/company/applications/${applicationId}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({ status, company_note }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internship-applications'] });
    },
  });
}

// ============================================
// FACULTY HOOKS
// ============================================

/**
 * Get faculty profile
 */
export function useFacultyProfile() {
  return useQuery({
    queryKey: ['faculty-profile'],
    queryFn: () => authFetch<ApiResponse<Faculty>>('/api/internships/faculty/profile'),
    retry: false,
  });
}

/**
 * Create/update faculty profile
 */
export function useUpsertFacultyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FacultyFormData) => {
      return authFetch<ApiResponse<Faculty>>('/api/internships/faculty/profile', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-profile'] });
    },
  });
}

/**
 * Get pending approvals
 */
export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => authFetch<ApiResponse<InternshipApplication[]>>('/api/internships/faculty/pending-approvals'),
  });
}

/**
 * Approve or reject application
 */
export function useApproveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      action, 
      remarks 
    }: { 
      applicationId: string; 
      action: 'approve' | 'reject';
      remarks?: string;
    }) => {
      return authFetch<ApiResponse<void>>(`/api/internships/faculty/approve/${applicationId}`, {
        method: 'POST',
        body: JSON.stringify({ action, remarks }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-history'] });
    },
  });
}

/**
 * Get approval history
 */
export function useApprovalHistory() {
  return useQuery({
    queryKey: ['approval-history'],
    queryFn: () => authFetch<ApiResponse<FacultyApproval[]>>('/api/internships/faculty/approval-history'),
  });
}

// ============================================
// FILE UPLOAD HOOK
// ============================================

/**
 * Upload resume to Supabase Storage
 */
export function useUploadResume() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(data.path);

      return publicUrl;
    },
  });
}
