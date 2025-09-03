import React from 'react';
import { useSocketConnection } from '../hooks/useSocketConnection';

const ConnectionStatusIndicator = () => {
  const { isConnected, connectionStatus } = useSocketConnection();

  if (connectionStatus === 'connected') {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Connected</span>
      </div>
    );
  }

  if (connectionStatus === 'reconnecting') {
    return (
      <div className="flex items-center gap-2 text-yellow-600 text-sm">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-spin"></div>
        <span>Reconnecting...</span>
      </div>
    );
  }

  if (connectionStatus === 'initializing') {
    return (
      <div className="flex items-center gap-2 text-blue-600 text-sm">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>Starting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-red-600 text-sm">
      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
      <span>Disconnected</span>
    </div>
  );
};

export default ConnectionStatusIndicator;
