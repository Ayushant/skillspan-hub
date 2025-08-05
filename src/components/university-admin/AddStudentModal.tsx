import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const [formData, setFormData] = useState<StudentFormData>({
    fullName: '',
    email: '',
    password: '',
    username: '',
  });

  const handleInputChange = (field: keyof StudentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateUsername = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const username = `student${randomNum}`;
    setFormData(prev => ({ ...prev, username }));
  };

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

      // Create the student user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
            role: 'student',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create student account');

      // Wait a moment for the profile to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the student's profile
      const { data: studentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError) throw profileError;

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
      const { error: licenseError } = await supabase
        .from('student_licenses')
        .insert({
          student_id: studentProfile.id,
          university_id: university.id,
          license_package_id: licensePackage.id,
          username: formData.username,
          is_active: true,
        });

      if (licenseError) throw licenseError;

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