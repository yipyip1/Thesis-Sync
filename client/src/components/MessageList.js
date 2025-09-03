import React from 'react';
import { format } from 'date-fns';
import { 
  DocumentIcon, 
  PhotoIcon,
  VideoCameraIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const MessageList = ({ messages, currentUser, groupMembers }) => {
  const formatTime = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const formatDate = (timestamp) => {
    return format(new Date(timestamp), 'MMM dd, yyyy');
  };

  const isNewDay = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    const currentDate = new Date(currentMessage.createdAt).toDateString();
    const previousDate = new Date(previousMessage.createdAt).toDateString();
    return currentDate !== previousDate;
  };

  const renderFileContent = (message) => {
    const { file } = message;
    const fileUrl = `http://localhost:5000${file.url}`;

    if (message.messageType === 'image') {
      return (
        <div className="max-w-xs">
          <img
            src={fileUrl}
            alt={file.originalName}
            className="rounded-lg shadow-sm max-w-full h-auto cursor-pointer"
            onClick={() => window.open(fileUrl, '_blank')}
          />
          <p className="text-xs text-muted-foreground mt-1">{file.originalName}</p>
        </div>
      );
    }

    if (message.messageType === 'video') {
      return (
        <div className="max-w-sm">
          <video
            controls
            className="rounded-lg shadow-sm max-w-full"
            preload="metadata"
          >
            <source src={fileUrl} type={file.mimeType} />
            Your browser does not support the video tag.
          </video>
          <p className="text-xs text-muted-foreground mt-1">{file.originalName}</p>
        </div>
      );
    }

    // For PDFs and other files
    return (
      <div className="bg-muted border border-border rounded-lg p-3 max-w-xs">
        <div className="flex items-center space-x-3">
          <div className="text-destructive">
            <DocumentIcon className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {file.originalName}
            </p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <a
            href={fileUrl}
            download={file.originalName}
            className="text-primary hover:text-primary/80"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
          </a>
        </div>
      </div>
    );
  };

  const renderMessage = (message, index) => {
    const isOwnMessage = message.sender._id === currentUser.id;
    const showDateSeparator = isNewDay(message, messages[index - 1]);

    return (
      <div key={message._id}>
        {showDateSeparator && (
          <div className="flex justify-center my-4">
            <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
              {formatDate(message.createdAt)}
            </span>
          </div>
        )}
        
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
          <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
            {!isOwnMessage && (
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
                  {(message.sender.name || message.sender.username || message.sender.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-foreground font-medium">
                  {message.sender.name || message.sender.username || 'Unknown'}
                </span>
              </div>
            )}
            
            <div
              className={`px-4 py-2 rounded-lg ${
                isOwnMessage
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted border border-border'
              }`}
            >
              {message.messageType === 'text' ? (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              ) : (
                renderFileContent(message)
              )}
              
              <div className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {formatTime(message.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {messages.map((message, index) => renderMessage(message, index))}
      
      {messages.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-1">No messages yet</h3>
          <p className="text-gray-500 text-sm">Start the conversation by sending a message</p>
        </div>
      )}
    </div>
  );
};

export default MessageList;
