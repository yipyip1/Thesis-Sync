import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(userData) {
    if (!this.socket) {
      this.socket = io('http://localhost:5000');
      
      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('Connected to server');
        
        // Handle both userData formats: direct user object or { user: userObject }
        const userToSend = userData.user || userData;
        
        // Normalize the user object to match what server expects
        const normalizedUser = {
          userId: userToSend.userId || userToSend.id, // Handle both 'userId' and 'id'
          username: userToSend.username,
          email: userToSend.email,
          avatar: userToSend.avatar
        };
        
        console.log('Sending user-connected with:', normalizedUser);
        this.socket.emit('user-connected', normalizedUser);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('Disconnected from server');
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Group chat methods
  joinGroup(groupId) {
    if (this.socket) {
      console.log(`[CLIENT] Joining group: ${groupId}`);
      this.socket.emit('join-group', groupId);
    }
  }

  leaveGroup(groupId) {
    if (this.socket) {
      this.socket.emit('leave-group', groupId);
    }
  }

  sendMessage(messageData) {
    if (this.socket) {
      this.socket.emit('new-message', messageData);
    }
  }

  startTyping(groupId, username) {
    if (this.socket) {
      this.socket.emit('typing-start', { groupId, username });
    }
  }

  stopTyping(groupId, username) {
    if (this.socket) {
      this.socket.emit('typing-stop', { groupId, username });
    }
  }

  // Video call methods
  startVideoCall(groupId, callId) {
    if (this.socket) {
      console.log(`[CLIENT] Starting video call: callId=${callId}, groupId=${groupId}`);
      this.socket.emit('start-video-call', { groupId, callId });
    }
  }

  joinVideoCall(callId, groupId) {
    if (this.socket) {
      this.socket.emit('join-video-call', { callId, groupId });
    }
  }

  leaveVideoCall(callId) {
    if (this.socket) {
      this.socket.emit('leave-video-call', { callId });
    }
  }

  endVideoCall(callId, groupId) {
    if (this.socket) {
      this.socket.emit('end-video-call', { callId, groupId });
    }
  }

  sendVideoSignal(callId, targetSocketId, signal, type) {
    if (this.socket) {
      this.socket.emit('video-signal', { callId, targetSocketId, signal, type });
    }
  }

  sendVideoOffer(callId, targetSocketId, offer) {
    if (this.socket) {
      this.socket.emit('video-offer', { callId, targetSocketId, offer });
    }
  }

  sendVideoAnswer(callId, targetSocketId, answer) {
    if (this.socket) {
      this.socket.emit('video-answer', { callId, targetSocketId, answer });
    }
  }

  sendIceCandidate(callId, targetSocketId, candidate) {
    if (this.socket) {
      this.socket.emit('ice-candidate', { callId, targetSocketId, candidate });
    }
  }
}

export default new SocketService();
