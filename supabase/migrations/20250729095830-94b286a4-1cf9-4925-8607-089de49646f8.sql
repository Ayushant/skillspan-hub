-- Create enum types for user roles and session status
CREATE TYPE user_role AS ENUM ('super_admin', 'university_admin', 'student');
CREATE TYPE session_status AS ENUM ('not_started', 'active', 'paused', 'completed', 'expired');
CREATE TYPE license_status AS ENUM ('active', 'expired', 'suspended');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create universities table
CREATE TABLE public.universities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  license_limit INTEGER NOT NULL DEFAULT 100,
  license_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  status license_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create license_packages table
CREATE TABLE public.license_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  total_licenses INTEGER NOT NULL,
  used_licenses INTEGER NOT NULL DEFAULT 0,
  price_per_license DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  created_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status license_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_licenses table
CREATE TABLE public.student_licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  license_package_id UUID NOT NULL REFERENCES public.license_packages(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_sessions table
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'not_started',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  time_taken_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_answers table
CREATE TABLE public.student_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_answer CHAR(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN DEFAULT false,
  marked_for_review BOOLEAN DEFAULT false,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(session_id, question_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create license_usage_logs table
CREATE TABLE public.license_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES public.student_licenses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR ALL USING (public.get_current_user_role() = 'super_admin');

-- Create RLS policies for universities
CREATE POLICY "University admins can view their university" ON public.universities
  FOR SELECT USING (
    admin_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
    OR public.get_current_user_role() = 'super_admin'
  );

-- Create RLS policies for quiz_questions (readable by all authenticated users)
CREATE POLICY "All authenticated users can read quiz questions" ON public.quiz_questions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create RLS policies for quiz_sessions
CREATE POLICY "Students can view their own sessions" ON public.quiz_sessions
  FOR SELECT USING (
    student_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "University admins can view their students' sessions" ON public.quiz_sessions
  FOR ALL USING (
    university_id IN (
      SELECT u.id FROM public.universities u
      JOIN public.profiles p ON u.admin_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR public.get_current_user_role() = 'super_admin'
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample quiz questions
INSERT INTO public.quiz_questions (title, description, option_a, option_b, option_c, option_d, correct_answer, category) VALUES
('Decision 1', 'Team Building Strategy

As the new Area Manager for Mars Inc. entering the Indian market, your first critical decision is building your sales team. The success of your market entry depends heavily on having the right people with the right skills and motivation. Consider the trade-offs between experience, cost, and cultural fit as you make this foundational decision.', 'Poach best salesmen from Cadbury', 'Recruit experienced from other food/non-food brands', 'Build team of freshers & moderate experience', 'Hire only local market experts', 'C', 'Strategy'),

('Decision 2', 'Market Entry Strategy

You need to decide on the optimal market entry approach for Mars Inc. in India. Each option has different implications for speed, cost, and market penetration.', 'Direct market entry with full investment', 'Joint venture with local partner', 'Gradual rollout starting with major cities', 'Franchise model with local operators', 'C', 'Strategy'),

('Decision 3', 'Product Portfolio Decision

Which product mix should Mars Inc. prioritize for the Indian market launch?', 'Focus on premium chocolate products only', 'Mix of premium and affordable options', 'Local flavor adaptations of existing products', 'Complete new product line for India', 'B', 'Product'),

('Decision 4', 'Distribution Channel Strategy

What distribution approach would be most effective for Mars Inc. in India?', 'Direct-to-retailer distribution only', 'Multi-tier distribution network', 'E-commerce focused distribution', 'Exclusive partnerships with major chains', 'B', 'Distribution'),

('Decision 5', 'Marketing Investment Priority

Where should Mars Inc. focus its initial marketing budget in India?', 'Traditional media advertising', 'Digital marketing and social media', 'Trade promotions and retailer incentives', 'Brand awareness campaigns', 'C', 'Marketing');