const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: [
      'supervisor_request_accept',
      'supervisor_request_reject', 
      'team_invitation',
      'team_application',
      'team_application_response',
      'supervisor_request',
      'supervisor_response',
      'thesis_application',
      'application_response',
      'deadline_reminder',
      'milestone_completed',
      'comment_added',
      'document_uploaded',
      'meeting_scheduled',
      'system_notification',
      'ai_suggestion'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  // Related entities
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ThesisProject'
  },
  relatedTeamRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamRequest'
  },
  relatedIdea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ThesisIdea'
  },
  // Action data
  actionData: {
    type: mongoose.Schema.Types.Mixed
  },
  // Email notification
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }); // For cleanup of old notifications

module.exports = mongoose.model('Notification', notificationSchema);
