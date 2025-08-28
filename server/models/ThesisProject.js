const mongoose = require('mongoose');

const thesisProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coSupervisors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: {
    type: String,
    required: true,
    enum: ['AI', 'ML', 'Blockchain', 'Cybersecurity', 'IoT', 'Web Development', 'Mobile Development', 'Data Science', 'Other']
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Progress Tracking
  phases: [{
    name: { type: String, required: true },
    description: String,
    startDate: Date,
    endDate: Date,
    deadline: Date,
    status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'overdue'], default: 'not_started' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    deliverables: [{
      name: String,
      description: String,
      dueDate: Date,
      status: { type: String, enum: ['pending', 'submitted', 'approved', 'revision_needed'], default: 'pending' },
      submissionDate: Date,
      feedback: String,
      marks: { type: Number, min: 0, max: 100 }
    }]
  }],
  currentPhase: {
    type: String,
    default: 'proposal'
  },
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Deadlines and Milestones
  importantDates: [{
    title: String,
    description: String,
    date: Date,
    type: { type: String, enum: ['deadline', 'milestone', 'meeting', 'presentation'] },
    isCompleted: { type: Boolean, default: false }
  }],
  // File and Document Management
  documents: [{
    name: String,
    url: String,
    type: { type: String, enum: ['proposal', 'chapter', 'presentation', 'code', 'data', 'reference', 'other'] },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadDate: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    isLatest: { type: Boolean, default: true }
  }],
  // Communication and Collaboration
  teamChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  meetings: [{
    title: String,
    description: String,
    date: Date,
    duration: Number, // in minutes
    type: { type: String, enum: ['supervision', 'team', 'presentation', 'defense'] },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    meetingNotes: String,
    actionItems: [{
      task: String,
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      dueDate: Date,
      status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }
    }]
  }],
  // Status and Metadata
  status: {
    type: String,
    enum: ['proposal', 'approved', 'in_progress', 'review', 'defense_scheduled', 'completed', 'cancelled'],
    default: 'proposal'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expectedEndDate: Date,
  actualEndDate: Date,
  isPublic: {
    type: Boolean,
    default: false
  },
  // Activity and History
  activityLog: [{
    action: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Index for search functionality
thesisProjectSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  category: 'text'
});

// Virtual for calculating time remaining
thesisProjectSchema.virtual('timeRemaining').get(function() {
  if (this.expectedEndDate) {
    const now = new Date();
    const end = new Date(this.expectedEndDate);
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24))); // days remaining
  }
  return null;
});

module.exports = mongoose.model('ThesisProject', thesisProjectSchema);
