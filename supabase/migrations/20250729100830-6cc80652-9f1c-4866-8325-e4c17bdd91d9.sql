-- Add missing RLS policies for tables without any policies

-- License packages policies
CREATE POLICY "Super admins can manage license packages" ON public.license_packages
  FOR ALL USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "University admins can view their license packages" ON public.license_packages
  FOR SELECT USING (
    university_id IN (
      SELECT u.id FROM public.universities u
      JOIN public.profiles p ON u.admin_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Student licenses policies
CREATE POLICY "Students can view their own license" ON public.student_licenses
  FOR SELECT USING (
    student_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "University admins can manage their student licenses" ON public.student_licenses
  FOR ALL USING (
    university_id IN (
      SELECT u.id FROM public.universities u
      JOIN public.profiles p ON u.admin_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR public.get_current_user_role() = 'super_admin'
  );

-- Student answers policies
CREATE POLICY "Students can manage their own answers" ON public.student_answers
  FOR ALL USING (
    session_id IN (
      SELECT qs.id FROM public.quiz_sessions qs
      JOIN public.profiles p ON qs.student_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "University admins can view student answers" ON public.student_answers
  FOR SELECT USING (
    session_id IN (
      SELECT qs.id FROM public.quiz_sessions qs
      WHERE qs.university_id IN (
        SELECT u.id FROM public.universities u
        JOIN public.profiles p ON u.admin_id = p.id
        WHERE p.user_id = auth.uid()
      )
    )
    OR public.get_current_user_role() = 'super_admin'
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (
    recipient_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (
    recipient_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Admins can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    public.get_current_user_role() IN ('super_admin', 'university_admin')
  );

-- License usage logs policies
CREATE POLICY "Students can view their own usage logs" ON public.license_usage_logs
  FOR SELECT USING (
    license_id IN (
      SELECT sl.id FROM public.student_licenses sl
      JOIN public.profiles p ON sl.student_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "University admins can view their students' usage logs" ON public.license_usage_logs
  FOR SELECT USING (
    license_id IN (
      SELECT sl.id FROM public.student_licenses sl
      WHERE sl.university_id IN (
        SELECT u.id FROM public.universities u
        JOIN public.profiles p ON u.admin_id = p.id
        WHERE p.user_id = auth.uid()
      )
    )
    OR public.get_current_user_role() = 'super_admin'
  );

-- Add policies for university table
CREATE POLICY "University admins can update their university" ON public.universities
  FOR UPDATE USING (
    admin_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Super admins can manage universities" ON public.universities
  FOR ALL USING (public.get_current_user_role() = 'super_admin');

-- Add policies for quiz_sessions insert/update
CREATE POLICY "Students can create their own sessions" ON public.quiz_sessions
  FOR INSERT WITH CHECK (
    student_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Students can update their own sessions" ON public.quiz_sessions
  FOR UPDATE USING (
    student_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Fix function search paths by creating new versions
CREATE OR REPLACE FUNCTION public.update_updated_at_column_v2()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update triggers to use new functions
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

DROP TRIGGER IF EXISTS update_universities_updated_at ON public.universities;
CREATE TRIGGER update_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_v2();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();