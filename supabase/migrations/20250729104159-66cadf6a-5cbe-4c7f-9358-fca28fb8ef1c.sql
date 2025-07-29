-- Add sample quiz questions without conflict constraint
-- Clear existing sample data first if needed
DELETE FROM quiz_questions WHERE category IN ('Business Strategy', 'Financial Management', 'Marketing Management', 'Operations Management', 'Human Resources', 'Economics');

-- Insert sample MBA-level questions
INSERT INTO quiz_questions (title, description, option_a, option_b, option_c, option_d, correct_answer, category, difficulty) VALUES
('Strategic Planning Framework', 'Which framework is most commonly used for strategic analysis in business?', 'SWOT Analysis', 'Financial Ratio Analysis', 'Market Research', 'Employee Surveys', 'A', 'Business Strategy', 2),
('Porter Five Forces Model', 'Which is NOT one of Porter''s Five Forces?', 'Threat of new entrants', 'Bargaining power of suppliers', 'Company culture', 'Threat of substitutes', 'C', 'Business Strategy', 3),
('Financial Leverage Concept', 'What does a high debt-to-equity ratio typically indicate?', 'Low financial risk', 'High financial leverage', 'Strong cash position', 'Low profitability', 'B', 'Financial Management', 2),
('NPV Investment Analysis', 'When evaluating investment projects, a positive NPV indicates:', 'Project should be rejected', 'Project creates value', 'Project has high risk', 'Project needs more analysis', 'B', 'Financial Management', 3),
('B2B Market Segmentation', 'Which is the most effective basis for B2B market segmentation?', 'Demographics', 'Geographic location', 'Behavioral patterns', 'Psychographics', 'C', 'Marketing Management', 2),
('Brand Positioning Strategy', 'What is the primary goal of brand positioning?', 'Increase sales volume', 'Reduce marketing costs', 'Create distinct market identity', 'Improve product quality', 'C', 'Marketing Management', 2),
('Supply Chain Risk Management', 'Which strategy helps reduce supply chain risk?', 'Single supplier dependency', 'Supply chain diversification', 'Inventory elimination', 'Cost reduction only', 'B', 'Operations Management', 2),
('Lean Manufacturing Principles', 'The main principle of lean manufacturing is:', 'Maximize inventory', 'Eliminate waste', 'Increase batch sizes', 'Reduce quality control', 'B', 'Operations Management', 3),
('Maslow Hierarchy Theory', 'According to Maslow''s hierarchy, which need comes first?', 'Self-actualization', 'Esteem needs', 'Safety needs', 'Physiological needs', 'D', 'Human Resources', 1),
('Performance Management System', 'What is the primary purpose of performance appraisals?', 'Salary determination only', 'Employee development and feedback', 'Cost reduction', 'Compliance requirement', 'B', 'Human Resources', 2),
('Perfect Competition Market', 'In a perfectly competitive market, firms are:', 'Price makers', 'Price takers', 'Market leaders', 'Monopolistic', 'B', 'Economics', 2),
('Price Elasticity of Demand', 'If demand is inelastic, a price increase will:', 'Decrease total revenue', 'Increase total revenue', 'Keep revenue constant', 'Eliminate demand', 'B', 'Economics', 3),
('Corporate Governance Principles', 'Which is a key principle of good corporate governance?', 'Profit maximization only', 'Stakeholder transparency', 'Cost minimization', 'Market domination', 'B', 'Business Strategy', 2),
('Sustainable Competitive Advantage', 'Sustainable competitive advantage requires:', 'Low prices only', 'Resources that are valuable and rare', 'Large market share', 'High advertising spend', 'B', 'Business Strategy', 3),
('Optimal Capital Structure', 'The optimal capital structure balances:', 'Revenue and costs', 'Risk and return', 'Assets and liabilities', 'Income and expenses', 'B', 'Financial Management', 2),
('Working Capital Management', 'Negative working capital typically indicates:', 'Strong liquidity', 'Cash flow problems', 'High profitability', 'Market leadership', 'B', 'Financial Management', 2),
('Customer Lifetime Value Analysis', 'CLV is most important for:', 'Product development', 'Customer retention strategies', 'Manufacturing decisions', 'HR policies', 'B', 'Marketing Management', 3),
('Digital Marketing Analytics', 'The most measurable advantage of digital marketing is:', 'Brand awareness', 'Customer satisfaction', 'Real-time analytics', 'Product quality', 'C', 'Marketing Management', 2),
('Six Sigma Quality Management', 'Six Sigma methodology focuses on:', 'Employee satisfaction', 'Defect reduction', 'Revenue increase', 'Market expansion', 'B', 'Operations Management', 3),
('Critical Path Method', 'In project management, the critical path is:', 'Shortest project duration', 'Longest sequence of dependent tasks', 'Most expensive activities', 'Lowest risk activities', 'B', 'Operations Management', 2),
('Transformational Leadership', 'Transformational leadership primarily focuses on:', 'Task completion', 'Inspiring and motivating followers', 'Strict rule enforcement', 'Cost control', 'B', 'Human Resources', 2),
('Strong Organizational Culture', 'Strong organizational culture typically leads to:', 'Higher employee turnover', 'Better performance and alignment', 'Increased costs', 'Slower decision making', 'B', 'Human Resources', 2),
('GDP Economic Indicator', 'GDP measures:', 'Company profitability', 'Total economic output', 'Stock market performance', 'Interest rates', 'B', 'Economics', 1),
('Consumer Surplus Concept', 'Consumer surplus represents:', 'Producer profit', 'Market efficiency', 'Benefit consumers receive above price paid', 'Government revenue', 'C', 'Economics', 3),
('Disruptive Innovation Strategy', 'Disruptive innovation typically:', 'Serves high-end markets first', 'Starts with low-end markets', 'Focuses on existing customers', 'Requires high investment', 'B', 'Business Strategy', 3);

-- Ensure the Super Admin profile exists
INSERT INTO profiles (user_id, email, full_name, role)
SELECT 
    gen_random_uuid(),
    'theayushant@gmail.com',
    'Super Administrator',
    'super_admin'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'theayushant@gmail.com');