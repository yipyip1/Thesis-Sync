import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  MessageCircle, 
  Send, 
  Search, 
  Plus, 
  Users, 
  Phone, 
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Image,
  File,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  // Mock data for conversations
  const mockConversations = [
    {
      id: 1,
      type: 'direct',
      name: 'Dr. Sarah Johnson',
      avatar: '',
      lastMessage: 'Great progress on the AI model! Let\'s discuss the next steps.',
      lastMessageTime: '2:30 PM',
      unreadCount: 2,
      online: true,
      role: 'Supervisor'
    },
    {
      id: 2,
      type: 'group',
      name: 'AI Research Squad',
      avatar: '',
      lastMessage: 'John: I\'ve uploaded the latest dataset for review',
      lastMessageTime: '1:45 PM',
      unreadCount: 5,
      members: ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown'],
      project: 'AI-Powered Diagnosis System'
    },
    {
      id: 3,
      type: 'direct',
      name: 'Jane Smith',
      avatar: '',
      lastMessage: 'Can you review my code before the meeting?',
      lastMessageTime: '11:20 AM',
      unreadCount: 0,
      online: false,
      role: 'Student'
    },
    {
      id: 4,
      type: 'group',
      name: 'Blockchain Innovators',
      avatar: '',
      lastMessage: 'Carol: Meeting moved to 3 PM tomorrow',
      lastMessageTime: 'Yesterday',
      unreadCount: 1,
      members: ['Carol Martinez', 'David Lee', 'Emma Davis'],
      project: 'Supply Chain Platform'
    },
    {
      id: 5,
      type: 'direct',
      name: 'Prof. Michael Chen',
      avatar: '',
      lastMessage: 'Your proposal looks excellent. A few minor suggestions...',
      lastMessageTime: 'Yesterday',
      unreadCount: 0,
      online: true,
      role: 'Supervisor'
    }
  ];

  // Mock messages for selected chat
  const mockMessages = {
    1: [
      {
        id: 1,
        senderId: 'dr-sarah',
        senderName: 'Dr. Sarah Johnson',
        content: 'Hi! I\'ve reviewed your latest progress report. The AI model is showing promising results.',
        timestamp: '2:15 PM',
        type: 'text',
        status: 'read'
      },
      {
        id: 2,
        senderId: user?.id,
        senderName: user?.name || 'You',
        content: 'Thank you for the feedback! I\'m particularly excited about the accuracy improvements we\'ve achieved.',
        timestamp: '2:20 PM',
        type: 'text',
        status: 'read'
      },
      {
        id: 3,
        senderId: 'dr-sarah',
        senderName: 'Dr. Sarah Johnson',
        content: 'Great progress on the AI model! Let\'s discuss the next steps. I think we should focus on data preprocessing and feature engineering.',
        timestamp: '2:30 PM',
        type: 'text',
        status: 'delivered'
      },
      {
        id: 4,
        senderId: 'dr-sarah',
        senderName: 'Dr. Sarah Johnson',
        content: 'Also, please prepare a presentation for next week\'s review meeting.',
        timestamp: '2:31 PM',
        type: 'text',
        status: 'delivered'
      }
    ],
    2: [
      {
        id: 1,
        senderId: 'john-doe',
        senderName: 'John Doe',
        content: 'Hey team! I\'ve been working on the data preprocessing pipeline.',
        timestamp: '10:30 AM',
        type: 'text',
        status: 'read'
      },
      {
        id: 2,
        senderId: 'jane-smith',
        senderName: 'Jane Smith',
        content: 'Looks great! I\'ll start working on the frontend integration.',
        timestamp: '11:15 AM',
        type: 'text',
        status: 'read'
      },
      {
        id: 3,
        senderId: 'john-doe',
        senderName: 'John Doe',
        content: 'I\'ve uploaded the latest dataset for review',
        timestamp: '1:45 PM',
        type: 'text',
        status: 'read'
      },
      {
        id: 4,
        senderId: 'john-doe',
        senderName: 'John Doe',
        content: 'Dataset_v2.xlsx',
        timestamp: '1:45 PM',
        type: 'file',
        fileName: 'Dataset_v2.xlsx',
        fileSize: '2.3 MB',
        status: 'read'
      }
    ]
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, mockMessages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      // In real app, this would send message via API/Socket
      console.log('Sending message:', newMessage, 'to chat:', selectedChat);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = mockConversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMessageStatus = (status) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Communicate with your team and supervisors</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <Badge variant="secondary">{mockConversations.length}</Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedChat(conversation.id)}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 ${
                        selectedChat === conversation.id
                          ? 'bg-muted border-l-primary'
                          : 'border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            {conversation.type === 'group' ? (
                              <Users className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <span className="text-sm font-medium">
                                {conversation.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            )}
                          </div>
                          {conversation.type === 'direct' && conversation.online && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground truncate">{conversation.name}</h3>
                            <span className="text-xs text-muted-foreground">{conversation.lastMessageTime}</span>
                          </div>
                          
                          {conversation.type === 'group' && (
                            <p className="text-xs text-muted-foreground mb-1">{conversation.project}</p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs h-5 w-5 p-0 flex items-center justify-center">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8 xl:col-span-9">
            {selectedChat ? (
              <Card className="h-full flex flex-col">
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          {mockConversations.find(c => c.id === selectedChat)?.type === 'group' ? (
                            <Users className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <span className="text-sm font-medium">
                              {mockConversations.find(c => c.id === selectedChat)?.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          )}
                        </div>
                        {mockConversations.find(c => c.id === selectedChat)?.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {mockConversations.find(c => c.id === selectedChat)?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {mockConversations.find(c => c.id === selectedChat)?.type === 'group' 
                            ? `${mockConversations.find(c => c.id === selectedChat)?.members?.length} members`
                            : mockConversations.find(c => c.id === selectedChat)?.online ? 'Online' : 'Last seen recently'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {mockMessages[selectedChat]?.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.senderId === user?.id ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {message.senderId !== user?.id && (
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium">
                            {message.senderName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )}
                      
                      <div className={`max-w-[70%] ${
                        message.senderId === user?.id ? 'items-end' : 'items-start'
                      }`}>
                        {message.senderId !== user?.id && (
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {message.senderName}
                          </p>
                        )}
                        
                        <div className={`rounded-lg px-3 py-2 ${
                          message.senderId === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}>
                          {message.type === 'text' ? (
                            <p className="text-sm">{message.content}</p>
                          ) : message.type === 'file' ? (
                            <div className="flex items-center gap-2">
                              <File className="h-4 w-4" />
                              <div>
                                <p className="text-sm font-medium">{message.fileName}</p>
                                <p className="text-xs opacity-70">{message.fileSize}</p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        
                        <div className={`flex items-center gap-1 mt-1 ${
                          message.senderId === user?.id ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                          {message.senderId === user?.id && getMessageStatus(message.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex items-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Image className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex-1">
                      <textarea
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none min-h-[40px] max-h-[120px]"
                        rows="1"
                      />
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <Smile className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              /* No Chat Selected */
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No conversation selected</h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
