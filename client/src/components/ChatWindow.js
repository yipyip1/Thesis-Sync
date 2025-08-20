import React, { useState, useEffect, useRef } from 'react';
import { groupAPI, messageAPI } from '../utils/api';
import socketService from '../utils/socketService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import VideoCall from './VideoCall';
import toast from 'react-hot-toast';

const ChatWindow = ({ group, user, onAddMember }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [incomingCallId, setIncomingCallId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const currentUserId = user?.userId || user?.id;
    console.log('🔥 [ChatWindow] Component mounted/updated with:', { 
      groupId: group?._id, 
      currentUserId,
      hasGroup: !!group,
      hasUser: !!user
    });
    
    if (group) {
      console.log('🔥 [ChatWindow] Group exists, setting up...');
      fetchMessages();
      setupSocketListeners();
    } else {
      console.log('🔥 [ChatWindow] No group selected');
    }

    return () => {
      console.log('🔥 [ChatWindow] Cleaning up...');
      // Cleanup socket listeners
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('message-received');
        socket.off('user-typing');
        socket.off('user-stopped-typing');
        socket.off('video-call-started');
        socket.off('video-call-started-debug');
        socket.off('test-event');
        socket.off('pong');
      }
    };
  }, [group, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!group?._id) return;
    
    try {
      setLoading(true);
      const response = await groupAPI.getMessages(group._id);
      setMessages(response.data);
    } catch (error) {
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('message-received', (messageData) => {
        setMessages(prev => [...prev, messageData]);
      });

      socket.on('user-typing', ({ username }) => {
        setTypingUsers(prev => {
          if (!prev.includes(username)) {
            return [...prev, username];
          }
          return prev;
        });
      });

      socket.on('user-stopped-typing', ({ username }) => {
        setTypingUsers(prev => prev.filter(user => user !== username));
      });

      // Listen for incoming video calls - show notification popup for non-initiators
      socket.on('video-call-started', (data) => {
        // Only show popup if this user is NOT the initiator
        const currentUserId = user?.userId || user?.id;
        if (data.initiator?.userId !== currentUserId && data.initiator?.id !== currentUserId) {
          setIncomingCallId(data.callId);
          setShowVideoCall(true);
        }
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageData) => {
    if (!group?._id) return;
    
    try {
      let response;
      if (messageData.type === 'text') {
        response = await messageAPI.sendTextMessage({
          groupId: group._id,
          content: messageData.content,
          replyTo: messageData.replyTo
        });
      } else if (messageData.type === 'file') {
        const formData = new FormData();
        formData.append('file', messageData.file);
        formData.append('groupId', group._id);
        if (messageData.replyTo) {
          formData.append('replyTo', messageData.replyTo);
        }
        response = await messageAPI.sendFileMessage(formData);
      }

      const newMessage = response.data;
      setMessages(prev => [...prev, newMessage]);
      
      // Emit to other users via socket
      socketService.sendMessage({
        ...newMessage,
        groupId: group._id
      });

    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (isTyping) => {
    if (!group?._id || !user?.username) return;
    
    if (isTyping) {
      socketService.startTyping(group._id, user.username);
    } else {
      socketService.stopTyping(group._id, user.username);
    }
  };

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Please select a group to start chatting</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header with Video Call Button */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{group?.name || 'Group Chat'}</h2>
          <p className="text-sm text-gray-500">{group?.members?.length || 0} members</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddMember}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Member</span>
          </button>
          <button
            onClick={() => setShowVideoCall(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Video Call</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList 
          messages={messages} 
          currentUser={user}
          groupMembers={group?.members || []}
        />
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.join(', ')} are typing...`
              }
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <MessageInput 
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
        />
      </div>

      {/* Video Call Modal */}
      {showVideoCall && group && user && (
        <VideoCall
          group={group}
          user={user}
          incomingCallId={incomingCallId}
          onClose={() => {
            setShowVideoCall(false);
            setIncomingCallId(null);
          }}
        />
      )}
    </div>
  );
};

export default ChatWindow;
