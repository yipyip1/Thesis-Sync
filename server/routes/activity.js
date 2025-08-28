const express = require('express');
const User = require('../models/User');
const TeamRequest = require('../models/TeamRequest');
const ThesisProject = require('../models/ThesisProject');
const ThesisIdea = require('../models/ThesisIdea');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

// Get comprehensive activity feed for dashboard
router.get('/dashboard-activity', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get user's activity log
    const user = await User.findById(req.userId).select('activityLog');
    const userActivities = user.activityLog || [];
    
    // Get notifications
    const notifications = await Notification.find({ recipient: req.userId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Combine and format all activities
    const allActivities = [];
    
    // Add user activities
    userActivities.forEach(activity => {
      allActivities.push({
        id: `user_${activity._id}`,
        type: 'user_activity',
        action: formatActivityAction(activity.action, activity.details),
        timestamp: activity.timestamp,
        details: activity.details,
        icon: getActivityIcon(activity.action),
        color: getActivityColor(activity.action)
      });
    });
    
    // Add notifications as activities
    notifications.forEach(notification => {
      allActivities.push({
        id: `notif_${notification._id}`,
        type: 'notification',
        action: notification.title,
        timestamp: notification.createdAt,
        details: {
          message: notification.message,
          sender: notification.sender,
          type: notification.type
        },
        icon: getNotificationIcon(notification.type),
        color: getNotificationColor(notification.type),
        read: notification.read
      });
    });
    
    // Sort by timestamp (most recent first) and limit
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      activities: sortedActivities,
      total: allActivities.length
    });
    
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity feed'
    });
  }
});

// Format activity action text
function formatActivityAction(action, details) {
  switch (action) {
    case 'team_request_created':
      return `Created team request "${details?.title || 'Untitled'}"`;
    case 'team_application_sent':
      return `Applied to join team "${details?.teamTitle || 'Unknown'}"`;
    case 'project_created':
      return `Created new project "${details?.title || 'Untitled'}"`;
    case 'project_joined':
      return `Joined project "${details?.title || 'Unknown'}"`;
    case 'thesis_idea_created':
      return `Posted new thesis idea "${details?.title || 'Untitled'}"`;
    case 'profile_updated':
      return 'Updated profile information';
    case 'skills_updated':
      return 'Updated skills and interests';
    case 'password_changed':
      return 'Changed account password';
    case 'group_created':
      return `Created group "${details?.name || 'Untitled'}"`;
    case 'group_joined':
      return `Joined group "${details?.name || 'Unknown'}"`;
    case 'message_sent':
      return `Sent message in "${details?.groupName || 'Unknown'}"`;
    default:
      return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

// Get icon for activity type
function getActivityIcon(action) {
  switch (action) {
    case 'team_request_created':
      return 'users';
    case 'team_application_sent':
      return 'user-plus';
    case 'project_created':
      return 'folder-plus';
    case 'project_joined':
      return 'folder';
    case 'thesis_idea_created':
      return 'lightbulb';
    case 'profile_updated':
    case 'skills_updated':
      return 'user';
    case 'password_changed':
      return 'shield';
    case 'group_created':
    case 'group_joined':
      return 'message-circle';
    case 'message_sent':
      return 'message-square';
    default:
      return 'activity';
  }
}

// Get color for activity type
function getActivityColor(action) {
  switch (action) {
    case 'team_request_created':
    case 'project_created':
    case 'thesis_idea_created':
    case 'group_created':
      return 'green';
    case 'team_application_sent':
    case 'project_joined':
    case 'group_joined':
      return 'blue';
    case 'profile_updated':
    case 'skills_updated':
      return 'yellow';
    case 'password_changed':
      return 'red';
    case 'message_sent':
      return 'purple';
    default:
      return 'gray';
  }
}

// Get notification icon
function getNotificationIcon(type) {
  switch (type) {
    case 'team_application':
      return 'user-plus';
    case 'team_invitation':
      return 'mail';
    case 'project_update':
      return 'folder';
    case 'deadline_reminder':
      return 'clock';
    case 'system_announcement':
      return 'megaphone';
    default:
      return 'bell';
  }
}

// Get notification color
function getNotificationColor(type) {
  switch (type) {
    case 'team_application':
      return 'blue';
    case 'team_invitation':
      return 'green';
    case 'project_update':
      return 'yellow';
    case 'deadline_reminder':
      return 'red';
    case 'system_announcement':
      return 'purple';
    default:
      return 'gray';
  }
}

module.exports = router;
