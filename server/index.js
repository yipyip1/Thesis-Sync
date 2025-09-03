const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const messageRoutes = require('./routes/messages');
const debugRoutes = require('./routes/debug');
const userRoutes = require('./routes/users');
const thesisIdeaRoutes = require('./routes/thesisIdeas');
const teamRequestRoutes = require('./routes/teamRequests');
const thesisProjectRoutes = require('./routes/thesisProjects');
const thesisApplicationRoutes = require('./routes/thesisApplications');
const notificationRoutes = require('./routes/notifications');
const emailTestRoutes = require('./routes/emailTest');
const simpleEmailTestRoutes = require('./routes/simpleEmailTest');
const activityRoutes = require('./routes/activity');
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.path.includes('team-requests') && req.method === 'PUT') {
    console.log('Team request PUT detected:', {
      path: req.path,
      body: req.body,
      headers: req.headers.authorization ? 'Auth header present' : 'No auth header'
    });
  }
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/thesis-ideas', thesisIdeaRoutes);
app.use('/api/team-requests', (req, res, next) => {
  req.io = io;
  next();
}, teamRequestRoutes);
app.use('/api/thesis-projects', thesisProjectRoutes);
app.use('/api/thesis-applications', thesisApplicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email-test', emailTestRoutes);
app.use('/api/simple-email-test', simpleEmailTestRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/groups', (req, res, next) => {
  req.io = io;
  next();
}, groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/debug', debugRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,    // 60 seconds before considering connection dead
  pingInterval: 25000,   // Ping every 25 seconds
  upgradeTimeout: 30000, // 30 seconds to upgrade transport
  allowUpgrades: true,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Connected users and their socket info
const connectedUsers = new Map(); // socketId -> {userId, name, avatar}
const userSockets = new Map(); // userId -> socketId (for finding socket by userId)
const groupRooms = new Map(); // groupId -> Set of userIds
const videoCallRooms = new Map(); // callId -> Set of userIds with their peer info

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('[SERVER] New connection:', socket.id);

  // Add error handlers
  socket.on('error', (error) => {
    console.error(`[SERVER] Socket error for ${socket.id}:`, error);
  });

  socket.on('connect_error', (error) => {
    console.error(`[SERVER] Connection error for ${socket.id}:`, error);
  });

  // User authentication and joining
  socket.on('user-connected', async (userData) => {
    console.log(`[SERVER] Received user-connected event from ${socket.id}`);
    console.log(`[SERVER] User data:`, userData);
    try {
      console.log(`[SERVER] User ${userData.name} connected with socket ${socket.id}`);
      
      const userId = userData.userId || userData.id;
      
      // Check if user already has a connection and disconnect old one
      if (userSockets.has(userId)) {
        const oldSocketId = userSockets.get(userId);
        console.log(`[SERVER] User ${userId} already has connection ${oldSocketId}, disconnecting old one`);
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.disconnect();
        }
        connectedUsers.delete(oldSocketId);
      }
      
      // Store user connection info
      connectedUsers.set(socket.id, {
        userId: userId,
        name: userData.name,
        username: userData.username || userData.name,
        avatar: userData.avatar
      });
      
      // Store reverse mapping
      userSockets.set(userId, socket.id);

      // Join user to their personal notification room
      socket.join(`user-${userId}`);
      console.log(`[SERVER] User ${userId} joined personal room: user-${userId}`);

      // Update user online status in database
      await User.findByIdAndUpdate(userId, { 
        isOnline: true,
        lastSeen: new Date()
      });

      // Send acknowledgment back to client
      socket.emit('user-connected-ack', {
        success: true,
        userId: userId,
        socketId: socket.id
      });
      console.log(`[SERVER] Sent user-connected-ack to ${userId}`);

      // Notify all connected users about this user coming online
      socket.broadcast.emit('user-online', {
        userId: userId,
        name: userData.name,
        username: userData.username || userData.name,
        avatar: userData.avatar
      });

    } catch (error) {
      console.error('[SERVER] Error in user-connected:', error);
      socket.emit('user-connected-ack', {
        success: false,
        error: error.message
      });
    }
  });

  // Join group chat room
  socket.on('join-group', (groupId) => {
    console.log(`[SERVER] ${socket.id} joining group ${groupId}`);
    socket.join(`group-${groupId}`);
    
    // Track group membership
    if (!groupRooms.has(groupId)) {
      groupRooms.set(groupId, new Set());
    }
    
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      groupRooms.get(groupId).add(userInfo.userId);
      
      console.log(`[SERVER] User ${userInfo.name} (${userInfo.userId}) joined group ${groupId}`);
      console.log(`[SERVER] Group ${groupId} now has members:`, Array.from(groupRooms.get(groupId)));
      console.log(`[SERVER] Sockets in group-${groupId}:`, socket.adapter.rooms.get(`group-${groupId}`));
      
      // Test: Send a test event to the group immediately
      setTimeout(() => {
        console.log(`[SERVER] Sending test event to group-${groupId}`);
        io.to(`group-${groupId}`).emit('test-event', { 
          message: 'Test event from server', 
          groupId, 
          timestamp: new Date() 
        });
      }, 1000);
      
      // Notify other group members
      socket.to(`group-${groupId}`).emit('user-joined-group', {
        userId: userInfo.userId,
        username: userInfo.username,
        avatar: userInfo.avatar
      });
    }
  });

  // Handle test ping
  socket.on('ping', (data) => {
    console.log(`[SERVER] Received ping from ${socket.id}:`, data);
    socket.emit('pong', 'pong from server');
  });

  // Leave group chat room
  socket.on('leave-group', (groupId) => {
    console.log(`[SERVER] ${socket.id} leaving group ${groupId}`);
    socket.leave(`group-${groupId}`);
    
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo && groupRooms.has(groupId)) {
      groupRooms.get(groupId).delete(userInfo.userId);
      
      // Notify other group members
      socket.to(`group-${groupId}`).emit('user-left-group', {
        userId: userInfo.userId,
        username: userInfo.username
      });
    }
  });

  // Handle new chat messages
  socket.on('new-message', (messageData) => {
    console.log(`[SERVER] New message received from ${socket.id}:`, messageData);
    console.log(`[SERVER] Broadcasting to group ${messageData.groupId}`);
    
    // Broadcast message to all group members except sender
    socket.to(`group-${messageData.groupId}`).emit('message-received', messageData);
    console.log(`[SERVER] Message broadcasted to group-${messageData.groupId}`);
  });

  // Handle new direct messages
  socket.on('new-direct-message', (messageData) => {
    console.log(`[SERVER] New direct message from ${socket.id} to user ${messageData.receiverId}:`, messageData);
    
    // Send to receiver
    const receiverSocketId = userSockets.get(messageData.receiverId);
    if (receiverSocketId) {
      console.log(`[SERVER] Sending direct message to receiver socket ${receiverSocketId}`);
      io.to(receiverSocketId).emit('direct-message-received', messageData);
    } else {
      console.log(`[SERVER] Receiver ${messageData.receiverId} not online`);
    }
    
    console.log(`[SERVER] Direct message processed`);
  });

  // Handle typing indicators
  socket.on('typing-start', ({ groupId, username }) => {
    socket.to(`group-${groupId}`).emit('user-typing', { username });
  });

  socket.on('typing-stop', ({ groupId, username }) => {
    socket.to(`group-${groupId}`).emit('user-stopped-typing', { username });
  });

  // === VIDEO CALLING FUNCTIONALITY ===
  
  // Start video call
  socket.on('start-video-call', ({ groupId, callId }) => {
    console.log(`[SERVER] Starting video call ${callId} in group ${groupId}`);
    
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) {
      console.log(`[SERVER] No user info found for socket ${socket.id}`);
      return;
    }

    console.log(`[SERVER] User info:`, userInfo);

    // Initialize call room
    if (!videoCallRooms.has(callId)) {
      videoCallRooms.set(callId, new Map());
    }
    
    const callRoom = videoCallRooms.get(callId);
    callRoom.set(socket.id, {
      userId: userInfo.userId,
      username: userInfo.username,
      avatar: userInfo.avatar,
      socketId: socket.id
    });

    socket.join(`call-${callId}`);
    
    const eventData = {
      callId,
      initiator: userInfo,
      groupId
    };
    
    console.log(`[SERVER] Emitting video-call-started to group-${groupId}:`, eventData);
    console.log(`[SERVER] Sockets in group-${groupId}:`, socket.adapter.rooms.get(`group-${groupId}`));
    
    // Notify group members about the call (including sender for debugging)
    io.to(`group-${groupId}`).emit('video-call-started', eventData);
    
    // Also try broadcasting to the entire server for debugging
    console.log(`[SERVER] Also broadcasting to all clients for debugging`);
    socket.broadcast.emit('video-call-started-debug', eventData);
  });

  // Join video call
  socket.on('join-video-call', ({ callId, groupId }) => {
    console.log(`[SERVER] ${socket.id} joining video call ${callId}`);
    
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) {
      console.log(`[SERVER] No user info found for socket ${socket.id}`);
      return;
    }

    socket.join(`call-${callId}`);
    
    if (!videoCallRooms.has(callId)) {
      console.log(`[SERVER] Call room ${callId} does not exist, creating it`);
      videoCallRooms.set(callId, new Map());
    }
    
    const callRoom = videoCallRooms.get(callId);
    
    // Get list of existing participants (everyone currently in the call)
    const existingParticipants = Array.from(callRoom.values());
    console.log(`[SERVER] Existing participants in call ${callId}:`, existingParticipants.map(p => p.username));
    
    // Add new participant to the call room
    callRoom.set(socket.id, {
      userId: userInfo.userId,
      username: userInfo.username,
      avatar: userInfo.avatar,
      socketId: socket.id
    });

    console.log(`[SERVER] Call room ${callId} now has ${callRoom.size} participants`);

    // Send existing participants to the new user (so they can initiate peer connections)
    if (existingParticipants.length > 0) {
      console.log(`[SERVER] Sending ${existingParticipants.length} existing participants to new user`);
      socket.emit('existing-participants', existingParticipants);
    }
    
    // Notify existing participants about the new user
    console.log(`[SERVER] Notifying existing participants about new user: ${userInfo.username}`);
    socket.to(`call-${callId}`).emit('user-joined-call', {
      userId: userInfo.userId,
      username: userInfo.username,
      avatar: userInfo.avatar,
      socketId: socket.id
    });
  });

  // WebRTC signaling for video calls
  socket.on('video-signal', ({ callId, targetSocketId, signal, type }) => {
    console.log(`[SERVER] Video signal from ${socket.id} to ${targetSocketId}: ${type}`);
    
    // Forward the signal to the target user
    io.to(targetSocketId).emit('video-signal', {
      fromSocketId: socket.id,
      signal,
      type
    });
  });

  // Handle offer for video call
  socket.on('video-offer', ({ callId, targetSocketId, offer }) => {
    console.log(`[SERVER] Video offer from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('video-offer', {
      fromSocketId: socket.id,
      offer
    });
  });

  // Handle answer for video call
  socket.on('video-answer', ({ callId, targetSocketId, answer }) => {
    console.log(`[SERVER] Video answer from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('video-answer', {
      fromSocketId: socket.id,
      answer
    });
  });

  // Handle ICE candidates
  socket.on('ice-candidate', ({ callId, targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', {
      fromSocketId: socket.id,
      candidate
    });
  });

  // Leave video call
  socket.on('leave-video-call', ({ callId }) => {
    console.log(`[SERVER] ${socket.id} leaving video call ${callId}`);
    
    socket.leave(`call-${callId}`);
    
    if (videoCallRooms.has(callId)) {
      const callRoom = videoCallRooms.get(callId);
      const userInfo = callRoom.get(socket.id);
      callRoom.delete(socket.id);
      
      // Notify remaining participants
      socket.to(`call-${callId}`).emit('user-left-call', {
        socketId: socket.id,
        userId: userInfo?.userId
      });
      
      // Clean up empty call room
      if (callRoom.size === 0) {
        videoCallRooms.delete(callId);
      }
    }
  });

  // End video call (admin only)
  socket.on('end-video-call', ({ callId, groupId }) => {
    console.log(`[SERVER] Ending video call ${callId}`);
    
    // Notify all participants that call has ended
    io.to(`call-${callId}`).emit('video-call-ended', { callId });
    
    // Clean up call room
    if (videoCallRooms.has(callId)) {
      const callRoom = videoCallRooms.get(callId);
      // Make all participants leave the call room
      for (const [socketId] of callRoom) {
        io.sockets.sockets.get(socketId)?.leave(`call-${callId}`);
      }
      videoCallRooms.delete(callId);
    }
    
    // Notify group that call has ended
    io.to(`group-${groupId}`).emit('video-call-ended', { callId });
  });

  // Handle heartbeat ping from client
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    console.log(`[SERVER] Disconnected: ${socket.id}, Reason: ${reason}`);
    
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      console.log(`[SERVER] User ${userInfo.name} (${userInfo.userId}) disconnected due to: ${reason}`);
      try {
        // Update user offline status in database
        await User.findByIdAndUpdate(userInfo.userId, { 
          isOnline: false,
          lastSeen: new Date()
        });

        // Remove from group rooms
        for (const [groupId, users] of groupRooms) {
          if (users.has(userInfo.userId)) {
            users.delete(userInfo.userId);
            socket.to(`group-${groupId}`).emit('user-left-group', {
              userId: userInfo.userId,
              username: userInfo.username
            });
          }
        }

        // Remove from video call rooms
        for (const [callId, callRoom] of videoCallRooms) {
          if (callRoom.has(socket.id)) {
            callRoom.delete(socket.id);
            socket.to(`call-${callId}`).emit('user-left-call', {
              socketId: socket.id,
              userId: userInfo.userId
            });
            
            // Clean up empty call room
            if (callRoom.size === 0) {
              videoCallRooms.delete(callId);
            }
          }
        }

        // Notify all connected users about this user going offline
        socket.broadcast.emit('user-offline', {
          userId: userInfo.userId,
          username: userInfo.username
        });

      } catch (error) {
        console.error('[SERVER] Error in disconnect handler:', error);
      }
      
      // Clean up user tracking
      userSockets.delete(userInfo.userId);
      connectedUsers.delete(socket.id);
    }
  });
});

app.get('/', (req, res) => {
  res.send('Thesis-Sync Chat & Video Call Server');
});

// Connect to MongoDB with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Use only basic, widely supported options
    });
    console.log('Connected to MongoDB');
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected! Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
