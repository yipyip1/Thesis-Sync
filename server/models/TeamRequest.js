const mongoose = require('mongoose');

const teamRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  thesisTopic: {
    type: String,
    required: true,
    trim: true
  },
  requiredSkills: [{
    type: String,
    required: true,
    trim: true
  }],
  teamSize: {
    current: { type: Number, default: 1 },
    max: { type: Number, required: true, min: 2, max: 10 }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  pendingInvitations: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invitedAt: { type: Date, default: Date.now },
    message: String
  }],
  applications: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    appliedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }],
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  supervisorRequest: {
    status: { type: String, enum: ['none', 'pending', 'accepted', 'rejected'], default: 'none' },
    requestedAt: Date,
    respondedAt: Date,
    message: String
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'cancelled'],
    default: 'open'
  },
  category: {
    type: String,
    required: true,
    enum: ['AI', 'ML', 'Blockchain', 'Cybersecurity', 'IoT', 'Web Development', 'Mobile Development', 'Data Science', 'Other']
  },
  deadline: {
    type: Date
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search functionality
teamRequestSchema.index({ 
  title: 'text', 
  description: 'text', 
  thesisTopic: 'text',
  requiredSkills: 'text',
  category: 'text'
});

module.exports = mongoose.model('TeamRequest', teamRequestSchema);
