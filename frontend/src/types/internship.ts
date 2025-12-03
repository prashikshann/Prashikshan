/**
 * Internship MVP Types
 * Phase 1 - Type definitions for the internship system
 */

// Enums
export type UserRole = 'student' | 'company' | 'faculty' | 'admin';
export type ApplicationStatus = 'pending' | 'faculty_approved' | 'faculty_rejected' | 'company_shortlisted' | 'company_rejected' | 'hired';
export type InternshipStatus = 'draft' | 'active' | 'paused' | 'closed' | 'expired';
export type LocationType = 'remote' | 'onsite' | 'hybrid';

// Domain options
export interface Domain {
  id: string;
  name: string;
  icon: string;
}

// Company
export interface Company {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  size?: string; // Alias for company_size
  location?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// Faculty
export interface Faculty {
  id: string;
  user_id: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  college?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

// Internship
export interface Internship {
  id: string;
  company_id: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  domain: string;
  location?: string;
  location_type: LocationType;
  stipend_min: number;
  stipend_max?: number;
  duration_months: number;
  start_date?: string;
  application_deadline?: string;
  deadline?: string; // Alias for application_deadline
  positions_available: number;
  positions_filled: number;
  openings?: number; // Alias for positions_available
  skills_required: string[];
  perks: string[];
  status: InternshipStatus;
  views_count: number;
  applications_count: number;
  application_count?: number; // Alias for applications_count
  pending_applications?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  companies?: Company;
}

// Application
export interface InternshipApplication {
  id: string;
  internship_id: string;
  student_id: string;
  resume_url: string;
  cover_letter?: string;
  portfolio_url?: string;
  status: ApplicationStatus;
  student_note?: string;
  company_note?: string;
  faculty_note?: string;
  applied_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  internships?: Internship & { companies?: Company };
  profiles?: StudentProfile;
  student?: {
    id: string;
    name?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

// Student Profile (extended)
export interface StudentProfile {
  id: string;
  username: string;
  full_name?: string;
  name?: string; // Alias for full_name
  email?: string;
  avatar_url?: string;
  role: UserRole;
  phone?: string;
  college?: string;
  department?: string;
  year_of_study?: number;
  resume_url?: string;
  skills?: string[];
  cgpa?: number;
}

// Faculty Approval
export interface FacultyApproval {
  id: string;
  application_id: string;
  faculty_id: string;
  status: 'approved' | 'rejected';
  remarks?: string;
  reviewed_at: string;
  // Joined data
  internship_applications?: InternshipApplication;
}

// Saved Internship
export interface SavedInternship {
  id: string;
  user_id: string;
  internship_id: string;
  saved_at: string;
  internships?: Internship;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_more: boolean;
  };
}

// Form types
export interface InternshipFormData {
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  domain: string;
  location?: string;
  location_type: LocationType;
  stipend_min?: number;
  stipend_max?: number;
  duration_months: number;
  start_date?: string;
  application_deadline?: string;
  deadline?: string;
  positions_available?: number;
  openings?: number;
  skills_required?: string[];
  perks?: string[];
  status?: InternshipStatus;
}

export interface ApplicationFormData {
  resume_url: string;
  cover_letter?: string;
  portfolio_url?: string;
  student_note?: string;
}

export interface CompanyFormData {
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  size?: string;
  location?: string;
}

export interface FacultyFormData {
  name: string;
  email: string;
  department?: string;
  designation?: string;
  college?: string;
  phone?: string;
}

// Filter types
export interface InternshipFilters {
  domain?: string;
  location_type?: string;
  duration_min?: number;
  duration_max?: number;
  stipend_min?: number;
  search?: string;
}

// Stats
export interface InternshipStats {
  active_internships: number;
  companies: number;
  companies_hiring: number;
  total_applications: number;
  hired_this_month: number;
}
