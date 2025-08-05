-- Manually confirm the admin account using the correct column
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'project75database75@gmail.com' AND email_confirmed_at IS NULL;