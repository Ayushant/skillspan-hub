import React, { useState, useEffect } from 'react';
import { Users, Activity, CheckCircle, TrendingUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalStudents: number;
  activeSessions: number;
  completed: number;
  averageScore: number;
}

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    activeSessions: 0,
    completed: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchAdminStats();
    }
  }, [profile]);

  const fetchAdminStats = async () => {
    try {
      // Get university info
      const { data: university, error: univError } = await supabase
        .from('universities')
        .select('id')
        .eq('admin_id', profile?.id)
        .single();

      if (univError) throw univError;

      if (university) {
        // Get total students
        const { count: studentsCount } = await supabase
          .from('student_licenses')
          .select('*', { count: 'exact', head: true })
          .eq('university_id', university.id)
          .eq('is_active', true);

        // Get active sessions
        const { count: activeCount } = await supabase
          .from('quiz_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('university_id', university.id)
          .eq('status', 'active');

        // Get completed sessions
        const { count: completedCount } = await supabase
          .from('quiz_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('university_id', university.id)
          .eq('status', 'completed');

        // Get average score
        const { data: sessions } = await supabase
          .from('quiz_sessions')
          .select('score')
          .eq('university_id', university.id)
          .eq('status', 'completed');

        let averageScore = 0;
        if (sessions && sessions.length > 0) {
          const totalScore = sessions.reduce((sum, session) => sum + (session.score || 0), 0);
          averageScore = totalScore / sessions.length;
        }

        setStats({
          totalStudents: studentsCount || 0,
          activeSessions: activeCount || 0,
          completed: completedCount || 0,
          averageScore: Math.round(averageScore * 10) / 10,
        });
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    // Export functionality
    console.log('Exporting data...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-gray-900">Mars Inc. Simulation</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleExportData}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </Button>
            <div className="text-right">
              <div className="text-sm text-gray-600">{profile?.full_name}</div>
              <div className="text-xs text-gray-500">Admin</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Monitor student progress and manage simulation sessions.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Users className="w-8 h-8 text-blue-500" />
                <div className="text-3xl font-bold text-gray-900">{stats.totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Activity className="w-8 h-8 text-green-500" />
                <div className="text-3xl font-bold text-gray-900">{stats.activeSessions}</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <CheckCircle className="w-8 h-8 text-purple-500" />
                <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <TrendingUp className="w-8 h-8 text-primary" />
                <div className="text-3xl font-bold text-gray-900">{stats.averageScore}</div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Student</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">College</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Score</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Started</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No recent sessions found. Start a new simulation to see student activity.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};