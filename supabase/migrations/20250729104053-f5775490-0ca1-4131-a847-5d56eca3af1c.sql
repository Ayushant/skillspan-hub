-- First, let's ensure we have all the required tables and sample data

-- Create quiz questions table with sample MBA-level questions
INSERT INTO quiz_questions (title, description, option_a, option_b, option_c, option_d, correct_answer, category, difficulty) VALUES
('Strategic Planning Framework', 'Which framework is most commonly used for strategic analysis in business?', 'SWOT Analysis', 'Financial Ratio Analysis', 'Market Research', 'Employee Surveys', 'A', 'Business Strategy', 2),
('Porter Five Forces', 'Which is NOT one of Porter''s Five Forces?', 'Threat of new entrants', 'Bargaining power of suppliers', 'Company culture', 'Threat of substitutes', 'C', 'Business Strategy', 3),
('Financial Leverage', 'What does a high debt-to-equity ratio typically indicate?', 'Low financial risk', 'High financial leverage', 'Strong cash position', 'Low profitability', 'B', 'Financial Management', 2),
('NPV Calculation', 'When evaluating investment projects, a positive NPV indicates:', 'Project should be rejected', 'Project creates value', 'Project has high risk', 'Project needs more analysis', 'B', 'Financial Management', 3),
('Market Segmentation', 'Which is the most effective basis for B2B market segmentation?', 'Demographics', 'Geographic location', 'Behavioral patterns', 'Psychographics', 'C', 'Marketing Management', 2),
('Brand Positioning', 'What is the primary goal of brand positioning?', 'Increase sales volume', 'Reduce marketing costs', 'Create distinct market identity', 'Improve product quality', 'C', 'Marketing Management', 2),
('Supply Chain Management', 'Which strategy helps reduce supply chain risk?', 'Single supplier dependency', 'Supply chain diversification', 'Inventory elimination', 'Cost reduction only', 'B', 'Operations Management', 2),
('Lean Manufacturing', 'The main principle of lean manufacturing is:', 'Maximize inventory', 'Eliminate waste', 'Increase batch sizes', 'Reduce quality control', 'B', 'Operations Management', 3),
('Motivation Theory', 'According to Maslow''s hierarchy, which need comes first?', 'Self-actualization', 'Esteem needs', 'Safety needs', 'Physiological needs', 'D', 'Human Resources', 1),
('Performance Management', 'What is the primary purpose of performance appraisals?', 'Salary determination only', 'Employee development and feedback', 'Cost reduction', 'Compliance requirement', 'B', 'Human Resources', 2),
('Market Economics', 'In a perfectly competitive market, firms are:', 'Price makers', 'Price takers', 'Market leaders', 'Monopolistic', 'B', 'Economics', 2),
('Demand Elasticity', 'If demand is inelastic, a price increase will:', 'Decrease total revenue', 'Increase total revenue', 'Keep revenue constant', 'Eliminate demand', 'B', 'Economics', 3),
('Corporate Governance', 'Which is a key principle of good corporate governance?', 'Profit maximization only', 'Stakeholder transparency', 'Cost minimization', 'Market domination', 'B', 'Business Strategy', 2),
('Competitive Advantage', 'Sustainable competitive advantage requires:', 'Low prices only', 'Resources that are valuable and rare', 'Large market share', 'High advertising spend', 'B', 'Business Strategy', 3),
('Capital Structure', 'The optimal capital structure balances:', 'Revenue and costs', 'Risk and return', 'Assets and liabilities', 'Income and expenses', 'B', 'Financial Management', 2),
('Working Capital', 'Negative working capital typically indicates:', 'Strong liquidity', 'Cash flow problems', 'High profitability', 'Market leadership', 'B', 'Financial Management', 2),
('Customer Lifetime Value', 'CLV is most important for:', 'Product development', 'Customer retention strategies', 'Manufacturing decisions', 'HR policies', 'B', 'Marketing Management', 3),
('Digital Marketing', 'The most measurable advantage of digital marketing is:', 'Brand awareness', 'Customer satisfaction', 'Real-time analytics', 'Product quality', 'C', 'Marketing Management', 2),
('Quality Management', 'Six Sigma methodology focuses on:', 'Employee satisfaction', 'Defect reduction', 'Revenue increase', 'Market expansion', 'B', 'Operations Management', 3),
('Project Management', 'In project management, the critical path is:', 'Shortest project duration', 'Longest sequence of dependent tasks', 'Most expensive activities', 'Lowest risk activities', 'B', 'Operations Management', 2),
('Leadership Styles', 'Transformational leadership primarily focuses on:', 'Task completion', 'Inspiring and motivating followers', 'Strict rule enforcement', 'Cost control', 'B', 'Human Resources', 2),
('Organizational Culture', 'Strong organizational culture typically leads to:', 'Higher employee turnover', 'Better performance and alignment', 'Increased costs', 'Slower decision making', 'B', 'Human Resources', 2),
('Macroeconomics', 'GDP measures:', 'Company profitability', 'Total economic output', 'Stock market performance', 'Interest rates', 'B', 'Economics', 1),
('Microeconomics', 'Consumer surplus represents:', 'Producer profit', 'Market efficiency', 'Benefit consumers receive above price paid', 'Government revenue', 'C', 'Economics', 3),
('Innovation Strategy', 'Disruptive innovation typically:', 'Serves high-end markets first', 'Starts with low-end markets', 'Focuses on existing customers', 'Requires high investment', 'B', 'Business Strategy', 3)
ON CONFLICT (title) DO NOTHING;

-- Create sample universities with proper admin accounts
-- First, let's create the university admin profiles
INSERT INTO profiles (user_id, email, full_name, role) 
SELECT 
    gen_random_uuid(),
    'iit_admin@example.com',
    'IIT Delhi Administrator',
    'university_admin'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'iit_admin@example.com');

INSERT INTO profiles (user_id, email, full_name, role) 
SELECT 
    gen_random_uuid(),
    'iim_admin@example.com', 
    'IIM Mumbai Administrator',
    'university_admin'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'iim_admin@example.com');

INSERT INTO profiles (user_id, email, full_name, role) 
SELECT 
    gen_random_uuid(),
    'nit_admin@example.com',
    'NIT Bangalore Administrator', 
    'university_admin'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'nit_admin@example.com');

-- Create universities
INSERT INTO universities (name, admin_id, license_limit, license_expiry, status) 
SELECT 
    'Indian Institute of Technology Delhi',
    p.id,
    500,
    now() + interval '7 days',
    'active'
FROM profiles p 
WHERE p.email = 'iit_admin@example.com'
AND NOT EXISTS (SELECT 1 FROM universities WHERE name = 'Indian Institute of Technology Delhi');

INSERT INTO universities (name, admin_id, license_limit, license_expiry, status)
SELECT 
    'Indian Institute of Management Mumbai',
    p.id,
    300, 
    now() + interval '7 days',
    'active'
FROM profiles p
WHERE p.email = 'iim_admin@example.com'
AND NOT EXISTS (SELECT 1 FROM universities WHERE name = 'Indian Institute of Management Mumbai');

INSERT INTO universities (name, admin_id, license_limit, license_expiry, status)
SELECT 
    'National Institute of Technology Bangalore',
    p.id,
    400,
    now() + interval '7 days', 
    'active'
FROM profiles p
WHERE p.email = 'nit_admin@example.com'
AND NOT EXISTS (SELECT 1 FROM universities WHERE name = 'National Institute of Technology Bangalore');

-- Create license packages for universities
INSERT INTO license_packages (university_id, total_licenses, price_per_license, expires_at, status)
SELECT 
    u.id,
    100,
    50.00,
    now() + interval '7 days',
    'active'
FROM universities u
WHERE u.name = 'Indian Institute of Technology Delhi'
AND NOT EXISTS (
    SELECT 1 FROM license_packages lp 
    WHERE lp.university_id = u.id
);

INSERT INTO license_packages (university_id, total_licenses, price_per_license, expires_at, status)
SELECT 
    u.id,
    75,
    50.00,
    now() + interval '7 days',
    'active'
FROM universities u  
WHERE u.name = 'Indian Institute of Management Mumbai'
AND NOT EXISTS (
    SELECT 1 FROM license_packages lp
    WHERE lp.university_id = u.id
);

-- Create sample student profiles
DO $$
DECLARE
    i INTEGER;
    student_email TEXT;
    student_name TEXT;
    university_record RECORD;
    new_profile_id UUID;
BEGIN
    -- Create students for each university
    FOR university_record IN 
        SELECT id, name FROM universities 
    LOOP
        FOR i IN 1..10 LOOP
            student_email := 'student' || LPAD(i::TEXT, 3, '0') || '@' || 
                           CASE 
                               WHEN university_record.name LIKE '%IIT%' THEN 'iitd'
                               WHEN university_record.name LIKE '%IIM%' THEN 'iimm' 
                               WHEN university_record.name LIKE '%NIT%' THEN 'nitb'
                           END || '.edu';
            
            student_name := 'Student ' || LPAD(i::TEXT, 3, '0') || ' ' ||
                          CASE
                              WHEN university_record.name LIKE '%IIT%' THEN 'IIT'
                              WHEN university_record.name LIKE '%IIM%' THEN 'IIM'
                              WHEN university_record.name LIKE '%NIT%' THEN 'NIT'
                          END;
            
            -- Insert student profile if doesn't exist
            INSERT INTO profiles (user_id, email, full_name, role)
            SELECT gen_random_uuid(), student_email, student_name, 'student'
            WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = student_email)
            RETURNING id INTO new_profile_id;
            
            -- Get the profile id if it already exists
            IF new_profile_id IS NULL THEN
                SELECT id INTO new_profile_id FROM profiles WHERE email = student_email;
            END IF;
            
            -- Create student license if doesn't exist
            INSERT INTO student_licenses (student_id, university_id, username, license_package_id)
            SELECT 
                new_profile_id,
                university_record.id,
                'student' || LPAD(i::TEXT, 3, '0'),
                lp.id
            FROM license_packages lp
            WHERE lp.university_id = university_record.id
            AND NOT EXISTS (
                SELECT 1 FROM student_licenses sl 
                WHERE sl.student_id = new_profile_id 
                AND sl.university_id = university_record.id
            )
            LIMIT 1;
        END LOOP;
    END LOOP;
END $$;

-- Ensure the Super Admin account exists
INSERT INTO profiles (user_id, email, full_name, role)
SELECT 
    gen_random_uuid(),
    'theayushant@gmail.com',
    'Super Administrator',
    'super_admin'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'theayushant@gmail.com');

-- Create some sample quiz sessions
INSERT INTO quiz_sessions (student_id, university_id, status, duration_minutes)
SELECT 
    sl.student_id,
    sl.university_id,
    'completed',
    60
FROM student_licenses sl
LIMIT 5;

-- Create some sample notifications
INSERT INTO notifications (recipient_id, title, message, type)
SELECT 
    p.id,
    'Welcome to Mars Inc. Simulation',
    'Your account has been created successfully. You can now start taking quizzes.',
    'info'
FROM profiles p
WHERE p.role = 'student'
LIMIT 10;