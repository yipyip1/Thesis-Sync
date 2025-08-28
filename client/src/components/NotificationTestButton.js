import React, { useState } from 'react';
import { Button } from './ui/button';
import FacebookStyleNotification from './FacebookStyleNotification';

export default function NotificationTestButton() {
  const [showNotification, setShowNotification] = useState(false);

  const handleTestNotification = () => {
    setShowNotification(true);
  };

  const testNotification = {
    _id: 'test-notification-123',
    type: 'team_application',
    title: 'New Team Application',
    message: 'John Doe wants to join your team "AI Research Project"',
    createdAt: new Date(),
    isRead: false,
    actionData: {
      applicationId: 'test-app-123',
      teamId: 'test-team-123',
      applicantId: 'test-user-123'
    }
  };

  return (
    <div>
      <Button 
        onClick={handleTestNotification}
        className="bg-purple-600 hover:bg-purple-700"
      >
        Test Facebook Notification
      </Button>
      
      {showNotification && (
        <FacebookStyleNotification
          notification={testNotification}
          onClose={() => setShowNotification(false)}
          onAction={(action) => {
            console.log('Test notification action:', action);
            setShowNotification(false);
          }}
        />
      )}
    </div>
  );
}
