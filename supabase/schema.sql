-- ==============================================================================
-- RS Neuro & Health Care — Production Database Schema & Security Architecture
-- Target: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. ENUMS & DOMAINS
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'suspended', 'pending_verification');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('published', 'draft', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('pending', 'contacted', 'approved', 'rejected', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_category AS ENUM ('admission', 'medical', 'course_material', 'billing', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_user', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    status account_status NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    duration TEXT NOT NULL,
    eligibility TEXT NOT NULL,
    fee NUMERIC(10, 2) DEFAULT 0.00,
    status course_status NOT NULL DEFAULT 'published',
    image_url TEXT,
    whatsapp_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    status enrollment_status NOT NULL DEFAULT 'pending',
    enrollment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_course_enrollment UNIQUE (user_id, course_id)
);

-- SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    category ticket_category NOT NULL DEFAULT 'general',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    status ticket_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUPPORT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 4. SECURITY DEFINER HELPER FUNCTIONS
-- ==============================================================================

-- Check if current authenticated user is an active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    );
$$;

-- Check if current authenticated user is an active staff or admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'staff')
        AND status = 'active'
    );
$$;

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Automatically create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'RS Member'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role),
        'active'::account_status
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- ==============================================================================
-- 5. ATTACH TRIGGERS
-- ==============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_courses_updated_at ON public.courses;
CREATE TRIGGER trigger_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_enrollments_updated_at ON public.enrollments;
CREATE TRIGGER trigger_enrollments_updated_at
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trigger_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES RLS
-- ------------------------------------------------------------------------------
-- 1. Users can view their own profile; Admins/Staff can view all profiles
CREATE POLICY "profiles_select_policy"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_staff_or_admin());

-- 2. Users can update only their own non-privileged info (name, phone, avatar)
CREATE POLICY "profiles_user_update_policy"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        -- Regular users cannot promote themselves or alter account status
        AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
        AND (status = (SELECT status FROM public.profiles WHERE id = auth.uid()))
    );

-- 3. Admins can update any profile (including roles and statuses)
CREATE POLICY "profiles_admin_update_policy"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- COURSES RLS
-- ------------------------------------------------------------------------------
-- 1. Anyone (even unauthenticated) can view published courses
CREATE POLICY "courses_public_read_policy"
    ON public.courses FOR SELECT
    USING (status = 'published' OR public.is_staff_or_admin());

-- 2. Only Admins can insert/update/delete courses
CREATE POLICY "courses_admin_all_policy"
    ON public.courses FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- ENROLLMENTS RLS
-- ------------------------------------------------------------------------------
-- 1. Users can view their own enrollments; Staff/Admins can view all
CREATE POLICY "enrollments_select_policy"
    ON public.enrollments FOR SELECT
    USING (auth.uid() = user_id OR public.is_staff_or_admin());

-- 2. Users can create an enrollment for themselves with status 'pending'
CREATE POLICY "enrollments_user_insert_policy"
    ON public.enrollments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
    );

-- 3. Only Staff/Admins can update enrollment status/notes
CREATE POLICY "enrollments_admin_update_policy"
    ON public.enrollments FOR UPDATE
    USING (public.is_staff_or_admin())
    WITH CHECK (public.is_staff_or_admin());

-- ------------------------------------------------------------------------------
-- SUPPORT TICKETS RLS
-- ------------------------------------------------------------------------------
-- 1. Users can view their own tickets; Staff/Admins can view all tickets
CREATE POLICY "tickets_select_policy"
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id OR public.is_staff_or_admin());

-- 2. Users can create a ticket for themselves
CREATE POLICY "tickets_user_insert_policy"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their ticket (e.g., re-open); Staff/Admins can update any ticket
CREATE POLICY "tickets_update_policy"
    ON public.support_tickets FOR UPDATE
    USING (auth.uid() = user_id OR public.is_staff_or_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_staff_or_admin());

-- ------------------------------------------------------------------------------
-- SUPPORT MESSAGES RLS
-- ------------------------------------------------------------------------------
-- 1. Users can view messages belonging to their tickets; Staff/Admins can view all
CREATE POLICY "messages_select_policy"
    ON public.support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets t
            WHERE t.id = support_messages.ticket_id
            AND (t.user_id = auth.uid() OR public.is_staff_or_admin())
        )
    );

-- 2. Users can insert messages to their own tickets; Staff/Admins can insert replies
CREATE POLICY "messages_insert_policy"
    ON public.support_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND (
            EXISTS (
                SELECT 1 FROM public.support_tickets t
                WHERE t.id = support_messages.ticket_id
                AND t.user_id = auth.uid()
            )
            OR public.is_staff_or_admin()
        )
    );

-- ------------------------------------------------------------------------------
-- AUDIT LOGS RLS
-- ------------------------------------------------------------------------------
-- 1. Only Admins can view audit logs
CREATE POLICY "audit_logs_select_policy"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

-- 2. Authenticated users and admins can record audit events
CREATE POLICY "audit_logs_insert_policy"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() = actor_id OR public.is_admin());

-- ==============================================================================
-- 7. INITIAL SEED DATA
-- ==============================================================================
INSERT INTO public.courses (title, slug, description, duration, eligibility, fee, status, whatsapp_code)
VALUES 
(
    'Diploma in Neuro-Rehabilitation',
    'diploma-in-neuro-rehabilitation',
    'For physiotherapists & nurses — advanced neuro care techniques, stroke recovery, and clinical motor rehabilitation.',
    '12 months',
    'BPT / MPT / GNM / B.Sc Nursing',
    25000.00,
    'published',
    'DNR-12M'
),
(
    'Certificate in Spine Care',
    'certificate-in-spine-care',
    'Hands-on chiropractic, spinal decompression, postural analysis, and vertebral adjustment training.',
    '6 months',
    'Physiotherapists, Chiropractors, Medical Graduates',
    15000.00,
    'published',
    'CSC-6M'
),
(
    'Pain Management Workshop',
    'pain-management-workshop',
    'Latest non-surgical interventions for chronic pain, sciatica, peripheral neuropathy, and trigger point therapy.',
    '3 days',
    'Medical Practitioners & Rehabilitation Specialists',
    5000.00,
    'published',
    'PMW-3D'
),
(
    'Patient Education Program',
    'patient-education-program',
    'Community-driven preventive care sessions: learn about neuropathy, lumbar posture, spine ergonomics, and self-care.',
    'Monthly',
    'Open to all patients & families',
    0.00,
    'published',
    'PEP-FREE'
)
ON CONFLICT (slug) DO NOTHING;
