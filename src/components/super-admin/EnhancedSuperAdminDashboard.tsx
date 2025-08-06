import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UniversityStatsCard } from './UniversityStatsCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Building, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Plus
} from 'lucide-react';

interface UniversityStats {
  university_id: string;
  university_name: string;
  admin_email: string;
  total_licenses: number;
  used_licenses: number;
  remaining_licenses: number;
  usage_percentage: number;
}

interface DashboardOverview {
  totalUniversities: number;
  totalLicenses: number;
  usedLicenses: number;
  totalRevenue: number;
  averageUsage: number;
}

export const EnhancedSuperAdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [universities, setUniversities] = useState<UniversityStats[]>([]);
  const [overview, setOverview] = useState<DashboardOverview>({
    totalUniversities: 0,
    totalLicenses: 0,
    usedLicenses: 0,
    totalRevenue: 0,
    averageUsage: 0,
  });

  const fetchUniversityStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_university_stats');
      
      if (error) throw error;

      const statsData = data || [];
      setUniversities(statsData);

      // Calculate overview stats
      const totalUniversities = statsData.length;
      const totalLicenses = statsData.reduce((sum: number, uni: any) => sum + (uni.total_licenses || 0), 0);
      const usedLicenses = statsData.reduce((sum: number, uni: any) => sum + (uni.used_licenses || 0), 0);
      const averageUsage = totalLicenses > 0 ? (usedLicenses / totalLicenses) * 100 : 0;
      
      // Calculate revenue (assuming $50 per license)
      const totalRevenue = totalLicenses * 50;

      setOverview({
        totalUniversities,
        totalLicenses,
        usedLicenses,
        totalRevenue,
        averageUsage: Math.round(averageUsage * 100) / 100,
      });

    } catch (error: any) {
      console.error('Error fetching university stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load university statistics',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUniversityStats();
    setRefreshing(false);
    toast({
      title: 'Success',
      description: 'Dashboard data refreshed',
    });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchUniversityStats();
      setLoading(false);
    };

    loadData();

    // Set up real-time subscription for license changes
    const subscription = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_licenses'
        },
        () => {
          fetchUniversityStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const criticalUniversities = universities.filter(uni => uni.usage_percentage >= 90);
  const warningUniversities = universities.filter(uni => uni.usage_percentage >= 75 && uni.usage_percentage < 90);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor university licenses and system usage
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add University
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {criticalUniversities.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalUniversities.length} universities</strong> have reached 90%+ license usage.
            Immediate attention required!
          </AlertDescription>
        </Alert>
      )}

      {warningUniversities.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{warningUniversities.length} universities</strong> are approaching their license limits (75%+ usage).
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Universities</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalUniversities}</div>
            <p className="text-xs text-muted-foreground">
              Active institutions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalLicenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {overview.usedLicenses.toLocaleString()} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.averageUsage}%</div>
            <p className="text-xs text-muted-foreground">
              License utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {overview.totalLicenses} licenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Universities Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">University License Status</h2>
          <div className="flex gap-2">
            <Badge variant="destructive" className="text-xs">
              Critical (90%+)
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Warning (75%+)
            </Badge>
            <Badge variant="default" className="text-xs">
              Normal (&lt;75%)
            </Badge>
          </div>
        </div>

        {universities.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No universities found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {universities.map((university) => (
              <UniversityStatsCard
                key={university.university_id}
                universityName={university.university_name}
                adminEmail={university.admin_email}
                totalLicenses={university.total_licenses}
                usedLicenses={university.used_licenses}
                remainingLicenses={university.remaining_licenses}
                usagePercentage={university.usage_percentage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};