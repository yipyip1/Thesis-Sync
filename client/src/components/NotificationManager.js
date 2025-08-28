import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FacebookStyleNotification from './FacebookStyleNotification';
import socketService from '../utils/socketService';

export default function NotificationManager() {
  const { user } = useAuth();
  const [activeNotifications, setActiveNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Listen for team application notifications
    const handleTeamApplication = (notificationData) => {
      console.log('Received team application notification:', notificationData);
      
      // Only show popup for team applications that are for this user
      if (notificationData.recipient === user.id && notificationData.type === 'team_application') {
        setActiveNotifications(prev => [...prev, {
          ...notificationData,
          id: Date.now() + Math.random() // Unique ID for this popup
        }]);
      }
    };

    // Listen for new notifications
    socket.on('new-notification', handleTeamApplication);
    socket.on('team-application-received', handleTeamApplication);

    // Cleanup
    return () => {
      socket.off('new-notification', handleTeamApplication);
      socket.off('team-application-received', handleTeamApplication);
    };
  }, [user]);

  const handleCloseNotification = (notificationId) => {
    setActiveNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const handleNotificationAction = (notificationId, action) => {
    // Remove the notification after action
    handleCloseNotification(notificationId);
    
    // You could add additional logic here like refreshing data
    console.log(`Notification ${notificationId} action: ${action}`);
  };

  return (
    <div>
      {activeNotifications.map((notification) => (
        <FacebookStyleNotification
          key={notification.id}
          notification={notification}
          onClose={() => handleCloseNotification(notification.id)}
          onAction={(action) => handleNotificationAction(notification.id, action)}
        />
      ))}
    </div>
  );
}
