import React, { useState, useEffect } from 'react';
import { groupAPI } from '../utils/api';
import GroupList from '../components/GroupList';
import ChatWindow from '../components/ChatWindow';
import CreateGroupModal from '../components/CreateGroupModal';
import AddMemberModal from '../components/AddMemberModal';
import FeatureCards from '../components/FeatureCards';
import TeamRequestModal from '../components/TeamRequestModal';
import AIChatbotModal from '../components/AIChatbotModal';
import SupervisorSearchModal from '../components/SupervisorSearchModal';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../utils/socketService';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showTeamRequestModal, setShowTeamRequestModal] = useState(false);
  const [showAIChatbotModal, setShowAIChatbotModal] = useState(false);
  const [showSupervisorSearchModal, setShowSupervisorSearchModal] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchGroups();
    return () => {
      // Cleanup if needed
    };
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await groupAPI.getGroups();
      setGroups(response.data);
    } catch (error) {
      toast.error('Failed to fetch groups');
    }
  };

  const handleGroupSelect = (group) => {
    if (selectedGroup) {
      socketService.leaveGroup(selectedGroup._id);
    }
    setSelectedGroup(group);
    socketService.joinGroup(group._id);
  };

  const handleCreateGroup = async (groupData) => {
    try {
      const response = await groupAPI.createGroup(groupData);
      setGroups([...groups, response.data]);
      setShowCreateModal(false);
      toast.success('Group created successfully!');
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const handleMemberAdded = async () => {
    await fetchGroups();
    if (selectedGroup) {
      try {
        const updatedGroups = await groupAPI.getGroups();
        const updatedGroup = updatedGroups.data.find(g => g._id === selectedGroup._id);
        if (updatedGroup) {
          setSelectedGroup(updatedGroup);
        }
      } catch (error) {
        console.error('Failed to refresh selected group:', error);
      }
    }
  };

  const handleCreateTeamRequest = (data) => {
    console.log('Team Request Created:', data);
    setShowTeamRequestModal(false);
    toast.success('Team request created successfully!');
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">Thesis-Sync</h1>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-800">{user?.username}</p>
              <p className="text-sm text-green-500">Online</p>
            </div>
          </div>
        </div>

        {/* Create Group Button */}
        <div className="p-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto">
          <GroupList
            groups={groups}
            selectedGroup={selectedGroup}
            onGroupSelect={handleGroupSelect}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Matching & Collaboration</h1>
          <FeatureCards
            onTeamRequest={() => setShowTeamRequestModal(true)}
            onAIChatbot={() => setShowAIChatbotModal(true)}
            onSupervisorSearch={() => setShowSupervisorSearchModal(true)}
          />
        </div>
        {selectedGroup ? (
          <ChatWindow
            group={selectedGroup}
            user={user}
            onAddMember={() => setShowAddMemberModal(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Thesis-Sync</h3>
              <p className="text-gray-600">Select a group to start chatting with your thesis teammates</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {showAddMemberModal && selectedGroup && (
        <AddMemberModal
          group={{ ...selectedGroup, currentUserId: user.id }}
          onClose={() => setShowAddMemberModal(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}

      {showTeamRequestModal && (
        <TeamRequestModal
          onClose={() => setShowTeamRequestModal(false)}
          onCreate={handleCreateTeamRequest}
        />
      )}

      {showAIChatbotModal && (
        <AIChatbotModal
          onClose={() => setShowAIChatbotModal(false)}
        />
      )}

      {showSupervisorSearchModal && (
        <SupervisorSearchModal
          onClose={() => setShowSupervisorSearchModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
