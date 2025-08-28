import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users } from 'lucide-react';
import { Badge } from './ui/badge';

const GroupList = ({ groups, selectedGroup, onSelectGroup, currentUser }) => {
  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <div
          key={group._id}
          onClick={() => onSelectGroup(group)}
          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 ${
            selectedGroup?._id === group._id
              ? 'bg-muted border-l-primary'
              : 'border-l-transparent'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground truncate">{group.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(group.updatedAt), { addSuffix: true })}
                </span>
              </div>
              
              {group.thesisTitle && (
                <p className="text-xs text-muted-foreground mb-1 truncate">{group.thesisTitle}</p>
              )}
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {group.members?.length} member{group.members?.length !== 1 ? 's' : ''}
                </p>
                {/* You could add unread count badge here if available */}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {groups.length === 0 && (
        <div className="flex items-center justify-center h-32 p-4">
          <div className="text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No groups yet</p>
            <p className="text-muted-foreground text-xs">Create a group to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupList;
