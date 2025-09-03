const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { recipient: req.userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.userId, 
      isRead: false 
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Notifications API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Clear all notifications for user (MUST come before /:id route)
router.delete('/clear-all', auth, async (req, res) => {
  try {
    console.log('=== CLEAR ALL NOTIFICATIONS ENDPOINT HIT ===');
    console.log('User ID:', req.userId);
    console.log('Request headers:', req.headers);
    
    if (!req.userId) {
      console.log('ERROR: No user ID found in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    console.log('Attempting to delete notifications for user:', req.userId);
    const result = await Notification.deleteMany({ recipient: req.userId });
    console.log('Delete operation result:', result);

    const response = {
      success: true,
      message: `${result.deletedCount} notifications cleared successfully`,
      deletedCount: result.deletedCount
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('=== CLEAR ALL NOTIFICATIONS ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipient.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Create notification (for system use)
router.post('/', auth, async (req, res) => {
  try {
    const {
      recipient,
      type,
      title,
      message,
      relatedId,
      relatedModel
    } = req.body;

    // Check if sender has permission to send notification
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin' && currentUser.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const notification = new Notification({
      recipient,
      sender: req.userId,
      type,
      title,
      message,
      relatedId,
      relatedModel
    });

    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Send deadline reminder notifications (for cron job)
router.post('/deadline-reminders', auth, async (req, res) => {
  try {
    // Only admin can trigger this
    const currentUser = await User.findById(req.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const ThesisProject = require('../models/ThesisProject');
    
    // Find projects with upcoming deadlines (next 7 days)
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + 7);

    const projects = await ThesisProject.find({
      'importantDates.date': {
        $gte: new Date(),
        $lte: upcomingDate
      },
      'importantDates.isCompleted': false
    }).populate(['students', 'supervisor', 'coSupervisors']);

    let notificationCount = 0;

    for (const project of projects) {
      for (const date of project.importantDates) {
        if (!date.isCompleted && new Date(date.date) <= upcomingDate && new Date(date.date) >= new Date()) {
          const recipients = [
            ...project.students,
            project.supervisor,
            ...project.coSupervisors
          ].filter(Boolean);

          for (const recipient of recipients) {
            const notification = new Notification({
              recipient: recipient._id,
              type: 'deadline_reminder',
              title: 'Upcoming Deadline',
              message: `Reminder: "${date.title}" for project "${project.title}" is due on ${date.date.toLocaleDateString()}`,
              relatedId: project._id,
              relatedModel: 'ThesisProject'
            });

            await notification.save();
            notificationCount++;
          }
        }
      }
    }

    res.json({
      success: true,
      message: `${notificationCount} deadline reminder notifications sent`,
      count: notificationCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Test endpoint to verify route is working
router.get('/test', auth, async (req, res) => {
  console.log('TEST ENDPOINT HIT - User ID:', req.userId);
  res.json({
    success: true,
    message: 'Test endpoint working',
    userId: req.userId
  });
});

// Simple test for clear endpoint
router.get('/clear-test', auth, async (req, res) => {
  console.log('CLEAR TEST ENDPOINT HIT - User ID:', req.userId);
  res.json({
    success: true,
    message: 'Clear test endpoint working',
    userId: req.userId
  });
});

module.exports = router;
