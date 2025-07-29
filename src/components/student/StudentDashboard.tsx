import React, { useState, useEffect } from 'react';
import { Trophy, BarChart3, Clock, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface StudentStats {
  bestScore: number;
  averageScore: number;
  completed: number;
  lastSessionDate?: string;
}

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<StudentStats>({
    bestScore: 0,
    averageScore: 0,
    completed: 0,
  });
  const [canStartQuiz, setCanStartQuiz] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchStudentStats();
      checkQuizAvailability();
    }
  }, [profile]);

  const fetchStudentStats = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('status', 'completed');

      if (error) throw error;

      if (sessions && sessions.length > 0) {
        const scores = sessions.map(s => s.score);
        const bestScore = Math.max(...scores);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Get the most recent session
        const sortedSessions = sessions.sort((a, b) => 
          new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        );

        setStats({
          bestScore,
          averageScore: Math.round(averageScore * 10) / 10,
          completed: sessions.length,
          lastSessionDate: sortedSessions[0]?.completed_at,
        });
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkQuizAvailability = async () => {
    // Check if there's an active quiz session available
    try {
      const { data: activeSession, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('student_id', profile?.id)
        .in('status', ['not_started', 'active'])
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCanStartQuiz(!!activeSession);
    } catch (error) {
      console.error('Error checking quiz availability:', error);
    }
  };

  const handleStartQuiz = () => {
    // Navigate to quiz interface
    window.location.href = '/quiz';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
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
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-semibold text-gray-900">Mars Inc. Simulation</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">{profile?.full_name}</div>
            <div className="text-xs text-gray-500">Student</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-gray-600">
            Ready to take on the challenge of launching Mars Inc. in India?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Trophy className="w-8 h-8 text-primary" />
                <div className="text-3xl font-bold text-gray-900">{stats.bestScore}</div>
                <div className="text-sm text-gray-600">Best Score</div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <BarChart3 className="w-8 h-8 text-blue-500" />
                <div className="text-3xl font-bold text-gray-900">{stats.averageScore}</div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-2">
                <Clock className="w-8 h-8 text-green-500" />
                <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Start Quiz Section */}
        <Card className="mb-8">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Start New Simulation
            </h2>
            <p className="text-gray-600 mb-6">
              Begin your journey as Area Manager for Mars Inc. and make critical business decisions.
            </p>
            <Button
              onClick={handleStartQuiz}
              disabled={!canStartQuiz}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg font-medium"
            >
              <Play className="w-5 h-5 mr-2" />
              {canStartQuiz ? 'Start New Simulation' : 'No Active Session'}
            </Button>
            {!canStartQuiz && (
              <p className="text-sm text-gray-500 mt-2">
                Contact your administrator to start a new simulation session.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Previous Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Previous Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lastSessionDate ? (
              <div className="flex items-center justify-between py-4 border-b">
                <span className="text-gray-900">Session {new Date(stats.lastSessionDate).toLocaleDateString()}</span>
                <span className="text-gray-600">0 points</span>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No completed sessions yet. Start your first simulation!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};