-- Fix RLS policies for profiles table to allow student creation
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- Create new RLS policies that allow proper student creation
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (get_current_user_role() = 'super_admin'::user_role);

-- Allow university admins to create student profiles for their university
CREATE POLICY "University admins can create student profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (
    -- Allow creation of student profiles by university admins
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'university_admin'::user_role
    )
    AND role = 'student'::user_role
  )
  OR get_current_user_role() = 'super_admin'::user_role
);

-- Allow university admins to view students from their university
CREATE POLICY "University admins can view their students" 
ON public.profiles 
FOR SELECT 
USING (
  (
    role = 'student'::user_role 
    AND id IN (
      SELECT sl.student_id 
      FROM student_licenses sl 
      JOIN universities u ON sl.university_id = u.id 
      JOIN profiles p ON u.admin_id = p.id 
      WHERE p.user_id = auth.uid()
    )
  )
  OR auth.uid() = user_id
  OR get_current_user_role() = 'super_admin'::user_role
);

-- Add a university_id column to profiles table for easier tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_id uuid;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON public.profiles(university_id);

-- Update existing database functions to be more secure
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Function to check university license limit
CREATE OR REPLACE FUNCTION public.check_university_license_limit(p_university_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_students integer;
  license_limit integer;
BEGIN
  -- Get current active students count
  SELECT COUNT(*) INTO current_students
  FROM public.student_licenses 
  WHERE university_id = p_university_id AND is_active = true;
  
  -- Get license limit from active package
  SELECT lp.total_licenses INTO license_limit
  FROM public.license_packages lp
  WHERE lp.university_id = p_university_id 
  AND lp.status = 'active'::license_status
  ORDER BY lp.created_at DESC
  LIMIT 1;
  
  -- Return true if under limit, false if at or over limit
  RETURN COALESCE(current_students, 0) < COALESCE(license_limit, 0);
END;
$$;

-- Function to get university stats for dashboard
CREATE OR REPLACE FUNCTION public.get_university_stats()
RETURNS TABLE (
  university_id uuid,
  university_name text,
  admin_email text,
  total_licenses integer,
  used_licenses integer,
  remaining_licenses integer,
  usage_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as university_id,
    u.name as university_name,
    p.email as admin_email,
    COALESCE(lp.total_licenses, 0) as total_licenses,
    COALESCE(lp.used_licenses, 0) as used_licenses,
    COALESCE(lp.total_licenses - lp.used_licenses, 0) as remaining_licenses,
    CASE 
      WHEN COALESCE(lp.total_licenses, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(lp.used_licenses, 0)::numeric / lp.total_licenses::numeric) * 100, 2)
    END as usage_percentage
  FROM public.universities u
  LEFT JOIN public.profiles p ON u.admin_id = p.id
  LEFT JOIN public.license_packages lp ON u.id = lp.university_id AND lp.status = 'active'::license_status
  ORDER BY u.name;
END;
$$;