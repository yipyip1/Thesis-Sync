import React, { useState, useEffect, useRef } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';
import socketService from '../utils/socketService';
import { v4 as uuidv4 } from 'uuid';

const VideoCall = ({ group, user, incomingCallId, onClose, isAcceptedCall = false }) => {
  console.log('🎯 VideoCall component props:', {
    groupId: group?._id,
    userId: user?.userId || user?.id,
    incomingCallId: typeof incomingCallId === 'string' ? incomingCallId : 'invalid',
    incomingCallIdType: typeof incomingCallId,
    isAcceptedCall: isAcceptedCall,
    hasOnClose: !!onClose
  });

  // Safety check - ensure incomingCallId is a string or null
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

  // Add safety check for group prop
  if (!group || !user) {
    console.error('VideoCall: Missing required props', { group, user });
    return null;
  }

  // Helper functions first
  const cleanup = React.useCallback(() => {
    console.log('Cleaning up video call resources');
    // Stop local stream
    if (localStreamRef.current) {
      console.log('Stopping local stream tracks');
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    // Close all peer connections
    console.log('Destroying', peersRef.current.length, 'peer connections');
    peersRef.current.forEach(({ peer, peerId }) => {
      if (peer) {
        console.log('Destroying peer:', peerId);
        peer.destroy();
      }
    });
    peersRef.current = [];
    
    setLocalStream(null);
    setParticipants([]);
    console.log('Cleanup completed');
  }, []);

  // Create a peer as initiator (for new joiner to existing participants)
  const createPeer = React.useCallback((userToCall, stream) => {
    console.log('=== Creating initiator peer ===');
    console.log('Target user:', userToCall);
    console.log('Stream tracks:', stream?.getTracks().map(t => t.kind));
    console.log('Call ID:', callId);
    
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });
    
    peer.on('signal', signal => {
      console.log('📤 Sending offer signal to:', userToCall);
      console.log('Offer signal type:', signal.type);
      socketService.sendVideoSignal(callId, userToCall, signal, 'offer');
    });
    
    peer.on('stream', remoteStream => {
      console.log('📺 Received remote stream from peer:', userToCall);
      console.log('Remote stream tracks:', remoteStream.getTracks().map(t => t.kind));
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === userToCall);
        if (existing) {
          console.log('Updating existing participant stream');
          existing.stream = remoteStream;
          return [...prev];
        }
        console.log('Adding new participant with stream');
        return [...prev, { userId: userToCall, stream: remoteStream }];
      });
    });
    
    peer.on('close', () => {
      console.log('❌ Peer connection closed for:', userToCall);
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
      setParticipants(prev => prev.filter(p => p.userId !== userToCall));
    });
    
    peer.on('error', (err) => {
      console.error('💥 Peer error for:', userToCall, err);
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
      setParticipants(prev => prev.filter(p => p.userId !== userToCall));
    });
    
    peer.on('connect', () => {
      console.log('✅ Peer connected to:', userToCall);
    });
    
    console.log('✨ Initiator peer created for:', userToCall);
    return peer;
  }, [callId]);

  // Add a peer as non-initiator (for existing participants when new user joins)
  const addPeer = React.useCallback((incomingSignal, callerSocketId, stream) => {
    console.log('=== Creating non-initiator peer ===');
    console.log('From caller:', callerSocketId);
    console.log('Stream tracks:', stream?.getTracks().map(t => t.kind));
    console.log('Incoming signal type:', incomingSignal.type);
    
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });
    
    peer.on('signal', signal => {
      console.log('📤 Sending answer signal to:', callerSocketId);
      console.log('Answer signal type:', signal.type);
      socketService.sendVideoSignal(callId, callerSocketId, signal, 'answer');
    });
    
    peer.on('stream', remoteStream => {
      console.log('📺 Received remote stream from caller:', callerSocketId);
      console.log('Remote stream tracks:', remoteStream.getTracks().map(t => t.kind));
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === callerSocketId);
        if (existing) {
          console.log('Updating existing caller stream');
          existing.stream = remoteStream;
          return [...prev];
        }
        console.log('Adding new caller with stream');
        return [...prev, { userId: callerSocketId, stream: remoteStream }];
      });
    });
    
    peer.on('close', () => {
      console.log('❌ Peer connection closed for caller:', callerSocketId);
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
      setParticipants(prev => prev.filter(p => p.userId !== callerSocketId));
    });
    
    peer.on('error', (err) => {
      console.error('💥 Peer error for caller:', callerSocketId, err);
      peersRef.current = peersRef.current.filter(p => p.peer !== peer);
      setParticipants(prev => prev.filter(p => p.userId !== callerSocketId));
    });
    
    peer.on('connect', () => {
      console.log('✅ Peer connected to caller:', callerSocketId);
    });
    
    // Signal the incoming offer
    console.log('🔄 Signaling incoming offer to non-initiator peer');
    peer.signal(incomingSignal);
    
    console.log('✨ Non-initiator peer created for:', callerSocketId);
    return peer;
  }, [callId]);

  // Video call functions
  const startVideoCall = React.useCallback(async () => {
    try {
      console.log('=== Starting video call ===');
      console.log('Requesting media access...');
      
      // Check if we have permission first
      if (navigator.permissions) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' });
          const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
          console.log('Camera permission:', cameraPermission.state);
          console.log('Microphone permission:', microphonePermission.state);
        } catch (permErr) {
          console.log('Could not check permissions:', permErr);
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      console.log('Got local media stream with tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Wait for next render cycle to ensure ref is available
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('Set local video source');
          // Force play
          localVideoRef.current.play().catch(e => {
            console.log('Local video autoplay prevented:', e);
          });
        }
      }, 100);

      const newCallId = uuidv4();
      setCallId(newCallId);
      setIsCallActive(true);

      console.log('Starting call with ID:', newCallId);
      console.log('🚀 Group ID:', group._id);
      console.log('🚀 Socket ID:', socketService.getSocket()?.id);
      console.log('🚀 Socket connected:', socketService.getSocket()?.connected);
      // Emit start call event
      if (group?._id) {
        socketService.startVideoCall(group._id, newCallId);
      }
      
    } catch (error) {
      console.error('Error starting video call:', error);
      let errorMessage = 'Could not access camera/microphone. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera and microphone permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found on your device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera or microphone is being used by another application.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  }, [group]);

  const joinVideoCall = React.useCallback(async (incomingCallId) => {
    try {
      console.log('=== Joining video call ===');
      console.log('Call ID:', incomingCallId);
      console.log('Requesting media access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      console.log('Got local media stream for joining with tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Set call state first
      setCallId(incomingCallId);
      setIsCallActive(true);
      
      // Wait for next render cycle to ensure ref is available
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('Set local video source for joiner');
          // Force play
          localVideoRef.current.play().catch(e => {
            console.log('Local video autoplay prevented for joiner:', e);
          });
        }
      }, 100);

      console.log('Joining call with group ID:', group._id);
      // Join the call - wait a bit to ensure local stream is ready
      setTimeout(() => {
        if (group?._id) {
          console.log('🚀 Emitting join-video-call event');
          console.log('🚀 Call ID:', incomingCallId);
          console.log('🚀 Group ID:', group._id);
          console.log('🚀 Socket ID:', socketService.getSocket()?.id);
          console.log('🚀 Socket connected:', socketService.getSocket()?.connected);
          socketService.joinVideoCall(incomingCallId, group._id);
        }
      }, 200);
      
    } catch (error) {
      console.error('Error joining video call:', error);
      let errorMessage = 'Could not access camera/microphone. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera and microphone permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera or microphone found on your device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera or microphone is being used by another application.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  }, [group]);

  const endVideoCall = React.useCallback(() => {
    if (callId && group?._id) {
      socketService.endVideoCall(callId, group._id);
    }
    cleanup();
    setIsCallActive(false);
    setCallId(null);
    onClose();
  }, [callId, group, cleanup, onClose]);

  const toggleVideo = React.useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video toggled:', videoTrack.enabled);
      }
    }
  }, []);

  const toggleAudio = React.useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio toggled:', audioTrack.enabled);
      }
    }
  }, []);

  // Socket event handlers
  const handleUserJoinedCall = React.useCallback(({ userId, username, socketId }) => {
    console.log('User joined call:', { userId, username, socketId });
    if (userId !== user.userId && localStreamRef.current) {
      const mySocketId = socketService.getSocket()?.id;
      // Only existing participants with "higher" socket ID should initiate to new joiners
      const shouldInitiate = mySocketId > socketId;
      console.log('Should I initiate to new joiner', socketId, '?', shouldInitiate, 'My ID:', mySocketId);
      
      if (shouldInitiate) {
        let existing = peersRef.current.find(p => p.peerId === socketId);
        if (!existing) {
          console.log('Creating initiator peer for new joiner:', socketId);
          const peer = createPeer(socketId, localStreamRef.current);
          peersRef.current.push({ peerId: socketId, peer });
        }
      } else {
        console.log('Not initiating - new joiner will initiate to me');
      }
    }
  }, [user.userId, createPeer]);

  const handleUserLeftCall = React.useCallback(({ socketId }) => {
    console.log('User left call:', socketId);
    const peerObj = peersRef.current.find(p => p.peerId === socketId);
    if (peerObj) {
      console.log('Destroying peer for user who left:', socketId);
      peerObj.peer.destroy();
      peersRef.current = peersRef.current.filter(p => p.peerId !== socketId);
      setParticipants(prev => {
        const filtered = prev.filter(p => p.userId !== socketId);
        console.log('Participants after user left:', filtered.length);
        return filtered;
      });
    }
  }, []);

  const handleVideoCallEnded = React.useCallback(() => {
    cleanup();
    setIsCallActive(false);
    setCallId(null);
    onClose();
  }, [cleanup, onClose]);

  const handleVideoSignal = React.useCallback(({ fromSocketId, signal, type }) => {
    console.log('🎯 Received video signal:', { fromSocketId, type, signalType: signal?.type });
    console.log('Current peers:', peersRef.current.map(p => p.peerId));
    console.log('Local stream available:', !!localStreamRef.current);
    
    if (type === 'offer') {
      // Check if we already have a peer for this socket
      let existing = peersRef.current.find(p => p.peerId === fromSocketId);
      if (!existing) {
        console.log('📥 Creating non-initiator peer for offer from:', fromSocketId);
        if (localStreamRef.current) {
          const peer = addPeer(signal, fromSocketId, localStreamRef.current);
          peersRef.current.push({ peerId: fromSocketId, peer });
          console.log('✅ Added peer to peersRef, total peers:', peersRef.current.length);
        } else {
          console.error('❌ No local stream available for creating peer');
        }
      } else {
        // If peer already exists, check if it's in the right state to receive an offer
        console.log('⚠️ Peer already exists for:', fromSocketId, 'current state:', existing.peer.signalingState);
        if (existing.peer.signalingState === 'stable' || existing.peer.signalingState === 'have-local-offer') {
          console.log('🔄 Signaling existing peer with offer');
          try {
            existing.peer.signal(signal);
          } catch (error) {
            console.error('❌ Error signaling existing peer:', error);
            // Remove the problematic peer and create a new one
            existing.peer.destroy();
            peersRef.current = peersRef.current.filter(p => p.peerId !== fromSocketId);
            const peer = addPeer(signal, fromSocketId, localStreamRef.current);
            peersRef.current.push({ peerId: fromSocketId, peer });
          }
        } else {
          console.log('⚠️ Peer in wrong state for offer, ignoring');
        }
      }
    } else if (type === 'answer') {
      console.log('📥 Processing answer from:', fromSocketId);
      const item = peersRef.current.find(p => p.peerId === fromSocketId);
      if (item) {
        console.log('✅ Found peer for answer, signaling. Current state:', item.peer.signalingState);
        try {
          item.peer.signal(signal);
        } catch (error) {
          console.error('❌ Error signaling answer:', error);
        }
      } else {
        console.error('❌ No peer found for answer from:', fromSocketId);
        console.log('Available peers:', peersRef.current.map(p => p.peerId));
      }
    }
  }, [addPeer]);

  const handleExistingParticipants = React.useCallback((participants) => {
    console.log('Received existing participants:', participants);
    console.log('Current socket ID:', socketService.getSocket()?.id);
    console.log('Local stream available:', !!localStreamRef.current);
    
    // Add a small delay to ensure local stream is set
    const processParticipants = () => {
      participants.forEach((participant) => {
        const socket = socketService.getSocket();
        console.log('Processing participant:', participant.socketId, 'vs my socket:', socket?.id);
        
        if (participant.socketId !== socket?.id && localStreamRef.current) {
          // Only create peer if my socket ID is "greater" to avoid race conditions
          const shouldInitiate = socket?.id > participant.socketId;
          console.log('Should I initiate to', participant.socketId, '?', shouldInitiate);
          
          if (shouldInitiate) {
            console.log('Creating peer for existing participant:', participant.socketId);
            // Prevent duplicate peers
            let existing = peersRef.current.find(p => p.peerId === participant.socketId);
            if (!existing) {
              console.log('No existing peer found, creating new one');
              const peer = createPeer(participant.socketId, localStreamRef.current);
              peersRef.current.push({ peerId: participant.socketId, peer });
            } else {
              console.log('Peer already exists for participant:', participant.socketId);
            }
          } else {
            console.log('Not initiating - waiting for peer', participant.socketId, 'to initiate to me');
          }
        } else {
          console.log('Skipping participant:', {
            socketId: participant.socketId,
            isSameSocket: participant.socketId === socket?.id,
            hasStream: !!localStreamRef.current
          });
        }
      });
    };

    // If no local stream yet, wait a bit
    if (!localStreamRef.current) {
      console.log('No local stream yet, waiting 300ms');
      setTimeout(processParticipants, 300);
    } else {
      processParticipants();
    }
  }, [createPeer]);

  // Auto-join if there's an incoming call ID - with immediate execution
  useEffect(() => {
    console.log('🎯 Auto-join useEffect triggered:', {
      safeIncomingCallId,
      isCallActive,
      shouldJoin: safeIncomingCallId && !isCallActive
    });
    
    if (safeIncomingCallId && !isCallActive) {
      console.log('✅ Auto-joining incoming call immediately:', safeIncomingCallId);
      
      // Set the call as active immediately to prevent multiple joins
      setCallId(safeIncomingCallId);
      setIsCallActive(true);
      
      // Start the join process
      const joinCall = async () => {
        try {
          console.log('🔄 Starting media access for join...');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });

          console.log('✅ Got media stream, setting up call...');
          setLocalStream(stream);
          localStreamRef.current = stream;
          
          // Set video source
          setTimeout(() => {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              console.log('✅ Set local video source for joiner');
            }
          }, 100);

          console.log('📡 Emitting join-video-call event...');
          // Join the call
          if (group?._id) {
            socketService.joinVideoCall(safeIncomingCallId, group._id);
            console.log('✅ Join video call event emitted');
          }
          
        } catch (error) {
          console.error('❌ Error joining video call:', error);
          // Reset state on error
          setIsCallActive(false);
          setCallId(null);
          alert('Could not access camera/microphone. Please check permissions.');
        }
      };
      
      joinCall();
    } else {
      console.log('❌ Not auto-joining because:', {
        noIncomingCallId: !safeIncomingCallId,
        callAlreadyActive: isCallActive
      });
    }
  }, [safeIncomingCallId, group]);

  // Immediate join on mount if incoming call ID exists
  useEffect(() => {
    if (safeIncomingCallId) {
      console.log('🎯 Component mounted with safeIncomingCallId:', safeIncomingCallId);
      console.log('🎯 Will auto-join when joinVideoCall is ready');
    }
  }, []); // Only run on mount

  // Socket events setup
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      console.log('🔌 Setting up socket listeners, socket ID:', socket.id);
      console.log('🔌 Socket connected:', socket.connected);
      
      // Listen for video call events (excluding video-call-started which is handled by ChatWindow)
      socket.on('user-joined-call', handleUserJoinedCall);
      socket.on('user-left-call', handleUserLeftCall);
      socket.on('video-call-ended', handleVideoCallEnded);
      socket.on('video-signal', handleVideoSignal);
      socket.on('existing-participants', handleExistingParticipants);
    } else {
      console.warn('⚠️ No socket available for setting up video call listeners');
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

  // Effect to update video element when local stream changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('Setting video source object:', localStream.getTracks().map(t => t.kind));
      localVideoRef.current.srcObject = localStream;
      
      // Add event listeners for debugging
      const video = localVideoRef.current;
      
      const handleLoadedMetadata = () => {
        console.log('Local video metadata loaded');
      };
      
      const handleCanPlay = () => {
        console.log('Local video can play');
        // Ensure video plays
        video.play().catch(e => console.log('Local video autoplay prevented:', e));
      };
      
      const handleError = (e) => {
        console.error('Local video error:', e);
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      
      return () => {
        if (video) {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
        }
      };
    }
  }, [localStream]);

  return (
    !isCallActive ? (
      incomingCallId ? (
        // Joining call automatically
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Joining Video Call</h3>
            <p className="text-gray-600 mb-6">
              Joining video call for {group?.name || 'group'}...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          </div>
        </div>
      ) : (
        // Start new call modal
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
      )
    ) : (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{group?.name || 'Group'} - Video Call</h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              📹 {participants.length + 1} participant{participants.length === 0 ? '' : 's'}
            </div>
            <button
              onClick={endVideoCall}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              End Call
            </button>
          </div>
        </div>

        {/* Instructions for users */}
        {participants.length === 0 && (
          <div className="bg-blue-600 text-white p-3 text-center">
            <p className="text-sm">
              🚀 Waiting for others to join... Make sure all participants:
              <br />
              ✅ Allow camera & microphone permissions 
              ✅ Stay on this page 
              ✅ Check browser notifications
            </p>
          </div>
        )}

        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Debug Info */}
          <div className="absolute top-20 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-10 max-w-sm">
            <div>Call ID: {callId}</div>
            <div>Incoming ID: {safeIncomingCallId || 'None'}</div>
            <div>Participants: {participants.length}</div>
            <div>Peers: {peersRef.current?.length || 0}</div>
            <div>Local Stream: {localStream ? 'Yes' : 'No'}</div>
            {localStream && (
              <div>Local tracks: {localStream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', ')}</div>
            )}
            <div className="mt-2">Participants:</div>
            {participants.map((p, i) => (
              <div key={i} className="ml-2">
                {p.userId}: {p.stream ? 'Has Stream' : 'No Stream'}
                {p.stream && (
                  <div className="ml-2 text-green-400">
                    {p.stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
          
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
          {participants.map((participant, index) => {
            const hasStream = !!participant.stream;
            console.log('Rendering participant:', participant.userId, 'has stream:', hasStream);
            return (
              <RemoteVideo
                key={participant.userId}
                stream={participant.stream}
                userId={participant.userId}
              />
            );
          })}
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
    console.log('🎬 RemoteVideo useEffect for user:', userId, 'stream:', !!stream);
    if (videoRef.current && stream) {
      console.log('Setting stream for remote video:', userId);
      console.log('Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      
      videoRef.current.srcObject = stream;
      
      // Add event listeners for debugging
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        console.log('🎬 Remote video metadata loaded for:', userId);
        console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      };
      
      const handleCanPlay = () => {
        console.log('🎬 Remote video can play for:', userId);
        // Ensure video plays
        video.play().catch(e => console.log('Remote video autoplay prevented for', userId, ':', e));
      };
      
      const handleError = (e) => {
        console.error('🎬 Remote video error for:', userId, e);
      };

      const handlePlaying = () => {
        console.log('🎬 Remote video is playing for:', userId);
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      video.addEventListener('playing', handlePlaying);
      
      return () => {
        if (video) {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
          video.removeEventListener('playing', handlePlaying);
        }
      };
    } else {
      console.log('🎬 RemoteVideo: No video ref or stream for user:', userId);
    }
  }, [stream, userId]);

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
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-red-600 text-white px-1 py-0.5 rounded text-xs">
        {stream ? '🔴 Live' : '⚫ No Stream'}
      </div>
    </div>
  );
};

export default VideoCall;
