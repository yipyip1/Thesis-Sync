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
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import ChatWindowNew from '../components/ChatWindowNew';
import GroupListNew from '../components/GroupListNew';
import CreateGroupModal from '../components/CreateGroupModal';
import AddMemberModal from '../components/AddMemberModal';
import VideoCall from '../components/VideoCall';
import socketService from '../utils/socketService';
import { groupAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVideoCall, setShowVideoCall] = useState(false);

  useEffect(() => {
    if (user) {
      // Connect to socket service
      socketService.connect(user);
      fetchGroups();
    }

    return () => {
      // Clean up socket connection on unmount
      socketService.disconnect();
    };
  }, [user]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await groupAPI.getGroups();
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
  };

  const handleCreateGroup = async (groupData) => {
    try {
      const response = await groupAPI.createGroup(groupData);
      setGroups(prev => [response.data, ...prev]);
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
    // Refresh groups to get updated member list
    await fetchGroups();
    setShowAddMemberModal(false);
  };

  const handleStartVideoCall = () => {
    if (selectedGroup) {
      setShowVideoCall(true);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.members.some(member => 
      member.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Group
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Groups/Conversations List */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <Badge variant="secondary">{groups.length}</Badge>
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
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <GroupListNew
                    groups={filteredGroups}
                    selectedGroup={selectedGroup}
                    onSelectGroup={handleGroupSelect}
                    currentUser={user}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8 xl:col-span-9">
            {selectedGroup ? (
              <Card className="h-full flex flex-col">
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b border-border">
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
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleAddMember}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Chat Content */}
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
