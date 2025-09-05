import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.role || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('https://thesis-sync-production.up.railway.app/api/auth/register', {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      
      if (response.data.success) {
        toast.success('Account created successfully!');
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">ThesisSync</h1>
          </div>
          <h2 className="text-xl text-muted-foreground">Create your account</h2>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Join ThesisSync to start your academic journey</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="John" 
                    className="bg-input"
                    value={formData.firstName}
                    onChange={handleChange('firstName')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Doe" 
                    className="bg-input"
                    value={formData.lastName}
                    onChange={handleChange('lastName')}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john.doe@university.edu" 
                  className="bg-input"
                  value={formData.email}
                  onChange={handleChange('email')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={handleRoleChange} required>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Create a strong password" 
                  className="bg-input"
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Confirm your password" 
                  className="bg-input"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
            <div className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
