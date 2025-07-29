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
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Mars Inc. Quiz Management</span>
              <div className="text-sm text-gray-500">Super Admin Portal</div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-900">{profile?.full_name}</div>
              <div className="text-xs text-gray-500">Super Administrator</div>
            </div>
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
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor system performance and manage universities
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleExportReports} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Reports
            </Button>
            <Button onClick={handleCreateUniversity} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create University
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Universities Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Universities Management</span>
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {universities.map((university) => (
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit University
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete University
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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