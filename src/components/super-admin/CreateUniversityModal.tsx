import React, { useState } from 'react';
import { X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateUniversityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UniversityFormData {
  name: string;
  admin_email: string;
  admin_password: string;
  license_limit: number;
  address: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  admin_email?: string;
  admin_password?: string;
  license_limit?: string;
}

export const CreateUniversityModal: React.FC<CreateUniversityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<UniversityFormData>({
    name: '',
    admin_email: '',
    admin_password: '',
    license_limit: 100,
    address: '',
    phone: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'University name is required';
    }

    if (!formData.admin_email.trim()) {
      newErrors.admin_email = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      newErrors.admin_email = 'Please enter a valid email address';
    }

    if (!formData.admin_password) {
      newErrors.admin_password = 'Password is required';
    } else if (formData.admin_password.length < 6) {
      newErrors.admin_password = 'Password must be at least 6 characters';
    }

    if (formData.license_limit < 1 || formData.license_limit > 1000) {
      newErrors.license_limit = 'License limit must be between 1 and 1000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrength = (password: string): { score: number; text: string; color: string } => {
    if (password.length === 0) return { score: 0, text: '', color: '' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strength = [
      { text: 'Very Weak', color: 'text-red-500' },
      { text: 'Weak', color: 'text-orange-500' },
      { text: 'Fair', color: 'text-yellow-500' },
      { text: 'Good', color: 'text-blue-500' },
      { text: 'Strong', color: 'text-green-500' },
    ];

    return { score, ...strength[Math.min(score, 4)] };
  };

  const handleInputChange = (field: keyof UniversityFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // First, create the university admin user using regular signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.admin_email,
        password: formData.admin_password,
        options: {
          data: {
            full_name: `${formData.name} Admin`,
            role: 'university_admin'
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create admin user');
      }

      // Create the university record
      const { error: universityError } = await supabase
        .from('universities')
        .insert({
          name: formData.name,
          admin_id: authData.user.id,
          license_limit: formData.license_limit,
          license_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          status: 'active'
        });

      if (universityError) {
        throw new Error(universityError.message);
      }

      toast({
        title: 'University Created Successfully',
        description: `${formData.name} has been created with admin credentials sent to ${formData.admin_email}`,
      });

      onSuccess();
      onClose();
      setFormData({
        name: '',
        admin_email: '',
        admin_password: '',
        license_limit: 100,
        address: '',
        phone: '',
      });
      setErrors({});

    } catch (error: any) {
      console.error('Error creating university:', error);
      toast({
        title: 'Error Creating University',
        description: error.message || 'Failed to create university. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const passwordStrength = getPasswordStrength(formData.admin_password);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New University</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* University Name */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              University Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter university name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Admin Email */}
          <div>
            <Label htmlFor="admin_email" className="text-sm font-medium text-gray-700">
              Admin Email *
            </Label>
            <Input
              id="admin_email"
              type="email"
              value={formData.admin_email}
              onChange={(e) => handleInputChange('admin_email', e.target.value)}
              className={`mt-1 ${errors.admin_email ? 'border-red-500' : ''}`}
              placeholder="admin@university.edu"
            />
            {errors.admin_email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.admin_email}
              </p>
            )}
          </div>

          {/* Admin Password */}
          <div>
            <Label htmlFor="admin_password" className="text-sm font-medium text-gray-700">
              Admin Password *
            </Label>
            <div className="relative mt-1">
              <Input
                id="admin_password"
                type={showPassword ? 'text' : 'password'}
                value={formData.admin_password}
                onChange={(e) => handleInputChange('admin_password', e.target.value)}
                className={`pr-10 ${errors.admin_password ? 'border-red-500' : ''}`}
                placeholder="Create a secure password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {formData.admin_password && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Password Strength:</span>
                  <span className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${
                      passwordStrength.score <= 1 ? 'bg-red-500' :
                      passwordStrength.score <= 2 ? 'bg-yellow-500' :
                      passwordStrength.score <= 3 ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {errors.admin_password && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.admin_password}
              </p>
            )}
          </div>

          {/* License Limit */}
          <div>
            <Label htmlFor="license_limit" className="text-sm font-medium text-gray-700">
              License Limit *
            </Label>
            <Input
              id="license_limit"
              type="number"
              min="1"
              max="1000"
              value={formData.license_limit}
              onChange={(e) => handleInputChange('license_limit', parseInt(e.target.value) || 0)}
              className={`mt-1 ${errors.license_limit ? 'border-red-500' : ''}`}
              placeholder="100"
            />
            <p className="mt-1 text-xs text-gray-500">Maximum number of student licenses (1-1000)</p>
            {errors.license_limit && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.license_limit}
              </p>
            )}
          </div>

          {/* Address (Optional) */}
          <div>
            <Label htmlFor="address" className="text-sm font-medium text-gray-700">
              Address (Optional)
            </Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="mt-1"
              placeholder="University address"
            />
          </div>

          {/* Phone (Optional) */}
          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone (Optional)
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="mt-1"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create University
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};