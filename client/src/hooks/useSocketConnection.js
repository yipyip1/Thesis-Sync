import { useState, useEffect } from 'react';
import socketService from '../utils/socketService';

export const useSocketConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('initializing');

  useEffect(() => {
    const checkConnection = () => {
      const socket = socketService.getSocket();
      const connected = socket && socket.connected;
      setIsConnected(connected);
      
      // Don't set to disconnected immediately on startup
      if (connected) {
        setConnectionStatus('connected');
      } else if (connectionStatus !== 'initializing') {
        setConnectionStatus('disconnected');
      }
    };

    // Check immediately but don't log disconnected on first check
    const socket = socketService.getSocket();
    if (socket && socket.connected) {
      setIsConnected(true);
      setConnectionStatus('connected');
    }

    // Set up listeners for socket events
    if (socket) {
      socket.on('connect', () => {
        setIsConnected(true);
        setConnectionStatus('connected');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
      });

      socket.on('reconnect_attempt', () => {
        setConnectionStatus('reconnecting');
      });

      socket.on('reconnect', () => {
        setIsConnected(true);
        setConnectionStatus('connected');
      });

      socket.on('connect_error', () => {
        setIsConnected(false);
        setConnectionStatus('error');
      });
    }

    // After a short delay, if still not connected, show disconnected
    const initialTimeout = setTimeout(() => {
      if (connectionStatus === 'initializing') {
        setConnectionStatus('disconnected');
      }
    }, 2000);

    // Check connection status every 3 seconds (less frequent)
    const interval = setInterval(checkConnection, 3000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reconnect_attempt');
        socket.off('reconnect');
        socket.off('connect_error');
      }
    };
  }, [connectionStatus]);

  return { isConnected, connectionStatus };
};
