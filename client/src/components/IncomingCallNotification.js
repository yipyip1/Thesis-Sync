import React from 'react';
import { Phone, PhoneOff, User } from 'lucide-react';

const IncomingCallNotification = ({ 
  caller, 
  groupName, 
  onAccept, 
  onDecline, 
  isVisible 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-80 max-w-sm mx-4">
        <div className="text-center">
          {/* Caller Avatar */}
          <div className="mb-4">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          
          {/* Call Info */}
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Incoming Video Call
          </h3>
          <p className="text-gray-600 mb-1">
            {caller?.name || caller?.username || caller?.email || 'Unknown User'}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            in {groupName}
          </p>
          
          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            {/* Decline Button */}
            <button
              onClick={onDecline}
              className="flex items-center justify-center w-14 h-14 bg-gray-300 hover:bg-gray-400 rounded-full text-gray-700 transition-colors"
              aria-label="Decline call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            
            {/* Accept Button */}
            <button
              onClick={onAccept}
              className="flex items-center justify-center w-14 h-14 bg-black hover:bg-gray-800 rounded-full text-white transition-colors"
              aria-label="Accept call"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
          
          {/* Additional Info */}
          <p className="text-xs text-gray-400 mt-4">
            Camera and microphone access required
          </p>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
