import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Users, 
  Video,
  Phone,
  Bell,
  UserPlus,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import ChatWindowNew from '../components/ChatWindowNew';
import GroupListNew from '../components/GroupListNew';
import CreateGroupModal from '../components/CreateGroupModal';
import AddMemberModal from '../components/AddMemberModal';
import VideoCall from '../components/VideoCall';
import socketService from '../utils/socketService';
import { groupAPI, messageAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [directConversations, setDirectConversations] = useState([]);
  const [allConversations, setAllConversations] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [messageRequests, setMessageRequests] = useState([]);
  const [showMessageRequests, setShowMessageRequests] = useState(false);

  useEffect(() => {
    if (user) {
      // Socket connection is already handled by AuthContext
      fetchConversations();
      fetchMessageRequests();
    }
  }, [user]);

  const fetchConversations = async (retryCount = 0) => {
    try {
      setLoading(true);
      console.log('Fetching conversations...');
      
      // Fetch both groups and direct conversations with timeout
      const timeout = 10000; // 10 seconds timeout
      
      const groupsPromise = Promise.race([
        groupAPI.getGroups(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Groups API timeout')), timeout)
        )
      ]);
      
      const directPromise = Promise.race([
        messageAPI.getDirectConversations(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Direct conversations API timeout')), timeout)
        )
      ]);
      
      const [groupsResponse, directResponse] = await Promise.allSettled([
        groupsPromise,
        directPromise
      ]);
      
      // Handle groups response
      const groups = groupsResponse.status === 'fulfilled' 
        ? (groupsResponse.value.data || [])
        : [];
      
      // Handle direct conversations response  
      const directConversations = directResponse.status === 'fulfilled'
        ? (directResponse.value.data.conversations || [])
        : [];
      
      if (groupsResponse.status === 'rejected') {
        console.error('Failed to fetch groups:', groupsResponse.reason);
      }
      
      if (directResponse.status === 'rejected') {
        console.error('Failed to fetch direct conversations:', directResponse.reason);
      }
      
      console.log('Groups response:', groups);
      console.log('Direct conversations response:', directConversations);
      
      setGroups(groups);
      setDirectConversations(directConversations);
      
      // Combine all conversations for display
      const combined = [
        ...groups.map(g => ({ ...g, type: 'group' })),
        ...directConversations
      ];
      setAllConversations(combined);
      
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      
      // Retry logic
      if (retryCount < 2) {
        console.log(`Retrying fetch conversations (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchConversations(retryCount + 1), 2000);
        return;
      }
      
      toast.error('Failed to load conversations. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageRequests = async () => {
    try {
      const response = await messageAPI.getMessageRequests();
      setMessageRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to fetch message requests:', error);
    }
  };

  const handleMessageRequestResponse = async (requestId, action) => {
    try {
      const response = await messageAPI.respondToMessageRequest(requestId, action);
      toast.success(`Message request ${action}ed successfully`);
      
      // Refresh message requests and conversations
      await fetchMessageRequests();
      await fetchConversations();
      
      if (action === 'accept') {
        setShowMessageRequests(false);
        
        // If there's a conversation ID in the response, we could select it
        if (response.data?.conversationId) {
          // Find the conversation in our updated list
          setTimeout(() => {
            const conversation = allConversations.find(conv => 
              conv._id === response.data.conversationId || 
              (conv.type === 'direct' && conv._id === response.data.conversationId)
            );
            if (conversation) {
              setSelectedGroup(conversation);
              toast.info('Conversation opened!');
            }
          }, 500); // Small delay to ensure conversations are updated
        }
      }
    } catch (error) {
      console.error('Error responding to message request:', error);
      toast.error(`Failed to ${action} message request`);
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
  };

  const handleCreateGroup = async (groupData) => {
    try {
      console.log('Creating group with data:', groupData);
      const response = await groupAPI.createGroup(groupData);
      console.log('Created group response:', response.data);
      await fetchConversations(); // Refresh all conversations
      setShowCreateModal(false);
      toast.success('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleAddMember = () => {
    setShowAddMemberModal(true);
  };

  const handleMemberAdded = async () => {
    // Refresh conversations to get updated member list
    await fetchConversations();
    setShowAddMemberModal(false);
  };

  const handleStartVideoCall = () => {
    if (selectedGroup) {
      setShowVideoCall(true);
    }
  };

  const filteredConversations = allConversations.filter(conversation => {
    if (conversation.type === 'group') {
      return conversation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.members.some(member => 
          member.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    } else {
      // Direct conversation
      return conversation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.otherUser?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    }
  });

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navigation />

      <div className="flex-1 flex flex-col container mx-auto p-6 overflow-hidden max-w-7xl">
        {/* Page Header - Fixed */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Communicate with your team and supervisors</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowMessageRequests(true)}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Message Requests
              {messageRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {messageRequests.length}
                </Badge>
              )}
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Group
            </Button>
          </div>
        </div>

        {/* Main Chat Layout - Takes remaining height */}
        <div className="flex flex-1 gap-6 min-h-0">
          
          {/* Left Sidebar - Fixed/Sticky Conversations List */}
          <div className="w-80 flex-shrink-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <Badge variant="secondary">{allConversations.length}</Badge>
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
              
              {/* Scrollable conversations area only */}
              <CardContent className="flex-1 overflow-y-auto p-0">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <GroupListNew
                    groups={filteredConversations}
                    selectedGroup={selectedGroup}
                    onSelectGroup={handleGroupSelect}
                    currentUser={user}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Chat Area */}
          <div className="flex-1 min-w-0">
            {selectedGroup ? (
              <Card className="h-full flex flex-col">
                {/* Chat Header - Fixed */}
                <CardHeader className="pb-3 border-b border-border flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {selectedGroup.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedGroup.members?.length} members
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleStartVideoCall}
                        className="flex items-center gap-1"
                      >
                        <Video className="h-4 w-4" />
                        Video Call
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleAddMember}
                        className="flex items-center gap-1"
                      >
                        <Users className="h-4 w-4" />
                        Add Member
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Chat Content - Scrollable area only */}
                <div className="flex-1 overflow-hidden">
                  <ChatWindowNew
                    group={selectedGroup}
                    user={user}
                    onAddMember={handleAddMember}
                    onStartVideoCall={handleStartVideoCall}
                  />
                </div>
              </Card>
            ) : (
              /* No Chat Selected */
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No conversation selected</h3>
                  <p className="text-muted-foreground mb-6">
                    Choose a conversation from the list to start messaging
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Group
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreateGroup={handleCreateGroup}
          currentUser={user}
        />
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedGroup && (
        <AddMemberModal
          group={selectedGroup}
          currentUser={user}
          onClose={() => setShowAddMemberModal(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}

      {/* Message Requests Modal */}
      {showMessageRequests && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Message Requests</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowMessageRequests(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                New message requests from other users
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              {messageRequests.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending message requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messageRequests.map((request) => (
                    <div key={request._id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <UserPlus className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {request.sender.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.sender.email}
                          </p>
                          {request.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              "{request.message}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMessageRequestResponse(request._id, 'decline')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMessageRequestResponse(request._id, 'accept')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video Call Modal */}
      {showVideoCall && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-4xl h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Video Call - {selectedGroup.name}</h3>
              <Button 
                variant="outline" 
                onClick={() => setShowVideoCall(false)}
              >
                End Call
              </Button>
            </div>
            <VideoCall
              group={selectedGroup}
              user={user}
              onClose={() => setShowVideoCall(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
