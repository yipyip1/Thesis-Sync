import React, { useState, useEffect, useRef } from 'react';
import { groupAPI, messageAPI } from '../utils/api';
import socketService from '../utils/socketService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import toast from 'react-hot-toast';

const ChatWindow = ({ group, user, onAddMember, onStartVideoCall }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const currentUserId = user?.userId || user?.id;
    console.log('🔥 [ChatWindow] Component mounted/updated with:', { 
      groupId: group?._id, 
      currentUserId,
      hasGroup: !!group,
      hasUser: !!user
    });
    
    const socket = socketService.getSocket();
    if (group && socket) {
      // Leave previous group if any
      if (window._prevGroupId && window._prevGroupId !== group._id) {
        socketService.leaveGroup(window._prevGroupId);
      }
      window._prevGroupId = group._id;
      // Join the new group
      socketService.joinGroup(group._id);
      fetchMessages();
      setupSocketListeners();
    } else {
      console.log('🔥 [ChatWindow] No group selected or socket not connected');
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
        // Only add message if current user is NOT the sender (to avoid duplication)
        const currentUserId = user?.userId || user?.id;
        if (messageData.sender?._id !== currentUserId && messageData.sender?.userId !== currentUserId) {
          setMessages(prev => [...prev, messageData]);
        }
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
          // Use parent's video call handler
          if (onStartVideoCall) {
            onStartVideoCall();
          }
        }
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageData) => {
    if (!group?._id) return;
    
    try {
      console.log('🚀 [ChatWindow] Sending message:', messageData);
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

      console.log('✅ [ChatWindow] Message sent, response:', response);
    } catch (error) {
      console.error('❌ [ChatWindow] Error sending message:', error);
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
        <div className="text-muted-foreground">Please select a group to start chatting</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList 
          messages={messages} 
          currentUser={user}
          groupMembers={group?.members || []}
        />
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="text-sm text-muted-foreground italic">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <MessageInput 
          onSendMessage={sendMessage} 
          onTyping={handleTyping}
          group={group} 
        />
      </div>
    </div>
  );
};

export default ChatWindow;
