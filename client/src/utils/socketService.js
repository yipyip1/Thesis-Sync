import io from 'socket.io-client';

// Use a more unique identifier for socket instances per browser tab
const getInstanceKey = () => {
  // Create a unique key based on browser session and timestamp
  if (!window.socketInstanceId) {
    window.socketInstanceId = `socket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return window.socketInstanceId;
};

const instances = new Map();

class SocketService {
  constructor() {
    const instanceKey = getInstanceKey();
    if (instances.has(instanceKey)) return instances.get(instanceKey);
    
    this.instanceKey = instanceKey;
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.userData = null;
    this.connectionPromise = null;
    this.heartbeatInterval = null;
    this.isConnecting = false;
    this.autoReconnect = true;
    this.lastConnectTime = 0;
    
    instances.set(instanceKey, this);
  }

  connect(userData) {
    console.log(`🔌 [SocketService-${this.instanceKey}] Connect called with userData:`, userData);
    
    // Rate limiting: prevent too frequent connection attempts (reduced from 2000ms to 500ms)
    const now = Date.now();
    if (now - this.lastConnectTime < 500 && this.connectionPromise) {
      console.log(`🔄 [SocketService-${this.instanceKey}] Rate limited - using existing connection promise`);
      return this.connectionPromise;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting && this.connectionPromise) {
      console.log(`🔄 [SocketService-${this.instanceKey}] Connection already in progress, waiting...`);
      return this.connectionPromise;
    }
    
    // If already connected with a healthy connection, return existing socket
    if (this.socket && this.socket.connected && this.isConnected) {
      console.log(`✅ [SocketService-${this.instanceKey}] Already connected with healthy connection`);
      return Promise.resolve(this.socket);
    }
    
    // Store user data and timestamp for this connection attempt
    this.userData = userData;
    this.lastConnectTime = now;
    
    console.log(`🚀 [SocketService-${this.instanceKey}] Starting new connection attempt...`);
    this.isConnecting = true;
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Clean up any existing connection properly
        if (this.socket) {
          console.log(`🔌 [SocketService-${this.instanceKey}] Cleaning up existing socket`);
          this.socket.removeAllListeners();
          this.socket.close();
          this.socket = null;
        }
        
        // Reset connection state
        this.isConnected = false;
        
        // Create a unique query parameter to avoid connection caching between users
        const userQuery = {
          userId: (userData.user || userData).userId || (userData.user || userData).id,
          timestamp: Date.now(),
          instance: this.instanceKey
        };
        
        console.log(`🔌 [SocketService-${this.instanceKey}] Creating new socket connection to https://thesis-sync.onrender.com`);
        this.socket = io('https://thesis-sync.onrender.com', {
          transports: ['websocket', 'polling'],
          timeout: 8000,                // Reduced timeout to 8s for faster failure detection
          reconnection: false,          // Disable auto-reconnection to avoid conflicts
          forceNew: true,              // Force new connection to avoid cached issues
          upgrade: true,
          rememberUpgrade: false,       // Don't remember upgrades to avoid issues
          query: userQuery             // Add unique query to prevent connection reuse
        });
        
        // Set up connection timeout with cleanup
        const connectTimeout = setTimeout(() => {
          console.error(`❌ [SocketService-${this.instanceKey}] Connection timeout after 8 seconds`);
          this.cleanup();
          reject(new Error('Connection timeout - server not responding'));
        }, 8000);
        
        this.socket.on('connect', () => {
          console.log(`✅ [SocketService-${this.instanceKey}] Socket connected successfully!`);
          clearTimeout(connectTimeout);
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Handle both userData formats: direct user object or { user: userObject }
          const userToSend = this.userData.user || this.userData;
          console.log(`👤 [SocketService-${this.instanceKey}] Preparing user data:`, userToSend);
          
          // Normalize the user object to match what server expects
          const normalizedUser = {
            userId: userToSend.userId || userToSend.id, // Handle both 'userId' and 'id'
            name: userToSend.name || userToSend.username, // Server expects 'name'
            username: userToSend.username,
            email: userToSend.email,
            avatar: userToSend.avatar,
            instanceKey: this.instanceKey // Add instance key for server tracking
          };
          
          console.log(`📤 [SocketService-${this.instanceKey}] Sending user-connected with:`, normalizedUser);
          this.socket.emit('user-connected', normalizedUser);
          
          // Listen for server acknowledgment
          this.socket.once('user-connected-ack', (ackData) => {
            console.log(`📨 [SocketService-${this.instanceKey}] Received user-connected-ack:`, ackData);
            if (ackData.success) {
              console.log(`✅ [SocketService-${this.instanceKey}] Server confirmed user connection`);
            } else {
              console.error(`❌ [SocketService-${this.instanceKey}] Server rejected user connection:`, ackData.error);
            }
          });
          
          // Start heartbeat
          this.startHeartbeat();
          
          console.log(`✅ [SocketService-${this.instanceKey}] Connection fully established, resolving promise`);
          resolve(this.socket);
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`🔌 [SocketService-${this.instanceKey}] Disconnected from server:`, reason);
          this.isConnected = false;
          this.stopHeartbeat();
        });

        this.socket.on('connect_error', (error) => {
          console.error(`❌ [SocketService-${this.instanceKey}] Connection error:`, error);
          clearTimeout(connectTimeout);
          this.cleanup();
          reject(error);
        });

        this.socket.on('error', (error) => {
          console.error(`❌ [SocketService-${this.instanceKey}] Socket error:`, error);
        });
        
      } catch (error) {
        console.error('❌ [SocketService] Connection setup error:', error);
        this.cleanup();
        reject(error);
      }
    });
    
    // Clear the promise when done
    this.connectionPromise.finally(() => {
      this.connectionPromise = null;
    });
    
    return this.connectionPromise;
  }

  setupReconnectionHandlers() {
    if (!this.socket) return;

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ [SocketService] Reconnected to server after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // Re-authenticate user
      if (this.userData) {
        const userToSend = this.userData.user || this.userData;
        const normalizedUser = {
          userId: userToSend.userId || userToSend.id,
          name: userToSend.name || userToSend.username,
          username: userToSend.username,
          email: userToSend.email,
          avatar: userToSend.avatar
        };
        console.log('📤 [SocketService] Re-authenticating user after reconnect');
        this.socket.emit('user-connected', normalizedUser);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 [SocketService] Socket.IO attempting to reconnect... (${attemptNumber}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ [SocketService] Socket.IO failed to reconnect');
      this.isConnected = false;
      this.isConnecting = false;
      this.stopHeartbeat();
    });
  }

  attemptReconnect() {
    if (this.isConnecting || !this.autoReconnect || !this.userData) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [SocketService] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 [SocketService] Manual reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    this.connect(this.userData).catch(error => {
      console.error('❌ [SocketService] Manual reconnection failed:', error);
      
      // Try again after a delay
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.attemptReconnect(), this.reconnectDelay * this.reconnectAttempts);
      }
    });
  }

  cleanup() {
    console.log(`🧹 [SocketService-${this.instanceKey}] Cleaning up connection state`);
    this.isConnecting = false;
    this.isConnected = false;
    this.connectionPromise = null;
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }
  }

  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  reconnect() {
    if (this.userData && !this.isConnected) {
      console.log('Attempting manual reconnection...');
      this.connect(this.userData).catch(error => {
        console.error('Manual reconnection failed:', error);
      });
    }
  }

  disconnect() {
    console.log(`🔌 [SocketService-${this.instanceKey}] Manual disconnect called`);
    this.autoReconnect = false; // Disable auto-reconnect for manual disconnects
    this.cleanup();
    this.userData = null;
    
    // Remove this instance from the map when disconnecting
    instances.delete(this.instanceKey);
  }

  getSocket() {
    console.log('🔍 [SocketService] getSocket called - socket exists:', !!this.socket, 'connected:', this.socket?.connected);
    return this.socket;
  }

  // Group chat methods
  joinGroup(groupId) {
    if (this.socket) {
      console.log('🏠 [SocketService] Joining group:', groupId);
      console.log('🏠 [SocketService] Socket ID:', this.socket.id);
      console.log('🏠 [SocketService] Socket connected:', this.socket.connected);
      console.log('🏠 [SocketService] Timestamp:', new Date().toLocaleTimeString());
      this.socket.emit('join-group', groupId);
    } else {
      console.error('❌ [SocketService] No socket available for joinGroup!');
    }
  }

  leaveGroup(groupId) {
    if (this.socket) {
      this.socket.emit('leave-group', groupId);
    }
  }

  sendMessage(messageData) {
    if (this.socket) {
      console.log('📡 [SocketService] Emitting new-message:', messageData);
      this.socket.emit('new-message', messageData);
    }
  }

  sendDirectMessage(messageData) {
    if (this.socket) {
      console.log('📡 [SocketService] Emitting new-direct-message:', messageData);
      this.socket.emit('new-direct-message', messageData);
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
      console.log('📡 [SocketService] Emitting start-video-call:', { groupId, callId });
      console.log('📡 [SocketService] Socket ID:', this.socket.id);
      console.log('📡 [SocketService] Socket connected:', this.socket.connected);
      this.socket.emit('start-video-call', { groupId, callId });
    } else {
      console.error('❌ [SocketService] No socket available for startVideoCall!');
    }
  }

  joinVideoCall(callId, groupId) {
    if (this.socket) {
      console.log('📡 [SocketService] Emitting join-video-call:', { callId, groupId });
      console.log('📡 [SocketService] Socket ID:', this.socket.id);
      console.log('📡 [SocketService] Socket connected:', this.socket.connected);
      this.socket.emit('join-video-call', { callId, groupId });
    } else {
      console.error('❌ [SocketService] No socket available for joinVideoCall!');
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

  declineVideoCall(callId, groupId) {
    if (this.socket) {
      console.log('📡 [SocketService] Emitting decline-video-call:', { callId, groupId });
      this.socket.emit('decline-video-call', { callId, groupId });
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

  // Static method to clean up all instances (useful for debugging)
  static cleanupAllInstances() {
    console.log('🧹 [SocketService] Cleaning up all instances');
    instances.forEach((instance, key) => {
      instance.disconnect();
    });
    instances.clear();
  }

  // Static method to get instance count
  static getInstanceCount() {
    return instances.size;
  }
}

// Clean up instances when page unloads
window.addEventListener('beforeunload', () => {
  SocketService.cleanupAllInstances();
});

const socketService = new SocketService();
export default socketService;
