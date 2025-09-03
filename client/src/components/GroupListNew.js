import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users, User } from 'lucide-react';
import { Badge } from './ui/badge';

const GroupList = ({ groups, selectedGroup, onSelectGroup, currentUser }) => {
  return (
    <div className="space-y-1">
      {groups.map((conversation) => {
        const isGroup = conversation.type === 'group';
        const isDirectConversation = conversation.type === 'direct';
        
        return (
          <div
            key={conversation._id}
            onClick={() => onSelectGroup(conversation)}
            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 ${
              selectedGroup?._id === conversation._id
                ? 'bg-muted border-l-primary'
                : 'border-l-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  {isGroup ? (
                    <Users className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground truncate">
                    {isGroup ? conversation.name : conversation.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.updatedAt || conversation.lastActivity), { addSuffix: true })}
                  </span>
                </div>
                
                {isGroup && conversation.thesisTitle && (
                  <p className="text-xs text-muted-foreground mb-1 truncate">{conversation.thesisTitle}</p>
                )}
                
                {isDirectConversation && conversation.otherUser?.email && (
                  <p className="text-xs text-muted-foreground mb-1 truncate">{conversation.otherUser.email}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">
                    {isGroup 
                      ? `${conversation.members?.length} member${conversation.members?.length !== 1 ? 's' : ''}`
                      : 'Direct message'
                    }
                  </p>
                  {/* You could add unread count badge here if available */}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {groups.length === 0 && (
        <div className="flex items-center justify-center h-32 p-4">
          <div className="text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No conversations yet</p>
            <p className="text-muted-foreground text-xs">Create a group or accept a message request to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupList;
