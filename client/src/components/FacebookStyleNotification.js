import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  X,
  Clock
} from 'lucide-react';
import { teamRequestAPI, notificationAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function FacebookStyleNotification({ notification, onClose, onAction }) {
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleManageApplication = async (status) => {
    if (!notification?.actionData?.teamId || !notification?.actionData?.applicationId) {
      toast.error('Missing application data');
      return;
    }

    try {
      setLoading(true);
      
      await teamRequestAPI.manageApplication(
        notification.actionData.teamId, 
        notification.actionData.applicationId, 
        status
      );
      
      // Mark notification as read
      await notificationAPI.markAsRead(notification._id);
      
      toast.success(`Application ${status} successfully`);
      
      // Call parent action handler
      if (onAction) onAction(status);
      
      // Close notification
      handleClose();
      
    } catch (error) {
      toast.error(`Failed to ${status} application`);
      console.error('Manage application error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
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

  if (!notification) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-20 z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Facebook-style Notification Popup */}
      <div 
        className={`fixed top-4 right-4 z-50 w-80 transform transition-all duration-300 ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
        }`}
      >
        <Card className="border-blue-200 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-medium text-blue-900">
                  Team Request
                </CardTitle>
                <Badge variant="destructive" className="text-xs">
                  New
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* User Info */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {notification.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {getTimeAgo(notification.createdAt)}
                </p>
              </div>
            </div>
            
            {/* Action Buttons - Facebook Style */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleManageApplication('accepted')}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                onClick={() => handleManageApplication('rejected')}
                disabled={loading}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
            
            {/* View Details Link */}
            <div className="text-center pt-2 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 text-xs"
                onClick={() => {
                  // Navigate to teams page
                  window.location.href = '/teams';
                }}
              >
                View All Team Requests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
