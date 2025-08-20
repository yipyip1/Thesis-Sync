import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon,
  PhotoIcon,
  DocumentIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setAttachedFile(acceptedFiles[0]);
      }
    },
    onDropRejected: () => {
      toast.error('File type not supported or file too large (max 50MB)');
    }
  });

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
    handleTypingIndicator();
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleTypingIndicator = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (attachedFile) {
      onSendMessage({
        type: 'file',
        file: attachedFile
      });
      setAttachedFile(null);
    } else if (message.trim()) {
      onSendMessage({
        type: 'text',
        content: message.trim()
      });
      setMessage('');
    }

    if (isTyping) {
      setIsTyping(false);
      onTyping(false);
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-5 h-5" />;
    } else if (file.type === 'application/pdf') {
      return <DocumentIcon className="w-5 h-5" />;
    } else if (file.type.startsWith('video/')) {
      return <VideoCameraIcon className="w-5 h-5" />;
    }
    return <DocumentIcon className="w-5 h-5" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      
      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <PaperClipIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-blue-600 font-medium">Drop your file here</p>
          </div>
        </div>
      )}

      {/* File attachment preview */}
      {attachedFile && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-blue-500">
                {getFileIcon(attachedFile)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{attachedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(attachedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={removeAttachedFile}
              className="text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              type="button"
              onClick={open}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() && !attachedFile}
          className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
