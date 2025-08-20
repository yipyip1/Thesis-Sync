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
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
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
  }
});

// Connected users and their socket info
const connectedUsers = new Map();
const groupRooms = new Map(); // groupId -> Set of userIds
const videoCallRooms = new Map(); // callId -> Set of userIds with their peer info

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('[SERVER] New connection:', socket.id);

  // User authentication and joining
  socket.on('user-connected', async (userData) => {
    try {
      console.log(`[SERVER] User ${userData.username} connected with socket ${socket.id}`);
      
      // Store user connection info
      connectedUsers.set(socket.id, {
        userId: userData.userId,
        username: userData.username,
        avatar: userData.avatar
      });

      // Update user online status in database
      await User.findByIdAndUpdate(userData.userId, { 
        isOnline: true,
        lastSeen: new Date()
      });

      // Notify all connected users about this user coming online
      socket.broadcast.emit('user-online', {
        userId: userData.userId,
        username: userData.username,
        avatar: userData.avatar
      });

    } catch (error) {
      console.error('[SERVER] Error in user-connected:', error);
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
      
      console.log(`[SERVER] User ${userInfo.username} (${userInfo.userId}) joined group ${groupId}`);
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
    console.log(`[SERVER] New message in group ${messageData.groupId}`);
    // Broadcast message to all group members except sender
    socket.to(`group-${messageData.groupId}`).emit('message-received', messageData);
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

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('[SERVER] Disconnected:', socket.id);
    
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
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
      
      connectedUsers.delete(socket.id);
    }
  });
});

app.get('/', (req, res) => {
  res.send('Thesis-Sync Chat & Video Call Server');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
