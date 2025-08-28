import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  Activity, 
  Clock, 
  Filter, 
  Search, 
  RefreshCw,
  FolderPlus, 
  Folder, 
  Users, 
  UserPlus, 
  Lightbulb, 
  MessageSquare, 
  Shield, 
  Mail, 
  Bell, 
  Megaphone,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import { activityAPI, teamRequestAPI, notificationAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function ActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'user_activity', label: 'My Actions' },
    { value: 'notification', label: 'Notifications' },
    { value: 'team_request_created', label: 'Team Requests' },
    { value: 'thesis_project_created', label: 'Projects' },
    { value: 'idea_created', label: 'Ideas' },
    { value: 'message_sent', label: 'Messages' }
  ];

  useEffect(() => {
    fetchActivities(true);
  }, [filterType, searchTerm]);

  const fetchActivities = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const params = {
        page: currentPage,
        limit: 20
      };
      
      if (filterType !== 'all') {
        params.type = filterType;
      }
      
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await activityAPI.getDashboardActivity(params);
      const newActivities = response.data.activities || [];
      
      if (reset) {
        setActivities(newActivities);
        setPage(1);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
      }
      
      setHasMore(newActivities.length === 20);
      if (!reset) setPage(prev => prev + 1);
      
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleManageApplication = async (teamId, applicationId, status, activityId) => {
    try {
      await teamRequestAPI.manageApplication(teamId, applicationId, status);
      toast.success(`Application ${status} successfully`);
      
      // Mark related notification as read if activityId provided
      if (activityId) {
        await notificationAPI.markAsRead(activityId);
      }
      
      // Refresh activities to update UI
      fetchActivities(true);
      
    } catch (error) {
      toast.error(`Failed to ${status} application`);
      console.error('Manage application error:', error);
    }
  };

  const getActivityIcon = (iconName) => {
    const iconMap = {
      'folder-plus': FolderPlus,
      'folder': Folder,
      'users': Users,
      'user-plus': UserPlus,
      'lightbulb': Lightbulb,
      'message-square': MessageSquare,
      'shield': Shield,
      'activity': Activity,
      'mail': Mail,
      'bell': Bell,
      'megaphone': Megaphone,
      'check-circle': CheckCircle,
      'alert-circle': AlertCircle,
      'trending-up': TrendingUp,
      'clock': Clock
    };
    
    return iconMap[iconName] || Activity;
  };

  const getActivityColor = (colorName) => {
    const colorMap = {
      'blue': 'text-blue-500',
      'green': 'text-green-500',
      'yellow': 'text-yellow-500',
      'purple': 'text-purple-500',
      'red': 'text-red-500',
      'orange': 'text-orange-500',
      'indigo': 'text-indigo-500',
      'pink': 'text-pink-500',
      'gray': 'text-gray-500'
    };
    
    return colorMap[colorName] || 'text-gray-500';
  };

  const formatActivityDetails = (details) => {
    if (!details) return null;
    
    if (typeof details === 'string') return details;
    
    if (typeof details === 'object') {
      if (details.message && details.sender) {
        return `Message from ${details.sender}: "${details.message}"`;
      }
      if (details.teamRequestId && details.title) {
        return `Team request: ${details.title}`;
      }
      if (details.projectTitle) {
        return `Project: ${details.projectTitle}`;
      }
      if (details.groupName) {
        return `Group: ${details.groupName}`;
      }
      if (details.ideaTitle) {
        return `Idea: ${details.ideaTitle}`;
      }
      
      const entries = Object.entries(details);
      if (entries.length > 0) {
        return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
      }
    }
    
    return null;
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleRefresh = () => {
    fetchActivities(true);
    toast.success('Activities refreshed');
  };

  const handleLoadMore = () => {
    fetchActivities(false);
  };

  const filteredActivities = activities.filter(activity => {
    if (searchTerm) {
      return activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (activity.details && JSON.stringify(activity.details).toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Activity Feed
            </h1>
            <p className="text-muted-foreground">Track all your actions and notifications</p>
          </div>
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background"
                >
                  {activityTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Activities ({filteredActivities.length})</CardTitle>
              <Badge variant="secondary">{user?.name}</Badge>
            </div>
            <CardDescription>Your complete activity history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && activities.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No activities found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterType !== 'all' 
                    ? "Try adjusting your search or filter criteria"
                    : "Your activities will appear here as you use the platform"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivities.map((activity, index) => {
                  const IconComponent = getActivityIcon(activity.icon);
                  const iconColor = getActivityColor(activity.color);
                  const formattedDetails = formatActivityDetails(activity.details);
                  
                  return (
                    <div 
                      key={`${activity.id}-${index}`} 
                      className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                        !activity.read ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className={`mt-1 flex-shrink-0`}>
                        <IconComponent className={`h-6 w-6 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium">{activity.action}</p>
                        {formattedDetails && (
                          <p className="text-xs text-muted-foreground mt-1">{formattedDetails}</p>
                        )}
                        
                        {/* Team Application Actions */}
                        {activity.type === 'notification' && activity.notificationType === 'team_application' && !activity.read && activity.actionData && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => handleManageApplication(
                                activity.actionData.teamId || activity.relatedId, 
                                activity.actionData.applicationId, 
                                'accepted',
                                activity.id
                              )}
                              className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManageApplication(
                                activity.actionData.teamId || activity.relatedId, 
                                activity.actionData.applicationId, 
                                'rejected',
                                activity.id
                              )}
                              className="h-7 px-3 text-xs border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(activity.timestamp)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {activity.type === 'user_activity' ? 'My Action' : 'Notification'}
                          </Badge>
                          {activity.type === 'notification' && activity.notificationType === 'team_application' && (
                            <Badge variant="default" className="text-xs bg-blue-600">
                              Needs Action
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!activity.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
                
                {hasMore && (
                  <div className="text-center pt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleLoadMore}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More Activities'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
