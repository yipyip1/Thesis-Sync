import React, { useState, useEffect } from 'react';
import socketService from '../utils/socketService';
import { useSocketConnection } from '../hooks/useSocketConnection';
import toast from 'react-hot-toast';

const SocketDebugPanel = ({ user, group }) => {
  const { isConnected, connectionStatus } = useSocketConnection();
  const [logs, setLogs] = useState([]);
  const [testMessage, setTestMessage] = useState('Test message from debug panel');

  useEffect(() => {
    // Only log meaningful status changes, skip initial states
    if (connectionStatus !== 'initializing') {
      addLog(`Connection status changed to: ${connectionStatus}`);
    }
  }, [connectionStatus]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const testConnection = async () => {
    addLog('Testing socket connection...');
    try {
      if (user) {
        await socketService.connect(user);
        addLog('Socket connection successful');
        toast.success('Socket connected successfully');
      } else {
        addLog('No user data for connection');
        toast.error('No user data available');
      }
    } catch (error) {
      addLog(`Connection failed: ${error.message}`);
      toast.error('Connection failed');
    }
  };

  const sendTestMessage = () => {
    if (!group) {
      toast.error('No group selected');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket || !socket.connected) {
      toast.error('Socket not connected');
      return;
    }

    const messageData = {
      groupId: group._id,
      content: testMessage,
      sender: {
        _id: user?.userId || user?.id,
        username: user?.username || user?.name
      },
      timestamp: new Date()
    };

    if (group.type === 'direct') {
      socketService.sendDirectMessage({
        ...messageData,
        receiverId: group.otherUser._id
      });
      addLog('Direct message sent via socket');
    } else {
      socketService.sendMessage(messageData);
      addLog('Group message sent via socket');
    }

    toast.success('Test message sent');
  };

  const pingServer = () => {
    const socket = socketService.getSocket();
    if (socket && socket.connected) {
      socket.emit('ping', { test: 'ping from debug panel', timestamp: Date.now() });
      addLog('Ping sent to server');
      
      socket.once('pong', (data) => {
        addLog(`Pong received: ${data}`);
        toast.success('Pong received!');
      });
    } else {
      toast.error('Socket not connected');
    }
  };

  const joinCurrentGroup = () => {
    if (!group) {
      toast.error('No group selected');
      return;
    }

    socketService.joinGroup(group._id);
    addLog(`Joined group: ${group._id}`);
    toast.success('Joined group');
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg space-y-4">
      <h3 className="font-bold text-lg">Socket Debug Panel</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <strong>Connection Status:</strong>{' '}
          <span className={
            connectionStatus === 'connected' ? 'text-green-600' : 
            connectionStatus === 'reconnecting' ? 'text-yellow-600' :
            connectionStatus === 'initializing' ? 'text-blue-600' :
            'text-red-600'
          }>
            {connectionStatus === 'initializing' ? 'Starting...' : connectionStatus} {
              connectionStatus === 'connected' ? '✅' : 
              connectionStatus === 'initializing' ? '🔄' : 
              connectionStatus === 'reconnecting' ? '🔄' : '❌'
            }
          </span>
        </div>
        <div>
          <strong>Group:</strong> {group?.name || 'None'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={testConnection} className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
          Test Connection
        </button>
        <button onClick={pingServer} className="px-3 py-1 bg-green-500 text-white rounded text-sm">
          Ping Server
        </button>
        <button onClick={joinCurrentGroup} className="px-3 py-1 bg-purple-500 text-white rounded text-sm">
          Join Group
        </button>
        <button onClick={sendTestMessage} className="px-3 py-1 bg-orange-500 text-white rounded text-sm">
          Send Test Message
        </button>
      </div>

      <div>
        <input
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Test message content"
        />
      </div>

      <div className="bg-black text-green-400 p-2 rounded text-xs font-mono h-32 overflow-y-auto">
        <div>Debug Logs:</div>
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default SocketDebugPanel;
