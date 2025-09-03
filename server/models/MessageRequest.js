const mongoose = require('mongoose');

const messageRequestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirectConversation',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date,
    default: null
  }
});

// Compound index to prevent duplicate requests
messageRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('MessageRequest', messageRequestSchema);
