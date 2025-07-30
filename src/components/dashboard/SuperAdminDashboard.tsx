import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle,
  MoreHorizontal,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Menu,
  Bell,
  Settings,
  Moon,
  Sun,
  BarChart3,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UniversityManagement } from '@/components/super-admin/UniversityManagement';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DashboardStats {
  totalUniversities: number;
  totalLicenses: number;
  activeLicenses: number;
  totalRevenue: number;
  activeStudents: number;
}

interface University {
  id: string;
  name: string;
  admin_email: string;
  license_limit: number;
  status: string;
  created_at: string;
  license_expiry: string;
}

export const SuperAdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUniversities: 0,
    totalLicenses: 0,
    activeLicenses: 0,
    totalRevenue: 0,
    activeStudents: 0,
  });
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch universities with admin info
      const { data: universitiesData, error: univError } = await supabase
        .from('universities')
        .select(`
          *,
          admin:profiles!universities_admin_id_fkey(email)
        `);

      if (univError) throw univError;

      const formattedUniversities = universitiesData?.map(uni => ({
        id: uni.id,
        name: uni.name,
        admin_email: uni.admin?.email || 'No admin assigned',
        license_limit: uni.license_limit,
        status: uni.status,
        created_at: uni.created_at,
        license_expiry: uni.license_expiry,
      })) || [];

      setUniversities(formattedUniversities);

      // Fetch license packages
      const { data: licensesData, error: licenseError } = await supabase
        .from('license_packages')
        .select('*');

      if (licenseError) throw licenseError;

      // Fetch student licenses
      const { data: studentLicensesData, error: studentError } = await supabase
        .from('student_licenses')
        .select('*');

      if (studentError) throw studentError;

      // Calculate stats
      const totalLicenses = licensesData?.reduce((sum, pkg) => sum + pkg.total_licenses, 0) || 0;
      const activeLicenses = studentLicensesData?.filter(license => license.is_active).length || 0;
      const totalRevenue = licensesData?.reduce((sum, pkg) => sum + (pkg.total_licenses * pkg.price_per_license), 0) || 0;

      setStats({
        totalUniversities: universitiesData?.length || 0,
        totalLicenses,
        activeLicenses,
        totalRevenue,
        activeStudents: activeLicenses,
      });

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

  const handleCreateUniversity = () => {
    // TODO: Open create university modal
    toast({
      title: 'Create University',
      description: 'University creation modal will open here',
    });
  };

  const handleExportReports = () => {
    toast({
      title: 'Export Reports',
      description: 'Reports are being generated and will be downloaded shortly',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
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

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'universities', label: 'Universities', icon: Building2 },
    { id: 'licenses', label: 'License Packages', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    // In a real app, you'd persist this to localStorage
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'universities':
        return <UniversityManagement />;
      case 'licenses':
        return <div className="p-6 text-center text-gray-500">License Packages management coming soon...</div>;
      case 'analytics':
        return <div className="p-6 text-center text-gray-500">Analytics dashboard coming soon...</div>;
      case 'reports':
        return <div className="p-6 text-center text-gray-500">Reports section coming soon...</div>;
      default:
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
              <h1 className="text-2xl font-bold mb-2">
                Welcome back, {profile?.full_name || 'Super Admin'}
              </h1>
              <p className="opacity-90">
                Today is {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Universities</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalUniversities}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-blue-500" />
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
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Licenses</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalLicenses}</p>
                      <p className="text-xs text-gray-500">{stats.activeLicenses} active</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Monthly Revenue</p>
                      <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Universities Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Universities</span>
                  <Badge variant="secondary">{universities.length} Total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>University Name</TableHead>
                      <TableHead>Admin Email</TableHead>
                      <TableHead>License Limit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universities.slice(0, 5).map((university) => (
                      <TableRow key={university.id}>
                        <TableCell className="font-medium">{university.name}</TableCell>
                        <TableCell>{university.admin_email}</TableCell>
                        <TableCell>{university.license_limit}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={university.status === 'active' ? 'default' : 'secondary'}
                          >
                            {university.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(university.license_expiry).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {universities.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('universities')}
                    >
                      View All Universities
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <span className="font-semibold text-gray-900">Mars Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(true)}
            className="lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        <nav className="mt-6 px-3">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-3 py-2 text-left rounded-lg mb-1 transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? '' : 'lg:ml-64'}`}>
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="mr-4"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              {navigationItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-gray-600 hover:text-gray-800"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800 relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {profile?.full_name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-medium text-gray-900">{profile?.full_name}</div>
                    <div className="text-xs text-gray-500">Super Administrator</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
                <div className="h-64 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};