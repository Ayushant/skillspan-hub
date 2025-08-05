import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const Index = () => {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    console.log('Index page - user:', !!user, 'profile:', profile?.role, 'loading:', loading);
    if (!loading && !user) {
      console.log('Redirecting to /auth - no user');
      window.location.href = '/auth';
    }
  }, [user, loading, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // Route based on user role
  if (profile.role === 'student') {
    return <StudentDashboard />;
  }

  if (profile.role === 'university_admin' || profile.role === 'super_admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Mars Inc. Quiz Management</h1>
        <p className="text-xl text-muted-foreground">Role not recognized. Please contact support.</p>
      </div>
    </div>
  );
};

export default Index;
