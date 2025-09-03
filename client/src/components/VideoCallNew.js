import React, { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';
import socketService from '../utils/socketService';
import { v4 as uuidv4 } from 'uuid';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';

const VideoCall = ({ group, user, incomingCallId, onClose, isAcceptedCall = false }) => {
  const safeIncomingCallId = (typeof incomingCallId === 'string') ? incomingCallId : null;

  const [isCallActive, setIsCallActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callId, setCallId] = useState(null);
  
  const localVideoRef = useRef(null);
  const peersRef = useRef([]);
  const localStreamRef = useRef(null);

  if (!group || !user) {
    return null;
  }

  const cleanup = React.useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    peersRef.current.forEach(({ peer }) => {
      try {
        peer.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    peersRef.current = [];
    setParticipants([]);
  }, []);

  const createPeer = React.useCallback((userToCall, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });
    
    peer.on('signal', signal => {
      socketService.sendVideoSignal(callId, userToCall, signal, 'offer');
    });
    
    peer.on('stream', remoteStream => {
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === userToCall);
        if (existing) {
          existing.stream = remoteStream;
          return [...prev];
        }
        return [...prev, { userId: userToCall, stream: remoteStream }];
      });
    });
    
    peer.on('error', () => {
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
      setParticipants(prev => prev.filter(p => p.userId !== userToCall));
    });

    return peer;
  }, [callId]);

  const addPeer = React.useCallback((incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', signal => {
      socketService.sendVideoSignal(callId, callerID, signal, 'answer');
    });

    peer.on('stream', remoteStream => {
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === callerID);
        if (existing) {
          existing.stream = remoteStream;
          return [...prev];
        }
        return [...prev, { userId: callerID, stream: remoteStream }];
      });
    });

    peer.on('error', () => {
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
      setParticipants(prev => prev.filter(p => p.userId !== callerID));
    });

    peer.signal(incomingSignal);
    return peer;
  }, [callId]);

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }, 100);

      const newCallId = uuidv4();
      setCallId(newCallId);
      setIsCallActive(true);
      socketService.startVideoCall(group._id, newCallId);
      
    } catch (error) {
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const endVideoCall = React.useCallback(() => {
    if (callId) {
      socketService.endVideoCall(callId, group._id);
    }
    cleanup();
    setIsCallActive(false);
    setCallId(null);
    onClose();
  }, [callId, group._id, cleanup, onClose]);

  const toggleVideo = React.useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const toggleAudio = React.useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  const handleUserJoinedCall = React.useCallback(({ userId, username, socketId }) => {
    if (userId !== user.userId && localStreamRef.current) {
      const mySocketId = socketService.getSocket()?.id;
      const shouldInitiate = mySocketId > socketId;
      
      if (shouldInitiate) {
        let existing = peersRef.current.find(p => p.peerId === socketId);
        if (!existing) {
          const peer = createPeer(socketId, localStreamRef.current);
          peersRef.current.push({ peerId: socketId, peer });
        }
      }
    }
  }, [user.userId, createPeer]);

  const handleUserLeftCall = React.useCallback(({ socketId }) => {
    const peerObj = peersRef.current.find(p => p.peerId === socketId);
    if (peerObj) {
      peerObj.peer.destroy();
      peersRef.current = peersRef.current.filter(p => p.peerId !== socketId);
      setParticipants(prev => prev.filter(p => p.userId !== socketId));
    }
  }, []);

  const handleVideoCallEnded = React.useCallback(() => {
    cleanup();
    setIsCallActive(false);
    setCallId(null);
    onClose();
  }, [cleanup, onClose]);

  const handleVideoSignal = React.useCallback(({ fromSocketId, signal, type }) => {
    if (type === 'offer') {
      let existing = peersRef.current.find(p => p.peerId === fromSocketId);
      if (!existing) {
        if (localStreamRef.current) {
          const peer = addPeer(signal, fromSocketId, localStreamRef.current);
          peersRef.current.push({ peerId: fromSocketId, peer });
        }
      } else {
        if (existing.peer.signalingState === 'stable' || existing.peer.signalingState === 'have-local-offer') {
          try {
            existing.peer.signal(signal);
          } catch (error) {
            existing.peer.destroy();
            peersRef.current = peersRef.current.filter(p => p.peerId !== fromSocketId);
            const peer = addPeer(signal, fromSocketId, localStreamRef.current);
            peersRef.current.push({ peerId: fromSocketId, peer });
          }
        }
      }
    } else if (type === 'answer') {
      const item = peersRef.current.find(p => p.peerId === fromSocketId);
      if (item) {
        try {
          item.peer.signal(signal);
        } catch (error) {
          // Handle signaling error
        }
      }
    }
  }, [addPeer]);

  const handleExistingParticipants = React.useCallback((participants) => {
    const processParticipants = () => {
      participants.forEach((participant) => {
        const socket = socketService.getSocket();
        
        if (participant.socketId !== socket?.id && localStreamRef.current) {
          const shouldInitiate = socket?.id > participant.socketId;
          
          if (shouldInitiate) {
            let existing = peersRef.current.find(p => p.peerId === participant.socketId);
            if (!existing) {
              const peer = createPeer(participant.socketId, localStreamRef.current);
              peersRef.current.push({ peerId: participant.socketId, peer });
            }
          }
        }
      });
    };

    if (!localStreamRef.current) {
      setTimeout(processParticipants, 300);
    } else {
      processParticipants();
    }
  }, [createPeer]);

  // Auto-join if there's an incoming call ID
  useEffect(() => {
    if (safeIncomingCallId && !isCallActive) {
      setCallId(safeIncomingCallId);
      setIsCallActive(true);
      
      const joinCall = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });

          setLocalStream(stream);
          localStreamRef.current = stream;
          
          setTimeout(() => {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          }, 100);

          if (group?._id) {
            socketService.joinVideoCall(safeIncomingCallId, group._id);
          }
          
        } catch (error) {
          setIsCallActive(false);
          setCallId(null);
          alert('Could not access camera/microphone. Please check permissions.');
        }
      };
      
      joinCall();
    }
  }, [safeIncomingCallId, group]);

  // Socket events setup
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('user-joined-call', handleUserJoinedCall);
      socket.on('user-left-call', handleUserLeftCall);
      socket.on('video-call-ended', handleVideoCallEnded);
      socket.on('video-signal', handleVideoSignal);
      socket.on('existing-participants', handleExistingParticipants);
    }

    return () => {
      if (socket) {
        socket.off('user-joined-call', handleUserJoinedCall);
        socket.off('user-left-call', handleUserLeftCall);
        socket.off('video-call-ended', handleVideoCallEnded);
        socket.off('video-signal', handleVideoSignal);
        socket.off('existing-participants', handleExistingParticipants);
      }
    };
  }, [handleUserJoinedCall, handleUserLeftCall, handleVideoCallEnded, handleVideoSignal, handleExistingParticipants]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Update video element when local stream changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    !isCallActive ? (
      incomingCallId ? (
        // Joining call
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Joining Video Call</h3>
            <p className="text-gray-600 mb-6">
              Connecting to {group?.name || 'group'}...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black"></div>
            </div>
          </div>
        </div>
      ) : (
        // Start new call
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Video Call</h3>
            <p className="text-gray-600 mb-6">
              Start a video call with {group?.name || 'group'} members?
            </p>
            <div className="flex gap-3">
              <button
                onClick={startVideoCall}
                className="flex-1 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Start Call
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )
    ) : (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{group?.name || 'Group'}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Users className="w-3 h-3" />
                {participants.length + 1} participant{participants.length === 0 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-6">
          <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Local Video */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden border-2 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                You
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {participants.map((participant) => (
              <RemoteVideo
                key={participant.userId}
                stream={participant.stream}
                userId={participant.userId}
              />
            ))}

            {/* Empty slots for better grid layout */}
            {participants.length === 0 && (
              <div className="relative bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Waiting for others to join...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleAudio}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isAudioEnabled 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isVideoEnabled 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={endVideoCall}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-black hover:bg-gray-800 text-white transition-colors"
              title="End call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  );
};

const RemoteVideo = ({ stream, userId }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, userId]);

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden border-2 border-white/20">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
        User {userId}
      </div>
      {!stream && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <VideoOff className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">No video</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
