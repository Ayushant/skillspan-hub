import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { UniversityAdminDashboard } from '@/components/dashboard/UniversityAdminDashboard';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();

  if (profile?.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  if (profile?.role === 'university_admin') {
    return <UniversityAdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
        <p className="text-xl text-muted-foreground">
          Your role is not recognized or you don't have admin privileges.
        </p>
      </div>
    </div>
  );
};