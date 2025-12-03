-- ============================================
-- PHASE 1: INTERNSHIP MVP - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. USER ROLES ENUM
CREATE TYPE user_role AS ENUM ('student', 'company', 'faculty', 'admin');

-- 2. APPLICATION STATUS ENUM
CREATE TYPE application_status AS ENUM ('pending', 'faculty_approved', 'faculty_rejected', 'company_shortlisted', 'company_rejected', 'hired');

-- 3. INTERNSHIP STATUS ENUM
CREATE TYPE internship_status AS ENUM ('draft', 'active', 'paused', 'closed', 'expired');

-- 4. PROFILES TABLE (extend existing or create)
-- Add role column to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'student';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_of_study INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cgpa DECIMAL(3,2);

-- 5. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(500),
    industry VARCHAR(100),
    company_size VARCHAR(50), -- '1-10', '11-50', '51-200', '201-500', '500+'
    location VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FACULTY TABLE
CREATE TABLE IF NOT EXISTS faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    designation VARCHAR(100),
    college VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. INTERNSHIPS TABLE
CREATE TABLE IF NOT EXISTS internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    domain VARCHAR(100) NOT NULL, -- 'software', 'data', 'design', 'marketing', etc.
    location VARCHAR(255),
    location_type VARCHAR(50) DEFAULT 'remote', -- 'remote', 'onsite', 'hybrid'
    stipend_min INTEGER DEFAULT 0,
    stipend_max INTEGER,
    duration_months INTEGER NOT NULL,
    start_date DATE,
    application_deadline DATE,
    positions_available INTEGER DEFAULT 1,
    positions_filled INTEGER DEFAULT 0,
    skills_required TEXT[],
    perks TEXT[],
    status internship_status DEFAULT 'active',
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. INTERNSHIP APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS internship_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_url TEXT NOT NULL,
    cover_letter TEXT,
    portfolio_url TEXT,
    status application_status DEFAULT 'pending',
    student_note TEXT,
    company_note TEXT,
    faculty_note TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(internship_id, student_id)
);

-- 9. FACULTY APPROVALS TABLE
CREATE TABLE IF NOT EXISTS faculty_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES internship_applications(id) ON DELETE CASCADE,
    faculty_id UUID REFERENCES faculty(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL, -- 'approved', 'rejected'
    remarks TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. SAVED INTERNSHIPS (Bookmarks)
CREATE TABLE IF NOT EXISTS saved_internships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, internship_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_internships_domain ON internships(domain);
CREATE INDEX IF NOT EXISTS idx_internships_status ON internships(status);
CREATE INDEX IF NOT EXISTS idx_internships_location_type ON internships(location_type);
CREATE INDEX IF NOT EXISTS idx_internships_company ON internships(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_student ON internship_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_internship ON internship_applications(internship_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON internship_applications(status);
CREATE INDEX IF NOT EXISTS idx_faculty_approvals_application ON faculty_approvals(application_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_internships ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Companies are viewable by everyone" ON companies FOR SELECT USING (true);
CREATE POLICY "Companies can update own profile" ON companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Companies can insert own profile" ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Internships policies
CREATE POLICY "Active internships are viewable by everyone" ON internships FOR SELECT USING (status = 'active' OR EXISTS (SELECT 1 FROM companies WHERE companies.id = internships.company_id AND companies.user_id = auth.uid()));
CREATE POLICY "Companies can insert internships" ON internships FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE companies.id = company_id AND companies.user_id = auth.uid()));
CREATE POLICY "Companies can update own internships" ON internships FOR UPDATE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = company_id AND companies.user_id = auth.uid()));
CREATE POLICY "Companies can delete own internships" ON internships FOR DELETE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = company_id AND companies.user_id = auth.uid()));

-- Applications policies
CREATE POLICY "Students can view own applications" ON internship_applications FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Companies can view applications for their internships" ON internship_applications FOR SELECT USING (EXISTS (SELECT 1 FROM internships JOIN companies ON internships.company_id = companies.id WHERE internships.id = internship_id AND companies.user_id = auth.uid()));
CREATE POLICY "Faculty can view all applications for approval" ON internship_applications FOR SELECT USING (EXISTS (SELECT 1 FROM faculty WHERE faculty.user_id = auth.uid()));
CREATE POLICY "Students can insert applications" ON internship_applications FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own applications" ON internship_applications FOR UPDATE USING (auth.uid() = student_id);

-- Faculty policies
CREATE POLICY "Faculty viewable by authenticated" ON faculty FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Faculty can update own profile" ON faculty FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Faculty can insert own profile" ON faculty FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Faculty approvals policies
CREATE POLICY "Faculty can view own approvals" ON faculty_approvals FOR SELECT USING (EXISTS (SELECT 1 FROM faculty WHERE faculty.id = faculty_id AND faculty.user_id = auth.uid()));
CREATE POLICY "Faculty can insert approvals" ON faculty_approvals FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM faculty WHERE faculty.id = faculty_id AND faculty.user_id = auth.uid()));

-- Saved internships policies
CREATE POLICY "Users can view own saved" ON saved_internships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save internships" ON saved_internships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave internships" ON saved_internships FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_internships_updated_at BEFORE UPDATE ON internships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON internship_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment application count when new application is created
CREATE OR REPLACE FUNCTION increment_applications_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE internships SET applications_count = applications_count + 1 WHERE id = NEW.internship_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_application_created AFTER INSERT ON internship_applications FOR EACH ROW EXECUTE FUNCTION increment_applications_count();

-- ============================================
-- STORAGE BUCKET FOR RESUMES
-- ============================================
-- Run in Supabase Dashboard -> Storage -> Create bucket named 'resumes'
-- Set it to public: false (private bucket)
-- Add policy: Users can upload to own folder
-- Path pattern: {user_id}/*

-- Storage policies (run in SQL editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);
