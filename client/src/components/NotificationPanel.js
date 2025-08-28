import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Bell, 
  Users, 
  UserPlus, 
  Check, 
  X, 
  MessageSquare,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationAPI, teamRequestAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function NotificationPanel() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Refresh notifications every 30 seconds to check for new applications
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications({ limit: 20 });
      const allNotifications = response.data.notifications || [];
      
      console.log('Fetched notifications:', allNotifications);
      
      // Show all notifications, prioritize team applications
      setNotifications(allNotifications);
      
      // Count unread notifications, especially team applications
      const unread = allNotifications.filter(n => !n.isRead).length;
      const teamApplications = allNotifications.filter(n => n.type === 'team_application' && !n.isRead).length;
      
      console.log('Unread notifications:', unread);
      console.log('Team applications:', teamApplications);
      
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleManageApplication = async (teamId, applicationId, status) => {
    try {
      setLoading(true);
      await teamRequestAPI.manageApplication(teamId, applicationId, status);
      toast.success(`Application ${status} successfully`);
      
      // Refresh notifications after action
      await fetchNotifications();
      
    } catch (error) {
      toast.error(`Failed to ${status} application`);
      console.error('Manage application error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      await fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'team_application':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'team_application_response':
        return <Users className="h-4 w-4 text-primary" />;
      case 'project_invitation':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'supervisor_request':
        return <Users className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <Card className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden z-50 shadow-lg border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-card-foreground">Notifications</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={fetchNotifications} className="h-6 px-2">
                    <span className="text-xs text-muted-foreground">Refresh</span>
                  </Button>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 px-2">
                      <span className="text-xs text-muted-foreground">Mark all read</span>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Team requests will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`p-4 transition-colors hover:bg-muted/50 cursor-pointer ${
                          !notification.isRead ? 'bg-accent/30 border-l-2 border-l-primary' : ''
                        }`}
                        onClick={() => !notification.isRead && markAsRead(notification._id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Enhanced rendering for team applications */}
                            {notification.type === 'team_application' ? (
                              <div className="space-y-3">
                                <div>
                                  <p className="font-medium text-sm text-card-foreground leading-tight">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {notification.message}
                                  </p>
                                </div>
                                
                                {/* Elegant Action Buttons */}
                                {notification.actionData?.applicationId && notification.actionData?.teamId && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleManageApplication(
                                          notification.actionData.teamId, 
                                          notification.actionData.applicationId, 
                                          'accepted'
                                        );
                                      }}
                                      disabled={loading}
                                      className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleManageApplication(
                                          notification.actionData.teamId, 
                                          notification.actionData.applicationId, 
                                          'rejected'
                                        );
                                      }}
                                      disabled={loading}
                                      className="h-7 px-3 text-xs border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Decline
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Default notification rendering
                              <div>
                                <p className="font-medium text-sm text-card-foreground">{notification.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeAgo(notification.createdAt)}
                              </span>
                              {!notification.isRead && (
                                <Badge variant="secondary" className="text-xs h-4 px-1.5">
                                  New
                                </Badge>
                              )}
                              {notification.type === 'team_application' && (
                                <Badge variant="default" className="text-xs h-4 px-1.5 bg-primary/10 text-primary border border-primary/20">
                                  Team Request
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-3 border-t border-border bg-muted/30">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setIsOpen(false);
                      // Navigate to activity page
                      window.location.href = '/activity';
                    }}
                  >
                    View All Activity
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
