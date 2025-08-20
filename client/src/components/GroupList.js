import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const GroupList = ({ groups, selectedGroup, onGroupSelect }) => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Your Groups
      </h3>
      <div className="space-y-2">
        {groups.map((group) => (
          <div
            key={group._id}
            onClick={() => onGroupSelect(group)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedGroup?._id === group._id
                ? 'bg-blue-100 border-blue-500 border'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-semibold">
                {group.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{group.name}</p>
                <p className="text-sm text-gray-500 truncate">{group.thesisTitle}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(group.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {groups.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No groups yet</p>
          <p className="text-gray-400 text-xs">Create a group to start collaborating</p>
        </div>
      )}
    </div>
  );
};

export default GroupList;
