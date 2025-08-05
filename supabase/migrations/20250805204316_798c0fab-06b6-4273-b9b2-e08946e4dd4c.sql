-- Manually confirm the admin account that was created but not confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'project75database75@gmail.com' AND email_confirmed_at IS NULL;