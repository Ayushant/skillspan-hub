import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, AlertTriangle } from 'lucide-react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface StudentFormData {
  fullName: string;
  email: string;
  password: string;
  username: string;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<{
    total: number;
    used: number;
    remaining: number;
  } | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    fullName: '',
    email: '',
    password: '',
    username: '',
  });

  const handleInputChange = (field: keyof StudentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchLicenseInfo = async () => {
    if (!profile?.id) return;
    
    try {
      const { data: university, error: univError } = await supabase
        .from('universities')
        .select('id')
        .eq('admin_id', profile.id)
        .single();

      if (univError) throw univError;

      const { data: licensePackage, error: packageError } = await supabase
        .from('license_packages')
        .select('total_licenses, used_licenses')
        .eq('university_id', university.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (packageError) throw packageError;

      setLicenseInfo({
        total: licensePackage.total_licenses,
        used: licensePackage.used_licenses,
        remaining: licensePackage.total_licenses - licensePackage.used_licenses,
      });
    } catch (error) {
      console.error('Error fetching license info:', error);
    }
  };

  const generateUsername = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const username = `student${randomNum}`;
    setFormData(prev => ({ ...prev, username }));
  };

  useEffect(() => {
    if (isOpen && profile?.id) {
      fetchLicenseInfo();
    }
  }, [isOpen, profile?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password || !formData.username) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Get university info first
      const { data: university, error: univError } = await supabase
        .from('universities')
        .select('id')
        .eq('admin_id', profile?.id)
        .single();

      if (univError) throw univError;

      // Check license limit before creating student
      const { data: licenseCheck, error: licenseError } = await supabase
        .rpc('check_university_license_limit', { p_university_id: university.id });

      if (licenseError) throw licenseError;
      
      if (!licenseCheck) {
        toast({
          title: 'License Limit Reached',
          description: 'Your university has reached its student license limit. Contact support to upgrade.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create the student user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
            role: 'student',
            university_id: university.id,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create student account');

      console.log('User created:', authData.user.id);

      // Create profile manually with proper permissions
      const { data: studentProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'student',
          university_id: university.id,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);
        throw new Error(`Failed to create student profile: ${createError.message}`);
      }
      
      console.log('Profile created:', studentProfile);

      // Get license package info
      const { data: licensePackages, error: packageError } = await supabase
        .from('license_packages')
        .select('id, used_licenses, total_licenses')
        .eq('university_id', university.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (packageError) throw packageError;
      if (!licensePackages || licensePackages.length === 0) {
        throw new Error('No active license packages found');
      }

      const licensePackage = licensePackages[0];
      
      // Check if there are available licenses
      if (licensePackage.used_licenses >= licensePackage.total_licenses) {
        throw new Error('No available licenses remaining');
      }

      // Create student license entry
      const { error: licenseInsertError } = await supabase
        .from('student_licenses')
        .insert({
          student_id: studentProfile.id,
          university_id: university.id,
          license_package_id: licensePackage.id,
          username: formData.username,
          is_active: true,
        });

      if (licenseInsertError) throw licenseInsertError;

      // Update license package usage
      const { error: updateError } = await supabase
        .from('license_packages')
        .update({ 
          used_licenses: licensePackage.used_licenses + 1 
        })
        .eq('id', licensePackage.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Student account created successfully',
      });

      setFormData({
        fullName: '',
        email: '',
        password: '',
        username: '',
      });

      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error creating student:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create student account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>

        {/* License Status Display */}
        {licenseInfo && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">License Status</span>
              </div>
              <Badge variant={licenseInfo.remaining > 0 ? 'default' : 'destructive'}>
                {licenseInfo.remaining} remaining
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used: {licenseInfo.used}</span>
                <span>Total: {licenseInfo.total}</span>
              </div>
              <Progress 
                value={(licenseInfo.used / licenseInfo.total) * 100} 
                className="h-2" 
              />
            </div>

            {licenseInfo.remaining === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  License limit reached! Contact support to upgrade your plan.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Enter student's full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter student's email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter password for student"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex space-x-2">
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Enter username"
                required
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={generateUsername}
                className="whitespace-nowrap"
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? 'Creating...' : 'Create Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};