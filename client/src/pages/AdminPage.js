import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  AlertTriangle, 
  Search,
  Filter,
  Edit,
  Trash2,
  Ban,
  UserCog,
  Mail,
  Activity,
  BarChart3,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, notificationAPI, thesisProjectAPI } from '../utils/api';
import Navigation from '../components/Navigation';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [emailTesting, setEmailTesting] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    supervisors: 0,
    admins: 0,
    bannedUsers: 0,
    activeUsers: 0
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchStats();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers({
        search: searchTerm,
        role: roleFilter !== 'all' ? roleFilter : undefined
      });
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await userAPI.getAllUsers();
      const allUsers = response.data.users || [];
      
      setStats({
        totalUsers: allUsers.length,
        students: allUsers.filter(u => u.role === 'student').length,
        supervisors: allUsers.filter(u => u.role === 'supervisor').length,
        admins: allUsers.filter(u => u.role === 'admin').length,
        bannedUsers: allUsers.filter(u => u.isBanned).length,
        activeUsers: allUsers.filter(u => u.isActive).length
      });
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleRoleChange = async (newRole) => {
    try {
      await userAPI.updateUserRole(selectedUser._id, newRole);
      toast.success(`User role updated to ${newRole}`);
      setShowRoleModal(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update user role');
      console.error('Role update error:', error);
    }
  };

  const handleBanUser = async (isBanned) => {
    try {
      await userAPI.banUser(selectedUser._id, isBanned, banReason);
      toast.success(`User ${isBanned ? 'banned' : 'unbanned'} successfully`);
      setShowBanModal(false);
      setSelectedUser(null);
      setBanReason('');
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(`Failed to ${isBanned ? 'ban' : 'unban'} user`);
      console.error('Ban user error:', error);
    }
  };

  const sendDeadlineReminders = async () => {
    try {
      const response = await notificationAPI.sendDeadlineReminders();
      toast.success(`${response.data.count} deadline reminders sent`);
    } catch (error) {
      toast.error('Failed to send deadline reminders');
      console.error('Send reminders error:', error);
    }
  };

  const cleanupTestProjects = async () => {
    try {
      if (!window.confirm('Are you sure you want to clean up invalid test projects? This action cannot be undone.')) {
        return;
      }
      
      setLoading(true);
      const response = await thesisProjectAPI.cleanupTestProjects();
      toast.success(response.data.message);
      console.log('Cleanup result:', response.data);
    } catch (error) {
      toast.error('Failed to cleanup test projects');
      console.error('Cleanup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testEmailFunction = async () => {
    try {
      if (!testEmail.trim()) {
        toast.error('Please enter an email address');
        return;
      }

      setEmailTesting(true);
      
      // Use the simple email test route
      const response = await fetch('/api/simple-email-test/test-simple-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ testEmail: testEmail.trim() })
      });

      const data = await response.json();
      console.log('Email test result:', data);
      
      if (data.success) {
        toast.success(`Test email sent successfully to ${data.sentTo}! Check your inbox.`);
        setTestEmail('');
      } else {
        toast.error(data.message || 'Failed to send test email');
        console.error('Email error details:', data);
        
        // Show specific configuration help
        if (data.details) {
          toast.error(data.details);
        }
      }
    } catch (error) {
      toast.error('Failed to send test email - check server logs');
      console.error('Email test error:', error);
    } finally {
      setEmailTesting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, roles, and system settings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.students}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supervisors</CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.supervisors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <UserCog className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.activeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Banned</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.bannedUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-border">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'system' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('system')}
          >
            System Tools
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="supervisor">Supervisors</option>
                  <option value="admin">Admins</option>
                </select>
                <Button onClick={fetchUsers} variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Users ({filteredUsers.length})</CardTitle>
                <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-4 font-medium">User</th>
                          <th className="text-left p-4 font-medium">Role</th>
                          <th className="text-left p-4 font-medium">Department</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Joined</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((userData) => (
                          <tr key={userData._id} className="border-b border-border hover:bg-muted/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  {userData.avatar ? (
                                    <img src={userData.avatar} alt={userData.name} className="w-10 h-10 rounded-full" />
                                  ) : (
                                    <span className="text-sm font-medium">
                                      {userData.name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{userData.name}</p>
                                  <p className="text-sm text-muted-foreground">{userData.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant={
                                userData.role === 'admin' ? 'destructive' :
                                userData.role === 'supervisor' ? 'default' : 'secondary'
                              }>
                                {userData.role}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-muted-foreground">
                                {userData.department || 'Not specified'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                {userData.isBanned ? (
                                  <Badge variant="destructive">Banned</Badge>
                                ) : userData.isActive ? (
                                  <Badge variant="default">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                                {userData.isOnline && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-muted-foreground">
                                {new Date(userData.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(userData);
                                    setShowRoleModal(true);
                                  }}
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={userData.isBanned ? "default" : "destructive"}
                                  onClick={() => {
                                    setSelectedUser(userData);
                                    setShowBanModal(true);
                                  }}
                                >
                                  {userData.isBanned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notification Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Notification Tools
                  </CardTitle>
                  <CardDescription>Send system-wide notifications and reminders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={sendDeadlineReminders} className="w-full">
                    Send Deadline Reminders
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Sends email notifications to all users with upcoming deadlines in the next 7 days.
                  </p>
                </CardContent>
              </Card>

              {/* Email Testing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Testing
                  </CardTitle>
                  <CardDescription>Test email notification functionality</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testEmail">Test Email Address</Label>
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="Enter email to test notifications"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={testEmailFunction} 
                    className="w-full"
                    disabled={emailTesting || !testEmail.trim()}
                  >
                    {emailTesting ? 'Sending...' : 'Send Test Email'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Sends a sample team application notification email to test email configuration.
                    Check browser console for detailed error logs if it fails.
                  </p>
                </CardContent>
              </Card>

              {/* System Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    System Statistics
                  </CardTitle>
                  <CardDescription>Overview of platform usage and health</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Projects</span>
                      <span className="text-sm font-medium">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active Teams</span>
                      <span className="text-sm font-medium">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Messages</span>
                      <span className="text-sm font-medium">-</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Cleanup Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Data Cleanup
                  </CardTitle>
                  <CardDescription>Clean up invalid test data and orphaned records</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={cleanupTestProjects} 
                    variant="destructive" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Cleaning...' : 'Cleanup Test Projects'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Removes invalid projects where supervisors are incorrectly listed as students. 
                    This will also clean up associated team chat groups.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Change User Role</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Change role for {selectedUser.name} ({selectedUser.email})
            </p>
            <div className="space-y-2 mb-4">
              {['student', 'supervisor', 'admin'].map((role) => (
                <Button
                  key={role}
                  variant={selectedUser.role === role ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleRoleChange(role)}
                  disabled={selectedUser.role === role}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                  {selectedUser.role === role && " (Current)"}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ban/Unban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {selectedUser.isBanned ? 'Unban User' : 'Ban User'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedUser.isBanned ? 'Unban' : 'Ban'} {selectedUser.name} ({selectedUser.email})
            </p>
            {!selectedUser.isBanned && (
              <div className="mb-4">
                <Label htmlFor="banReason">Reason for ban</Label>
                <Input
                  id="banReason"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter reason for banning this user..."
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                  setBanReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant={selectedUser.isBanned ? "default" : "destructive"}
                className="flex-1"
                onClick={() => handleBanUser(!selectedUser.isBanned)}
                disabled={!selectedUser.isBanned && !banReason.trim()}
              >
                {selectedUser.isBanned ? 'Unban' : 'Ban'} User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
