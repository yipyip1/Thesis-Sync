import React, { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';
import socketService from '../utils/socketService';
import { v4 as uuidv4 } from 'uuid';

const VideoCall = ({ group, user, incomingCallId, onClose }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callId, setCallId] = useState(null);
  
  const localVideoRef = useRef(null);
  const peersRef = useRef([]);
  const localStreamRef = useRef(null);

  // Add safety check for group prop
  if (!group || !user) {
    console.error('VideoCall: Missing required props', { group, user });
    return null;
  }

  // Auto-join if there's an incoming call ID
  useEffect(() => {
    if (incomingCallId && !isCallActive) {
      console.log('Auto-joining incoming call:', incomingCallId);
      joinVideoCall(incomingCallId);
    }
  }, [incomingCallId]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      // Listen for video call events (excluding video-call-started which is handled by ChatWindow)
      socket.on('user-joined-call', handleUserJoinedCall);
      socket.on('user-left-call', handleUserLeftCall);
      socket.on('video-call-ended', handleVideoCallEnded);
      socket.on('video-signal', handleVideoSignal);

      // Handle existing participants when joining a call
      socket.on('existing-participants', (participants) => {
        // For each existing participant, create a peer as initiator and send offer
        participants.forEach((participant) => {
          if (participant.socketId !== socket.id && localStreamRef.current) {
            // Prevent duplicate peers
            let existing = peersRef.current.find(p => p.peerId === participant.socketId);
            if (!existing) {
              const peer = createPeer(participant.socketId, localStreamRef.current);
              peersRef.current.push({ peerId: participant.socketId, peer });
            }
          }
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('user-joined-call');
        socket.off('user-left-call');
        socket.off('video-call-ended');
        socket.off('video-signal');
        socket.off('existing-participants');
      }
      cleanup();
    };
  }, []);

  // Effect to update video element when local stream changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('Setting video source object:', localStream);
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const cleanup = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    peersRef.current.forEach(({ peer }) => {
      if (peer) peer.destroy();
    });
    peersRef.current = [];
    
    setLocalStream(null);
    setParticipants([]);
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Wait for next render cycle to ensure ref is available
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }, 100);

      const newCallId = uuidv4();
      setCallId(newCallId);
      setIsCallActive(true);

      // Emit start call event
      if (group?._id) {
        socketService.startVideoCall(group._id, newCallId);
      }
      
    } catch (error) {
      console.error('Error starting video call:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const joinVideoCall = async (incomingCallId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Wait for next render cycle to ensure ref is available
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }, 100);

      setCallId(incomingCallId);
      setIsCallActive(true);

      // Join the call
      if (group?._id) {
        socketService.joinVideoCall(incomingCallId, group._id);
      }
      
    } catch (error) {
      console.error('Error joining video call:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const endVideoCall = () => {
    if (callId && group?._id) {
      socketService.endVideoCall(callId, group._id);
    }
    cleanup();
    setIsCallActive(false);
    setCallId(null);
    onClose();
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Create a peer as initiator (for new joiner to existing participants)
  const createPeer = (userToCall, stream) => {
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
    peer.on('close', () => {
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
    });
    peer.on('error', () => {
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
    });
    return peer;
  };

  // Add a peer as non-initiator (for existing participants when new user joins)
  const addPeer = (incomingSignal, callerSocketId, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });
    peer.on('signal', signal => {
      socketService.sendVideoSignal(callId, callerSocketId, signal, 'answer');
    });
    peer.on('stream', remoteStream => {
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === callerSocketId);
        if (existing) {
          existing.stream = remoteStream;
          return [...prev];
        }
        return [...prev, { userId: callerSocketId, stream: remoteStream }];
      });
    });
    peer.signal(incomingSignal);
    peer.on('close', () => {
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
    });
    peer.on('error', () => {
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
    });
    return peer;
  };

  // Socket event handlers
  const handleUserJoinedCall = ({ userId, username, socketId }) => {
    if (userId !== user.userId && localStreamRef.current) {
      let existing = peersRef.current.find(p => p.peerId === socketId);
      if (!existing) {
        // Wait for offer from the new joiner, so do not create initiator peer here
        // Instead, create non-initiator peer when offer is received in handleVideoSignal
      }
    }
  };

  const handleUserLeftCall = ({ socketId }) => {
    const peerObj = peersRef.current.find(p => p.peerId === socketId);
    if (peerObj) {
      peerObj.peer.destroy();
      peersRef.current = peersRef.current.filter(p => p.peerId !== socketId);
      setParticipants(prev => prev.filter(p => p.userId !== socketId));
    }
  };

  const handleVideoCallEnded = () => {
    cleanup();
    setIsCallActive(false);
    setCallId(null);
    onClose();
  };

  const handleVideoSignal = ({ fromSocketId, signal, type }) => {
    if (type === 'offer') {
      // Prevent duplicate peers for the same remote user
      let existing = peersRef.current.find(p => p.peerId === fromSocketId);
      if (!existing) {
        const peer = addPeer(signal, fromSocketId, localStreamRef.current);
        peersRef.current.push({ peerId: fromSocketId, peer });
      } else {
        // If peer already exists, just signal it
        existing.peer.signal(signal);
      }
    } else if (type === 'answer') {
      const item = peersRef.current.find(p => p.peerId === fromSocketId);
      if (item) {
        item.peer.signal(signal);
      }
    }
  };

  return (
    !isCallActive ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Start Video Call</h3>
          <p className="text-gray-600 mb-6">
            Start a video call with {group?.name || 'group'} members?
          </p>
          <div className="flex space-x-3">
            <button
              onClick={startVideoCall}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Start Call
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{group?.name || 'Group'} - Video Call</h3>
          <button
            onClick={endVideoCall}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            End Call
          </button>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              You
            </div>
          </div>

          {/* Remote Videos */}
          {participants.map((participant, index) => (
            <RemoteVideo
              key={participant.userId}
              stream={participant.stream}
              userId={participant.userId}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 flex justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A2 2 0 0018 13V7a1 1 0 00-1.447-.894l-2 1A1 1 0 0014 8v.879l-2-2V6a2 2 0 00-2-2H8.121L3.707 2.293zM2 6a2 2 0 012-2h.879L2 6.879V6z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            onClick={endVideoCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="End call"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </button>
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
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        User {userId}
      </div>
    </div>
  );
};

export default VideoCall;
