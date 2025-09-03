const mongoose = require('mongoose');

const directConversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirectMessage',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only two participants
directConversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Direct conversation must have exactly 2 participants'));
  }
  next();
});

// Compound index to ensure unique conversations between two users (ordered)
directConversationSchema.index({ 'participants.0': 1, 'participants.1': 1 }, { unique: true, name: 'participants_compound_unique' });

module.exports = mongoose.model('DirectConversation', directConversationSchema);
