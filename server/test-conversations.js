const mongoose = require('mongoose');
require('dotenv').config();

async function testConversationCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const DirectConversation = require('./models/DirectConversation');
    const DirectMessage = require('./models/DirectMessage');
    const MessageRequest = require('./models/MessageRequest');
    const User = require('./models/User');

    // Check current conversations
    console.log('\n=== Current Conversations ===');
    const conversations = await DirectConversation.find({}).populate('participants', 'name email');
    console.log('Total conversations:', conversations.length);
    conversations.forEach(conv => {
      console.log(`Conversation ${conv._id}:`);
      console.log(`  Participants: ${conv.participants.map(p => p.email || p._id).join(', ')}`);
      console.log(`  Last Message: ${conv.lastMessage}`);
      console.log(`  Last Activity: ${conv.lastActivity}`);
      console.log('');
    });

    // Check recent message requests
    console.log('\n=== Recent Message Requests ===');
    const requests = await MessageRequest.find({})
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    requests.forEach(req => {
      console.log(`Request ${req._id}:`);
      console.log(`  From: ${req.sender.email || req.sender._id}`);
      console.log(`  To: ${req.receiver.email || req.receiver._id}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Conversation ID: ${req.conversationId}`);
      console.log(`  Message: ${req.message}`);
      console.log('');
    });

    // Check messages in conversations
    console.log('\n=== Messages in Conversations ===');
    for (const conv of conversations) {
      const messages = await DirectMessage.find({ conversation: conv._id })
        .populate('sender', 'name email')
        .sort({ createdAt: 1 });
      
      console.log(`Messages in conversation ${conv._id}:`);
      if (messages.length === 0) {
        console.log('  No messages found');
      } else {
        messages.forEach(msg => {
          console.log(`  ${msg.sender.email || msg.sender._id}: ${msg.content}`);
        });
      }
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testConversationCreation();
