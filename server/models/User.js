const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'supervisor', 'admin'],
    required: true,
    default: 'student'
  },
  avatar: {
    type: String,
    default: ''
  },
  // Profile Information
  skills: [{
    type: String,
    trim: true
  }],
  researchInterests: [{
    type: String,
    trim: true
  }],
  department: {
    type: String,
    trim: true
  },
  university: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  contactInfo: {
    phone: String,
    linkedin: String,
    orcid: String
  },
  // Academic Information
  academicDocuments: [{
    name: String,
    url: String,
    type: String, // 'cv', 'transcript', 'publications', etc.
    uploadDate: { type: Date, default: Date.now }
  }],
  // Supervisor specific fields
  availability: {
    type: String,
    enum: ['available', 'limited', 'unavailable'],
    default: 'available'
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  maxStudents: {
    type: Number,
    default: 5
  },
  currentStudents: {
    type: Number,
    default: 0
  },
  // System fields
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: String,
  // Activity tracking
  activityLog: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Index for search functionality
userSchema.index({ 
  name: 'text', 
  email: 'text', 
  skills: 'text', 
  researchInterests: 'text',
  department: 'text' 
});

module.exports = mongoose.model('User', userSchema);
