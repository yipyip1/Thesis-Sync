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
    
    if (group && user) {
      // Set up socket listeners and join group
      const setupChatConnection = async () => {
        try {
          let socket = socketService.getSocket();
          
          // Check if socket exists and is connected
          if (!socket || !socket.connected) {
            // Wait a bit for the socket to connect (it should be connecting from AuthContext)
            await new Promise(resolve => setTimeout(resolve, 1000));
            socket = socketService.getSocket();
            
            // If still not connected, something is wrong
            if (!socket || !socket.connected) {
              console.error('❌ [ChatWindow] Socket still not connected after waiting');
              toast.error('Chat connection unavailable. Please refresh the page.');
              return;
            }
          }
          
          // Set up listeners
          setupSocketListeners();
          
          // Join the group
          if (window._prevGroupId && window._prevGroupId !== group._id) {
            socketService.leaveGroup(window._prevGroupId);
          }
          window._prevGroupId = group._id;
          socketService.joinGroup(group._id);
          
        } catch (error) {
          console.error('❌ [ChatWindow] Error setting up chat connection:', error);
          toast.error('Failed to connect to chat. Please refresh the page.');
        }
      };
      
      setupChatConnection();
      fetchMessages();
    } else {
      setLoading(false);
    }
    
    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('message-received');
        socket.off('direct-message-received');
        socket.off('user-typing');
        socket.off('user-stopped-typing');
        socket.off('video-call-started');
      }
    };
  }, [group, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!group?._id) {
      console.log('❌ [ChatWindow] No group ID provided:', { group });
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      let response;
      
      if (group.type === 'direct') {
        // For direct conversations, use the direct conversation API
        response = await messageAPI.getDirectConversation(group.otherUser._id);
        setMessages(response.data.messages || []);
      } else {
        // For groups, use the group API
        response = await groupAPI.getMessages(group._id);
        setMessages(response.data);
      }
    } catch (error) {
      console.error('❌ [ChatWindow] Error fetching messages:', error);
      toast.error('Failed to fetch messages');
      setMessages([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    const socket = socketService.getSocket();
    console.log('🎧 [ChatWindowNew] Setting up socket listeners...');
    console.log('🎧 [ChatWindowNew] Socket exists:', !!socket);
    console.log('🎧 [ChatWindowNew] Socket connected:', socket?.connected);
    console.log('🎧 [ChatWindowNew] Socket ID:', socket?.id);
    console.log('🎧 [ChatWindowNew] Current group ID:', group?._id);
    console.log('🎧 [ChatWindowNew] Current user ID:', user?.userId || user?.id);
    
    if (!socket || !socket.connected) {
      console.error('❌ [ChatWindowNew] Cannot set up listeners - socket not connected');
      return;
    }
    
    // Remove existing listeners first to prevent duplicates
    socket.off('message-received');
    socket.off('direct-message-received');
    socket.off('user-typing');
    socket.off('user-stopped-typing');
    socket.off('video-call-started');
    console.log('🎧 [ChatWindowNew] Cleared existing listeners');
    
    socket.on('message-received', (messageData) => {
      // Only add message if it's for the current group and user is not the sender
      const currentUserId = user?.userId || user?.id;
      if (messageData.groupId === group?._id && 
          messageData.sender?._id !== currentUserId && 
          messageData.sender?.userId !== currentUserId) {
        setMessages(prev => [...prev, messageData]);
      }
    });

    // Listen for direct messages
    socket.on('direct-message-received', (messageData) => {
      // Only add message if it's for the current conversation and user is not the sender
      const currentUserId = user?.userId || user?.id;
      if (group?.type === 'direct' && 
          messageData.sender?._id !== currentUserId && 
          messageData.sender?.userId !== currentUserId) {
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
      console.log('🎯 [ChatWindowNew] ===== VIDEO CALL EVENT RECEIVED =====');
      console.log('🎯 [ChatWindowNew] Event data:', JSON.stringify(data, null, 2));
      console.log('🎯 [ChatWindowNew] Socket ID:', socket.id);
      console.log('🎯 [ChatWindowNew] Socket connected:', socket.connected);
      console.log('🎯 [ChatWindowNew] Timestamp:', new Date().toLocaleTimeString());
      
      // Only show popup if this user is NOT the initiator and it's for current group
      const currentUserId = user?.userId || user?.id;
      console.log('🎯 [ChatWindowNew] Current user ID:', currentUserId);
      console.log('🎯 [ChatWindowNew] Current group ID:', group?._id);
      console.log('🎯 [ChatWindowNew] Event group ID:', data.groupId);
      console.log('🎯 [ChatWindowNew] Initiator ID:', data.initiator?.userId || data.initiator?.id);
      
      if (data.groupId === group?._id &&
          data.initiator?.userId !== currentUserId && 
          data.initiator?.id !== currentUserId) {
        console.log('✅ [ChatWindowNew] User is NOT initiator and in correct group - calling onStartVideoCall');
        console.log('✅ [ChatWindowNew] Call ID from event:', data.callId);
        // Use parent's video call handler with caller information
        if (onStartVideoCall) {
          console.log('✅ [ChatWindowNew] onStartVideoCall function exists, calling it with callId and caller info...');
          onStartVideoCall(data.callId, data.initiator); // Pass both callId and caller info
        } else {
          console.error('❌ [ChatWindowNew] onStartVideoCall function not provided!');
        }
      } else {
        console.log('❌ [ChatWindowNew] Not calling video handler because:');
        console.log('   - Group match:', data.groupId === group?._id);
        console.log('   - User is not initiator:', data.initiator?.userId !== currentUserId && data.initiator?.id !== currentUserId);
      }
      console.log('🎯 [ChatWindowNew] ===== VIDEO CALL EVENT PROCESSED =====');
    });
    
    console.log('🎧 [ChatWindowNew] All socket listeners registered successfully');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageData) => {
    if (!group?._id) return;
    
    try {
      let response;
      const isDirectConversation = group.type === 'direct';
      
      if (messageData.type === 'text') {
        if (isDirectConversation) {
          // For direct conversations, use direct message API
          response = await messageAPI.sendDirectMessage(group.otherUser._id, messageData.content);
        } else {
          // For groups, use group message API
          response = await messageAPI.sendTextMessage({
            groupId: group._id,
            content: messageData.content,
            replyTo: messageData.replyTo
          });
        }
      } else if (messageData.type === 'file') {
        if (isDirectConversation) {
          // TODO: Implement file sending for direct conversations
          toast.error('File sending not yet supported for direct messages');
          return;
        } else {
          const formData = new FormData();
          formData.append('file', messageData.file);
          formData.append('groupId', group._id);
          if (messageData.replyTo) {
            formData.append('replyTo', messageData.replyTo);
          }
          response = await messageAPI.sendFileMessage(formData);
        }
      }

      let newMessage;
      if (isDirectConversation) {
        newMessage = response.data.message; // Direct message API returns { success: true, message: ... }
      } else {
        newMessage = response.data; // Group API returns the message directly
      }
      
      // Add message immediately for sender (for better UX)
      setMessages(prev => [...prev, newMessage]);
      console.log('✅ [ChatWindow] Message added locally, now emitting via socket...');
      
      // Emit to other users via socket
      if (isDirectConversation) {
        // For direct conversations, emit differently
        socketService.sendDirectMessage({
          ...newMessage,
          conversationId: group._id,
          receiverId: group.otherUser._id
        });
      } else {
        // For groups
        socketService.sendMessage({
          ...newMessage,
          groupId: group._id
        });
      }

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
        <div className="text-center">
          <div className="text-muted-foreground mb-4">Please select a group to start chatting</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  if (!group?._id) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Select a conversation
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose a group or start a new conversation to begin messaging
          </p>
        </div>
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
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg w-fit">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            </div>
            <span className="text-sm text-muted-foreground">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
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
