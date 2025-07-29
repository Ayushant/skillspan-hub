import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
  };

  return isSignUp ? (
    <SignUpForm onToggleMode={toggleMode} />
  ) : (
    <LoginForm onToggleMode={toggleMode} />
  );
};