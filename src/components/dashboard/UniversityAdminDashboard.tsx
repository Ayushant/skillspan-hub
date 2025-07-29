import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Play, 
  Square, 
  Clock, 
  TrendingUp,
  UserPlus,
  Settings,
  Bell,
  Download,
  Eye,
  UserX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DashboardStats {
  availableLicenses: number;
  totalLicenses: number;
  activeStudents: number;
  activeSessions: number;
  licenseExpiry: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  username: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface ActiveSession {
  id: string;
  student_name: string;
  started_at: string;
  status: string;
  progress: number;
}

export const UniversityAdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    availableLicenses: 0,
    totalLicenses: 0,
    activeStudents: 0,
    activeSessions: 0,
    licenseExpiry: '',
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [canStartQuiz, setCanStartQuiz] = useState(true);
  const [hasActiveSessions, setHasActiveSessions] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time subscriptions
    const setupRealtimeSubscriptions = () => {
      const sessionsChannel = supabase
        .channel('quiz-sessions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quiz_sessions'
          },
          () => {
            fetchDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sessionsChannel);
      };
    };

    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!profile?.id) return;

      // Fetch university info
      const { data: university, error: univError } = await supabase
        .from('universities')
        .select('*')
        .eq('admin_id', profile.id)
        .single();

      if (univError) throw univError;

      // Fetch license packages
      const { data: licensePackages, error: licenseError } = await supabase
        .from('license_packages')
        .select('*')
        .eq('university_id', university.id);

      if (licenseError) throw licenseError;

      // Fetch student licenses
      const { data: studentLicenses, error: studentError } = await supabase
        .from('student_licenses')
        .select(`
          *,
          student:profiles!student_licenses_student_id_fkey(*)
        `)
        .eq('university_id', university.id);

      if (studentError) throw studentError;

      // Fetch active quiz sessions
      const { data: activeQuizSessions, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          student:profiles!quiz_sessions_student_id_fkey(full_name)
        `)
        .eq('university_id', university.id)
        .eq('status', 'active');

      if (sessionError) throw sessionError;

      // Calculate stats
      const totalLicenses = licensePackages?.reduce((sum, pkg) => sum + pkg.total_licenses, 0) || 0;
      const usedLicenses = licensePackages?.reduce((sum, pkg) => sum + pkg.used_licenses, 0) || 0;
      const activeStudentsCount = studentLicenses?.filter(license => license.is_active).length || 0;

      setStats({
        availableLicenses: totalLicenses - usedLicenses,
        totalLicenses,
        activeStudents: activeStudentsCount,
        activeSessions: activeQuizSessions?.length || 0,
        licenseExpiry: university.license_expiry,
      });

      // Format students data
      const formattedStudents = studentLicenses?.map(license => ({
        id: license.student_id,
        full_name: license.student?.full_name || 'Unknown',
        email: license.student?.email || 'No email',
        username: license.username,
        is_active: license.is_active,
        last_login: license.last_login,
        created_at: license.created_at,
      })) || [];

      setStudents(formattedStudents);

      // Format active sessions
      const formattedSessions = activeQuizSessions?.map(session => ({
        id: session.id,
        student_name: session.student?.full_name || 'Unknown',
        started_at: session.started_at,
        status: session.status,
        progress: Math.floor(Math.random() * 100), // Mock progress
      })) || [];

      setActiveSessions(formattedSessions);
      setHasActiveSessions(formattedSessions.length > 0);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartAllQuizzes = async () => {
    try {
      // Create quiz sessions for all active students
      const activeLicenses = await supabase
        .from('student_licenses')
        .select('student_id, university_id')
        .eq('is_active', true);

      if (activeLicenses.data) {
        const sessionsToCreate = activeLicenses.data.map(license => ({
          student_id: license.student_id,
          university_id: license.university_id,
          status: 'active' as const,
          started_at: new Date().toISOString(),
          duration_minutes: 60,
        }));

        const { error } = await supabase
          .from('quiz_sessions')
          .insert(sessionsToCreate);

        if (error) throw error;

        toast({
          title: 'Quiz Started',
          description: `Quiz sessions started for ${sessionsToCreate.length} students`,
        });

        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to start quiz sessions',
        variant: 'destructive',
      });
    }
  };

  const handleStopAllQuizzes = async () => {
    try {
      const { error } = await supabase
        .from('quiz_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString() 
        })
        .eq('status', 'active');

      if (error) throw error;

      toast({
        title: 'Quiz Stopped',
        description: 'All active quiz sessions have been stopped',
      });

      fetchDashboardData();
    } catch (error) {
      console.error('Error stopping quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to stop quiz sessions',
        variant: 'destructive',
      });
    }
  };

  const handleAddStudent = () => {
    toast({
      title: 'Add Student',
      description: 'Student creation modal will open here',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const licenseExpiryDate = new Date(stats.licenseExpiry);
  const daysToExpiry = Math.ceil((licenseExpiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Mars Inc. Quiz Management</span>
              <div className="text-sm text-gray-500">University Admin Portal</div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-900">{profile?.full_name}</div>
              <div className="text-xs text-gray-500">University Administrator</div>
            </div>
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={signOut}
              className="text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* License Expiry Warning */}
        {daysToExpiry <= 3 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-orange-800 font-medium">
                License expires in {daysToExpiry} days
              </span>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              University Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage students and control quiz sessions
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleAddStudent} variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
            {hasActiveSessions ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Square className="w-4 h-4 mr-2" />
                    Stop All Quizzes
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Stop All Quiz Sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will immediately end all active quiz sessions. Students will not be able to continue their quizzes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStopAllQuizzes}>
                      Stop All Quizzes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button 
                onClick={handleStartAllQuizzes} 
                disabled={!canStartQuiz}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start All Quizzes
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available Licenses</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.availableLicenses}</p>
                  <p className="text-xs text-gray-500">of {stats.totalLicenses} total</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Students</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeStudents}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Sessions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeSessions}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">License Expires</p>
                  <p className="text-xl font-bold text-gray-900">{daysToExpiry} days</p>
                  <p className="text-xs text-gray-500">{licenseExpiryDate.toLocaleDateString()}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  daysToExpiry <= 3 ? 'bg-red-100' : 'bg-orange-100'
                }`}>
                  <Clock className={`w-6 h-6 ${
                    daysToExpiry <= 3 ? 'text-red-600' : 'text-orange-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Active Quiz Sessions</span>
                <Badge variant="destructive">{activeSessions.length} Live</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.student_name}</TableCell>
                      <TableCell>{new Date(session.started_at).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full" 
                              style={{ width: `${session.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{session.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Students Management</span>
              <Badge variant="secondary">{students.length} Total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>{student.username}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={student.is_active ? 'default' : 'secondary'}
                      >
                        {student.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {student.last_login 
                        ? new Date(student.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};