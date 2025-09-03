const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');
const MessageRequest = require('../models/MessageRequest');
const DirectConversation = require('../models/DirectConversation');
const DirectMessage = require('../models/DirectMessage');
const auth = require('../middleware/auth');

// Simple file logging function
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  fs.appendFileSync(path.join(__dirname, '../debug.log'), logMessage);
  console.log(message);
};
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images, PDFs, and videos
  const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mov|avi|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and videos are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: fileFilter
});

// Send text message
router.post('/text', auth, async (req, res) => {
  try {
    const { groupId, content, replyTo } = req.body;

    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const message = new Message({
      sender: req.userId,
      group: groupId,
      content,
      messageType: 'text',
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    if (replyTo) {
      await message.populate('replyTo');
    }

    // Log activity for first message in a group to avoid spam
    const messageCount = await Message.countDocuments({ 
      group: groupId, 
      sender: req.userId 
    });
    
    // Only log activity for first message from this user in this group
    if (messageCount === 1) {
      const user = await User.findById(req.userId);
      user.activityLog.push({
        action: 'message_sent',
        timestamp: new Date(),
        details: { 
          groupId: group._id, 
          groupName: group.name
        }
      });
      await user.save();
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send file message
router.post('/file', auth, upload.single('file'), async (req, res) => {
  try {
    const { groupId, replyTo } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Determine message type based on file
    let messageType = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      messageType = 'video';
    }

    const message = new Message({
      sender: req.userId,
      group: groupId,
      messageType,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      },
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    if (replyTo) {
      await message.populate('replyTo');
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark message as read
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if already read by user
    const alreadyRead = message.readBy.some(
      read => read.user.toString() === req.userId
    );

    if (!alreadyRead) {
      message.readBy.push({ user: req.userId });
      await message.save();
    }

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Message Request Routes

// Send message request
router.post('/request', auth, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.userId;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Check if user is trying to send to themselves
    if (senderId === receiverId) {
      return res.status(400).json({ message: 'Cannot send message request to yourself' });
    }

    // Check if request already exists
    const existingRequest = await MessageRequest.findOne({
      sender: senderId,
      receiver: receiverId
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Message request already sent' });
    }

    // Check if there's already an accepted conversation
    const existingConversation = await DirectConversation.findOne({
      $or: [
        { 'participants.0': senderId, 'participants.1': receiverId },
        { 'participants.0': receiverId, 'participants.1': senderId }
      ]
    });

    if (existingConversation) {
      return res.status(400).json({ message: 'Conversation already exists' });
    }

    // Create message request
    const messageRequest = new MessageRequest({
      sender: senderId,
      receiver: receiverId,
      message: message
    });

    await messageRequest.save();

    // Populate sender info for response
    await messageRequest.populate('sender', 'name email');

    res.json({
      success: true,
      request: messageRequest,
      message: 'Message request sent successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get message requests (for the current user)
router.get('/requests', auth, async (req, res) => {
  try {
    const userId = req.userId;

    const requests = await MessageRequest.find({
      receiver: userId,
      status: 'pending'
    })
    .populate('sender', 'name email department')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test route for debugging
router.get('/test', (req, res) => {
  res.json({ message: 'Messages route is working' });
});

// Simple test route for message request response
router.put('/requests/:requestId/test', auth, async (req, res) => {
  try {
    res.json({ message: 'Test route working', requestId: req.params.requestId, userId: req.userId });
  } catch (error) {
    res.status(500).json({ message: 'Test route error', error: error.message });
  }
});

// Simplified route for debugging
router.put('/requests/:requestId/simple', auth, async (req, res) => {
  try {
    console.log('Simple route hit');
    console.log('Request ID:', req.params.requestId);
    console.log('User ID:', req.userId);
    console.log('Action:', req.body.action);
    
    res.json({ 
      success: true, 
      message: 'Simple route working',
      requestId: req.params.requestId,
      userId: req.userId,
      action: req.body.action
    });
  } catch (error) {
    console.error('Simple route error:', error);
    res.status(500).json({ message: 'Simple route error', error: error.message });
  }
});

// Respond to message request (accept/decline)
router.put('/requests/:requestId', auth, async (req, res) => {
  logToFile('=== MESSAGE REQUEST ROUTE HIT ===');
  
  try {
    const { requestId } = req.params;
    const { action } = req.body;
    const userId = req.userId;

    logToFile(`1. Basic validation - RequestID: ${requestId}, Action: ${action}, UserID: ${userId}`);

    // Basic validation
    if (!requestId || !action || !userId) {
      logToFile('Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    logToFile('2. ObjectId validation...');
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      logToFile('Invalid request ID format');
      return res.status(400).json({ message: 'Invalid request ID format' });
    }

    logToFile('3. Finding message request...');
    let messageRequest;
    try {
      messageRequest = await MessageRequest.findById(requestId);
      logToFile(`Message request found: ${!!messageRequest}`);
      if (messageRequest) {
        logToFile(`Request details - Status: ${messageRequest.status}, Sender: ${messageRequest.sender}, Receiver: ${messageRequest.receiver}`);
      }
    } catch (dbError) {
      logToFile(`Database error finding message request: ${dbError.message}`);
      return res.status(500).json({ message: 'Database error', error: dbError.message });
    }
    
    if (!messageRequest) {
      logToFile('Message request not found');
      return res.status(404).json({ message: 'Message request not found' });
    }

    logToFile('4. Authorization check...');
    if (messageRequest.receiver.toString() !== userId) {
      logToFile(`Unauthorized - receiver mismatch: ${messageRequest.receiver.toString()} vs ${userId}`);
      return res.status(403).json({ message: 'Unauthorized' });
    }

    logToFile('5. Updating basic fields...');
    // Convert action to correct enum value
    const statusValue = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : action;
    logToFile(`Converting action: ${action} to status: ${statusValue}`);
    
    messageRequest.status = statusValue;
    messageRequest.respondedAt = new Date();

    if (action === 'accept') {
      logToFile('6. Processing accept action...');
      
      try {
        logToFile('6a. Checking for existing conversation...');
        logToFile(`Sender ID: ${messageRequest.sender}`);
        logToFile(`Receiver ID: ${messageRequest.receiver}`);
        
        // Search for conversation in any direction using ordered participants
        let conversation = await DirectConversation.findOne({
          $or: [
            { 'participants.0': messageRequest.sender, 'participants.1': messageRequest.receiver },
            { 'participants.0': messageRequest.receiver, 'participants.1': messageRequest.sender }
          ]
        });
        logToFile(`Existing conversation (any direction) found: ${!!conversation}`);
        
        if (!conversation) {
          logToFile('6b. Creating new conversation...');
          logToFile(`Creating conversation with participants: [${messageRequest.sender}, ${messageRequest.receiver}]`);
          
          try {
            // Sort participants to ensure consistent ordering for the compound index
            const sortedParticipants = [messageRequest.sender, messageRequest.receiver].sort();
            conversation = new DirectConversation({
              participants: sortedParticipants
            });
            await conversation.save();
            logToFile(`Conversation created successfully with ID: ${conversation._id}`);
          } catch (conversationError) {
            logToFile(`Error creating conversation: ${conversationError.message}`);
            
            // If duplicate key error, try to find the existing conversation again
            if (conversationError.code === 11000) {
              logToFile('Duplicate key error - searching for existing conversation again...');
              conversation = await DirectConversation.findOne({
                $or: [
                  { 'participants.0': messageRequest.sender, 'participants.1': messageRequest.receiver },
                  { 'participants.0': messageRequest.receiver, 'participants.1': messageRequest.sender }
                ]
              });
              
              if (conversation) {
                logToFile(`Found existing conversation after duplicate error: ${conversation._id}`);
              } else {
                logToFile('Still no conversation found after duplicate error');
                throw conversationError;
              }
            } else {
              throw conversationError;
            }
          }
        } else {
          logToFile(`Using existing conversation: ${conversation._id}`);
        }

        logToFile('6c. Creating initial message...');
        logToFile(`Message content: ${messageRequest.message}`);
        
        // Check if message already exists
        const existingMessage = await DirectMessage.findOne({
          conversation: conversation._id,
          sender: messageRequest.sender,
          content: messageRequest.message
        });
        
        if (!existingMessage) {
          const initialMessage = new DirectMessage({
            conversation: conversation._id,
            sender: messageRequest.sender,
            content: messageRequest.message
          });
          await initialMessage.save();
          logToFile(`Initial message created successfully with ID: ${initialMessage._id}`);

          logToFile('6d. Updating conversation...');
          conversation.lastMessage = initialMessage._id;
          conversation.lastActivity = new Date();
          await conversation.save();
          logToFile('Conversation updated successfully');
        } else {
          logToFile('Message already exists, skipping creation');
        }

        messageRequest.conversationId = conversation._id;
        logToFile(`Set conversation ID in request: ${conversation._id}`);
        
      } catch (acceptError) {
        logToFile(`Error in accept processing: ${acceptError.message}`);
        logToFile(`Accept error stack: ${acceptError.stack}`);
        return res.status(500).json({ message: 'Accept processing error', error: acceptError.message, stack: acceptError.stack });
      }
    }

    logToFile('7. Saving message request...');
    try {
      await messageRequest.save();
      logToFile('Message request saved successfully');
    } catch (saveError) {
      logToFile(`Error saving message request: ${saveError.message}`);
      return res.status(500).json({ message: 'Save error', error: saveError.message });
    }

    logToFile('8. Success - sending response...');
    res.json({
      success: true,
      message: `Message request ${action}ed successfully`,
      conversationId: messageRequest.conversationId
    });
    
  } catch (error) {
    logToFile(`MAIN ERROR in message request response: ${error.message}`);
    logToFile(`Error stack: ${error.stack}`);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
});

// Get direct conversation
router.get('/direct/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    const conversation = await DirectConversation.findOne({
      $or: [
        { 'participants.0': currentUserId, 'participants.1': userId },
        { 'participants.0': userId, 'participants.1': currentUserId }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const messages = await DirectMessage.find({ conversation: conversation._id })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .limit(50);

    res.json({
      success: true,
      conversation,
      messages
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send direct message
router.post('/direct', auth, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.userId;

    // Find existing conversation
    const conversation = await DirectConversation.findOne({
      $or: [
        { 'participants.0': senderId, 'participants.1': receiverId },
        { 'participants.0': receiverId, 'participants.1': senderId }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found. Send a message request first.' });
    }

    // Create message
    const directMessage = new DirectMessage({
      conversation: conversation._id,
      sender: senderId,
      content: message
    });

    await directMessage.save();

    // Update conversation
    conversation.lastMessage = directMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Populate sender info
    await directMessage.populate('sender', 'name email');

    res.json({
      success: true,
      message: directMessage
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all direct conversations for user
router.get('/conversations', auth, async (req, res) => {
  try {
    const currentUserId = req.userId;

    const conversations = await DirectConversation.find({
      $or: [
        { 'participants.0': currentUserId },
        { 'participants.1': currentUserId }
      ]
    })
    .populate('participants', 'name email avatar')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    // Format conversations for frontend
    const formattedConversations = conversations.map(conv => {
      const otherUser = conv.participants.find(p => p._id.toString() !== currentUserId);
      return {
        _id: conv._id,
        type: 'direct',
        name: otherUser.name,
        participants: conv.participants,
        otherUser: otherUser,
        lastMessage: conv.lastMessage,
        lastActivity: conv.lastActivity,
        isActive: conv.isActive
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
