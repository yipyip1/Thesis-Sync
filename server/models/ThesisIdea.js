const mongoose = require('mongoose');

const thesisIdeaSchema = new mongoose.Schema({
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
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    required: true,
    enum: ['AI', 'ML', 'Blockchain', 'Cybersecurity', 'IoT', 'Web Development', 'Mobile Development', 'Data Science', 'Other']
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate'
  },
  requiredSkills: [{
    type: String,
    trim: true
  }],
  estimatedDuration: {
    type: String,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  likes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['available', 'in_progress', 'completed'],
    default: 'available'
  }
}, {
  timestamps: true
});

// Index for search functionality
thesisIdeaSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  category: 'text',
  requiredSkills: 'text'
});

module.exports = mongoose.model('ThesisIdea', thesisIdeaSchema);
