import React, { useState } from 'react';
import { XMarkIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { authAPI, groupAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AddMemberModal = ({ group, onClose, onMemberAdded }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      console.log('Attempting to add member with email:', email);
      console.log('Group ID:', group._id);
      console.log('Current user ID:', group.currentUserId);
      
      await groupAPI.addMemberByEmail(group._id, email.trim());
      toast.success('Member added successfully!');
      onMemberAdded();
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Error adding member:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = group.members.some(
    member => member.role === 'admin' && member.user._id === group.currentUserId
  );

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
          <div className="text-center">
            <XMarkIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">Only group admins can add new members.</p>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <UserPlusIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Add Member</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Current Members */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <UsersIcon className="w-4 h-4 mr-2" />
              Current Members ({group.members.length})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {group.members.map((member) => (
                <div key={member.user._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {member.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{member.user.username}</p>
                      <p className="text-xs text-gray-500">{member.user.email}</p>
                    </div>
                  </div>
                  {member.role === 'admin' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Admin</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Member Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Member Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter member's email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                The user must already be registered on Thesis-Sync
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
