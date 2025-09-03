const mongoose = require('mongoose');

const thesisApplicationSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ThesisProject',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewMessage: {
    type: String,
    maxlength: 500,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
thesisApplicationSchema.index({ project: 1, team: 1 }, { unique: true }); // One application per team per project
thesisApplicationSchema.index({ project: 1, status: 1 });
thesisApplicationSchema.index({ applicant: 1, status: 1 });

module.exports = mongoose.model('ThesisApplication', thesisApplicationSchema);
