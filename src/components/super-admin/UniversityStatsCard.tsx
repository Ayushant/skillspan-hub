import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Building, AlertTriangle } from 'lucide-react';

interface UniversityStatsProps {
  universityName: string;
  adminEmail: string;
  totalLicenses: number;
  usedLicenses: number;
  remainingLicenses: number;
  usagePercentage: number;
}

export const UniversityStatsCard: React.FC<UniversityStatsProps> = ({
  universityName,
  adminEmail,
  totalLicenses,
  usedLicenses,
  remainingLicenses,
  usagePercentage,
}) => {
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'secondary';
    return 'default';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{universityName}</CardTitle>
              <p className="text-sm text-muted-foreground">{adminEmail}</p>
            </div>
          </div>
          <Badge variant={getStatusColor(usagePercentage)}>
            {usagePercentage}% Used
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">License Usage</span>
            <span className="font-medium">
              {usedLicenses} of {totalLicenses} licenses
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-primary mr-1" />
            </div>
            <p className="text-2xl font-bold text-primary">{usedLicenses}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Building className="h-4 w-4 text-muted-foreground mr-1" />
            </div>
            <p className="text-2xl font-bold">{totalLicenses}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {remainingLicenses === 0 ? (
                <AlertTriangle className="h-4 w-4 text-destructive mr-1" />
              ) : (
                <Users className="h-4 w-4 text-success mr-1" />
              )}
            </div>
            <p className={`text-2xl font-bold ${remainingLicenses === 0 ? 'text-destructive' : 'text-success'}`}>
              {remainingLicenses}
            </p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
        </div>

        {remainingLicenses === 0 && (
          <div className="flex items-center justify-center p-2 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
            <span className="text-sm font-medium text-destructive">License Limit Reached</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};