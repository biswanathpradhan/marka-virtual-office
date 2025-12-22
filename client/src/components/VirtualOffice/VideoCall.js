import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import Peer from 'simple-peer';
import Draggable from 'react-draggable';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaSyncAlt, FaDesktop, FaStop, FaCircle, FaPhone, FaTimes, FaWindowMinimize } from 'react-icons/fa';
import './VideoCall.css';

const VideoCall = ({ room, currentUser, localMediaState, onMediaToggle, usersWithVideo, onClose }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  console.log('VideoCall component rendered', {
    hasRoom: !!room,
    hasUser: !!user,
    hasSocket: !!socket,
    localMediaState,
    usersWithVideoSize: usersWithVideo?.size || 0
  });
  
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(localMediaState?.isVideoEnabled || false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(localMediaState?.isAudioEnabled || false);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' or 'environment'
  const [participantStreams, setParticipantStreams] = useState({});
  const [activeVideoUsers, setActiveVideoUsers] = useState(new Set());
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const localVideoRef = useRef(null);
  const peersRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const screenStreamRef = useRef(null);
  const videoRefs = useRef({});
  const localStreamRef = useRef(null); // Ref to track current stream for comparison

  // Initialize media stream when video/audio is enabled (only when stream doesn't exist or needs to be recreated)
  useEffect(() => {
    console.log('VideoCall: useEffect triggered', {
      hasSocket: !!socket,
      hasRoom: !!room,
      hasUser: !!user,
      isVideoEnabled: localMediaState?.isVideoEnabled,
      isAudioEnabled: localMediaState?.isAudioEnabled,
      hasLocalStream: !!localStream
    });
    
    if (!socket || !room || !user) {
      console.log('VideoCall: Missing dependencies, skipping media initialization', { socket: !!socket, room: !!room, user: !!user });
      return;
    }

    const videoEnabled = localMediaState?.isVideoEnabled || false;
    const audioEnabled = localMediaState?.isAudioEnabled || false;
    const hasAnyMedia = videoEnabled || audioEnabled;
    const currentStream = localStreamRef.current || localStream;
    const currentHasVideo = currentStream?.getVideoTracks().length > 0;
    const currentHasAudio = currentStream?.getAudioTracks().length > 0;

    // If we have a stream and just need to toggle tracks, don't reinitialize
    if (currentStream && hasAnyMedia) {
      const needsVideo = videoEnabled && !currentHasVideo;
      const needsAudio = audioEnabled && !currentHasAudio;
      
      // Only reinitialize if we need to add a track type that doesn't exist
      if (!needsVideo && !needsAudio) {
        console.log('VideoCall: Stream exists, just updating track states without reinitializing');
        // Just update track states
        if (currentStream.getVideoTracks().length > 0) {
          currentStream.getVideoTracks().forEach(track => {
            track.enabled = videoEnabled;
          });
        }
        if (currentStream.getAudioTracks().length > 0) {
          currentStream.getAudioTracks().forEach(track => {
            track.enabled = audioEnabled;
            // Note: track.muted is read-only, we can only control track.enabled
          });
        }
        setIsVideoEnabled(videoEnabled);
        setIsAudioEnabled(audioEnabled);
        
        // Update peer connections with enabled/disabled tracks
        peersRef.current.forEach(peerData => {
          if (peerData.peer && peerData.peer._pc) {
            const senders = peerData.peer._pc.getSenders();
            currentStream.getTracks().forEach(track => {
              const sender = senders.find(s => s.track && s.track.kind === track.kind);
              if (sender && sender.track) {
                sender.track.enabled = track.enabled;
              }
            });
          }
        });
        return;
      }
    }

    console.log('VideoCall: Media initialization effect triggered', {
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
      roomId: room?.id,
      userId: user?.id,
      needsReinit: !localStream || (hasAnyMedia && ((videoEnabled && !currentHasVideo) || (audioEnabled && !currentHasAudio)))
    });

    let isMounted = true;

    const initializeMedia = async () => {
      try {
        console.log('VideoCall: initializeMedia called', { videoEnabled, audioEnabled });
        
        // Stop existing stream first (use ref and state)
        const existingStream = localStreamRef.current || localStream;
        if (existingStream) {
          console.log('Stopping existing stream tracks');
          existingStream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.kind, track.id);
          });
          setLocalStream(null);
          localStreamRef.current = null;
        }
        
        // Also clean up video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        
        if (hasAnyMedia) {
          const constraints = {
            video: videoEnabled ? { facingMode: cameraFacing } : false,
            audio: audioEnabled ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } : false
          };

          console.log('Requesting media with constraints:', constraints);
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (!isMounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          
          setLocalStream(stream);
          localStreamRef.current = stream; // Update ref
          setIsVideoEnabled(videoEnabled);
          setIsAudioEnabled(audioEnabled);
          
          // Ensure audio tracks are enabled
          stream.getAudioTracks().forEach(track => {
            track.enabled = audioEnabled;
            console.log('Audio track configured:', { 
              id: track.id, 
              enabled: track.enabled, 
              muted: track.muted, // Read-only property
              readyState: track.readyState,
              settings: track.getSettings()
            });
          });
          
          // Ensure video tracks are enabled
          stream.getVideoTracks().forEach(track => {
            track.enabled = videoEnabled;
            console.log('Video track configured:', { 
              id: track.id, 
              enabled: track.enabled,
              readyState: track.readyState
            });
          });
          
          // Set stream to video element with a small delay to ensure element is ready
          setTimeout(() => {
            if (localVideoRef.current && isMounted) {
              localVideoRef.current.srcObject = stream;
              console.log('Set local video stream to element');
              
              // Ensure video plays
              localVideoRef.current.play().catch(err => {
                console.error('Error playing local video:', err);
              });
            }
          }, 100);

          // Update all existing peer connections with new stream
          peersRef.current.forEach(peerData => {
            if (peerData.peer && peerData.peer._pc) {
              const senders = peerData.peer._pc.getSenders();
              stream.getTracks().forEach(track => {
                const sender = senders.find(s => s.track && s.track.kind === track.kind);
                if (sender) {
                  sender.replaceTrack(track).catch(err => {
                    console.error('Error replacing track:', err);
                  });
                } else {
                  // Add new track if sender doesn't exist
                  peerData.peer.addTrack(track, stream);
                }
              });
            }
          });

          // Notify others in room
          socket.emit('user:media-started', {
            roomId: room.id.toString(),
            userId: user.id.toString(),
            isVideoEnabled: videoEnabled,
            isAudioEnabled: audioEnabled
          });
        } else {
          // Stop all tracks if both are disabled
          const existingStream = localStreamRef.current || localStream;
          if (existingStream) {
            existingStream.getTracks().forEach(track => track.stop());
          }
          setLocalStream(null);
          localStreamRef.current = null;
          setIsVideoEnabled(false);
          setIsAudioEnabled(false);
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
          
          socket.emit('user:media-stopped', {
            roomId: room.id.toString(),
            userId: user.id.toString()
          });
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          constraint: error.constraint
        });
        alert('Error accessing camera/microphone. Please check permissions: ' + error.message + '\n\nError name: ' + error.name);
      }
    };

    initializeMedia();
    
    return () => {
      isMounted = false;
      // Don't clean up stream here - it will be cleaned up when component unmounts or when both media are disabled
    };
  }, [socket, room, localMediaState?.isVideoEnabled, localMediaState?.isAudioEnabled, cameraFacing, user]);

  const createPeer = useCallback((userId, initiator) => {
    const streamToUse = localStreamRef.current || localStream;
    if (!streamToUse) {
      console.error('Cannot create peer: no local stream for user', userId);
      return null;
    }

    console.log('Creating peer connection:', { 
      userId, 
      initiator, 
      hasStream: !!streamToUse,
      streamTracks: streamToUse.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, id: t.id }))
    });

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: streamToUse,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (signalData) => {
      console.log('Peer signal:', { userId, initiator, signalType: initiator ? 'offer' : 'answer', signal: signalData });
      if (initiator) {
        socket.emit('call:offer', {
          targetUserId: userId.toString(),
          offer: signalData,
          roomId: room.id.toString()
        });
      } else {
        socket.emit('call:answer', {
          targetUserId: userId.toString(),
          answer: signalData
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received stream from user:', userId, 'Stream tracks:', remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      // Update participant streams state first
      setParticipantStreams(prev => ({
        ...prev,
        [userId]: remoteStream
      }));

      // Find participant ID from userId
      const participant = room?.participants?.find(p => {
        const pIdStr = p.id?.toString();
        const userIdStr = userId?.toString();
        return pIdStr === userIdStr;
      });
      const participantId = participant?.id || userId;
      
      // Handle video tracks
      const videoTracks = remoteStream.getVideoTracks();
      const audioTracks = remoteStream.getAudioTracks();
      
        if (videoTracks.length > 0) {
        const videoElement = videoRefs.current[participantId];
        if (videoElement) {
          videoElement.srcObject = remoteStream;
          videoElement.muted = false; // Ensure audio plays
          console.log('Set video stream to videoRef for user:', userId, 'participant:', participantId);
          videoElement.play().catch(err => {
            console.error('Error playing remote video:', err);
          });
        } else {
          // Use setTimeout to wait for DOM element to be created
          setTimeout(() => {
            const peerElement = document.getElementById(`peer-${participantId}`);
            if (peerElement) {
              peerElement.srcObject = remoteStream;
              peerElement.muted = false; // Ensure audio plays
              console.log('Set video stream to element for user:', userId, 'participant:', participantId);
              peerElement.play().catch(err => {
                console.error('Error playing remote video:', err);
              });
            } else {
              console.warn('No video element found for user:', userId, 'participant:', participantId, 'Will retry...');
              // Retry after a short delay
              setTimeout(() => {
                const retryElement = document.getElementById(`peer-${participantId}`);
                if (retryElement) {
                  retryElement.srcObject = remoteStream;
                  retryElement.muted = false; // Ensure audio plays
                  console.log('Set video stream to element for user (retry):', userId);
                  retryElement.play().catch(err => {
                    console.error('Error playing remote video:', err);
                  });
                }
              }, 500);
            }
          }, 100);
        }
      }
      
      // Handle audio tracks - ensure audio plays
      if (audioTracks.length > 0) {
        console.log('Received audio stream from user:', userId, 'Audio tracks:', audioTracks.length);
        audioTracks.forEach(track => {
          console.log('Audio track details:', {
            id: track.id,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            kind: track.kind
          });
          // Ensure audio track is enabled
          track.enabled = true;
          // Note: track.muted is read-only, we can only control track.enabled
          
          // Listen for track state changes
          track.onended = () => {
            console.log('Audio track ended for user:', userId);
          };
          track.onmute = () => {
            console.warn('Audio track muted for user:', userId);
          };
          track.onunmute = () => {
            console.log('Audio track unmuted for user:', userId);
          };
        });
        
        // Audio will be handled by the video element's audio track
        // If no video element exists, we need to ensure audio can play
        if (videoTracks.length === 0) {
          // Audio-only stream - ensure we have an element to play it
          setTimeout(() => {
            const videoElement = videoRefs.current[participantId] || document.getElementById(`peer-${participantId}`);
            if (videoElement) {
              videoElement.srcObject = remoteStream;
              videoElement.muted = false; // Ensure audio is not muted
              videoElement.volume = 1.0; // Ensure volume is at max
              videoElement.play().catch(err => {
                console.error('Error playing audio stream:', err);
              });
            }
          }, 100);
        } else {
          // Video + audio stream - ensure audio is not muted
          const videoElement = videoRefs.current[participantId] || document.getElementById(`peer-${participantId}`);
          if (videoElement) {
            videoElement.muted = false; // Ensure audio plays
            videoElement.volume = 1.0; // Ensure volume is at max
            console.log('Ensured video element is not muted for audio playback');
          }
        }
      }
    });

    peer.on('error', (err) => {
      console.error('Peer error for user', userId, ':', err);
    });

    peer.on('connect', () => {
      console.log('Peer connected for user:', userId);
    });

    peer.on('close', () => {
      console.log('Peer connection closed for user:', userId);
    });

    return peer;
  }, [socket, room, localStream]);

  const handleReceiveCall = useCallback((data) => {
    console.log('Receiving call offer from:', data.from, 'Offer:', data.offer);
    const streamToUse = localStreamRef.current || localStream;
    if (!streamToUse) {
      console.warn('Cannot receive call: no local stream, will retry...');
      // Retry after a short delay
      setTimeout(() => {
        const retryStream = localStreamRef.current || localStream;
        if (retryStream) {
          handleReceiveCall(data);
        }
      }, 500);
      return;
    }
    const userIdStr = data.from?.toString();
    
    // Check if peer already exists
    const existingPeer = peersRef.current.find(p => p.userId === userIdStr);
    if (existingPeer) {
      console.log('Peer already exists for user:', userIdStr);
      // If peer exists but offer is received, signal it anyway
      if (existingPeer.peer) {
        existingPeer.peer.signal(data.offer);
      }
      return;
    }
    
    const peer = createPeer(userIdStr, false);
    if (peer) {
      peer.signal(data.offer);
      peersRef.current.push({ peer, userId: userIdStr });
      setPeers(prev => {
        const exists = prev.some(p => p.userId === userIdStr);
        if (exists) return prev;
        return [...prev, { userId: userIdStr, user: data.user }];
      });
      console.log('Peer connection created (answer) for user:', userIdStr);
    }
  }, [localStream, createPeer]);

  const handleAnswer = useCallback((data) => {
    const userIdStr = data.from?.toString();
    const targetUserIdStr = data.targetUserId?.toString();
    const currentUserIdStr = user.id?.toString();
    
    // Only process if this answer is for the current user
    if (targetUserIdStr && targetUserIdStr !== currentUserIdStr) {
      return;
    }
    
    console.log('Receiving answer from:', userIdStr);
    const peerData = peersRef.current.find(p => p.userId === userIdStr);
    if (peerData && peerData.peer) {
      peerData.peer.signal(data.answer);
    }
  }, [user]);

  const handleIceCandidate = useCallback((data) => {
    const userIdStr = data.from?.toString();
    const targetUserIdStr = data.targetUserId?.toString();
    const currentUserIdStr = user.id?.toString();
    
    // Only process if this ICE candidate is for the current user
    if (targetUserIdStr && targetUserIdStr !== currentUserIdStr) {
      return;
    }
    
    console.log('Receiving ICE candidate from:', userIdStr);
    const peerData = peersRef.current.find(p => p.userId === userIdStr);
    if (peerData && peerData.peer && data.candidate) {
      peerData.peer.addIceCandidate(data.candidate);
    }
  }, [user]);

  // Update active video users from props
  useEffect(() => {
    if (usersWithVideo) {
      setActiveVideoUsers(new Set(usersWithVideo));
    }
  }, [usersWithVideo]);

  // Socket event listeners for peer connections
  useEffect(() => {
    if (!socket || !room || !user) return;

    // Listen for other users starting media
    const handleUserMediaStarted = (data) => {
      console.log('User media started:', data);
      const userIdStr = data.userId?.toString();
      const currentUserIdStr = user.id?.toString();
      
      if (userIdStr !== currentUserIdStr) {
        if (data.isVideoEnabled) {
          setActiveVideoUsers(prev => {
            const newSet = new Set(prev);
            newSet.add(userIdStr);
            return newSet;
          });
        }
        // Create peer connection if we have local stream (for both video and audio)
        // Wait a bit for localStream to be ready if it's not yet
        const tryCreatePeer = () => {
          const streamToUse = localStreamRef.current || localStream;
          if (streamToUse && (data.isVideoEnabled || data.isAudioEnabled)) {
            console.log('Creating peer for user:', userIdStr, 'Video:', data.isVideoEnabled, 'Audio:', data.isAudioEnabled, 'HasLocalStream:', !!streamToUse);
            // Check if peer already exists
            const existingPeer = peersRef.current.find(p => p.userId === userIdStr);
            if (!existingPeer) {
              const peer = createPeer(userIdStr, true);
              if (peer) {
                peersRef.current.push({ peer, userId: userIdStr });
                setPeers(prev => {
                  const exists = prev.some(p => p.userId === userIdStr);
                  if (exists) return prev;
                  return [...prev, { userId: userIdStr, user: data.user }];
                });
                console.log('Peer connection created for user:', userIdStr);
              }
            } else {
              console.log('Peer already exists for user:', userIdStr);
            }
          } else if (!streamToUse) {
            // Retry after a short delay if localStream isn't ready yet
            console.log('Local stream not ready, retrying in 500ms...');
            setTimeout(tryCreatePeer, 500);
          }
        };
        
        tryCreatePeer();
      }
    };

    const handleUserMediaStopped = (data) => {
      const userIdStr = data.userId?.toString();
      const currentUserIdStr = user.id?.toString();
      
      if (userIdStr !== currentUserIdStr) {
        setActiveVideoUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userIdStr);
          return newSet;
        });
        // Clean up peer connections
        const peerData = peersRef.current.find(p => p.userId === userIdStr);
        if (peerData) {
          try {
            if (peerData.peer && peerData.peer.destroy) {
              peerData.peer.destroy();
            }
          } catch (err) {
            console.error('Error destroying peer:', err);
          }
          peersRef.current = peersRef.current.filter(p => p.userId !== userIdStr);
          setPeers(prev => prev.filter(p => p.userId !== userIdStr));
          // Remove from participant streams
          setParticipantStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[userIdStr];
            return newStreams;
          });
        }
      }
    };

    const handleMediaToggled = (data) => {
      const userIdStr = data.userId?.toString();
      const currentUserIdStr = user.id?.toString();
      
      if (data.type === 'video' && userIdStr !== currentUserIdStr) {
        setActiveVideoUsers(prev => {
          const newSet = new Set(prev);
          if (data.enabled) {
            newSet.add(userIdStr);
            // Create peer connection if local stream exists
            if (localStream) {
              console.log('Creating peer for toggled video user:', userIdStr);
              // Check if peer already exists
              const existingPeer = peersRef.current.find(p => p.userId === userIdStr);
              if (!existingPeer) {
                const peer = createPeer(userIdStr, true);
                if (peer) {
                  peersRef.current.push({ peer, userId: userIdStr });
                  setPeers(prev => {
                    const exists = prev.some(p => p.userId === userIdStr);
                    if (exists) return prev;
                    return [...prev, { userId: userIdStr, user: data.user }];
                  });
                }
              }
            }
          } else {
            newSet.delete(userIdStr);
            const peerData = peersRef.current.find(p => p.userId === userIdStr);
            if (peerData) {
              peerData.peer.destroy();
              peersRef.current = peersRef.current.filter(p => p.userId !== userIdStr);
              setPeers(prev => prev.filter(p => p.userId !== userIdStr));
            }
          }
          return newSet;
        });
      }
    };

    const handleOffer = (data) => {
      // Only process if this offer is for the current user
      const currentUserIdStr = user.id?.toString();
      const targetUserIdStr = data.targetUserId?.toString();
      if (targetUserIdStr === currentUserIdStr || !targetUserIdStr) {
        handleReceiveCall(data);
      }
    };

    socket.on('user:media-started', handleUserMediaStarted);
    socket.on('user:media-stopped', handleUserMediaStopped);
    socket.on('call:media-toggled', handleMediaToggled);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('user:media-started', handleUserMediaStarted);
      socket.off('user:media-stopped', handleUserMediaStopped);
      socket.off('call:media-toggled', handleMediaToggled);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
    };
  }, [socket, room, user, localStream, createPeer, handleReceiveCall, handleAnswer, handleIceCandidate]);

  const toggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    
    // Update local stream tracks immediately
    const currentStream = localStreamRef.current || localStream;
    if (currentStream) {
      currentStream.getVideoTracks().forEach(track => {
        track.enabled = newState;
        console.log('Video track enabled:', newState, 'track:', track.id);
      });
      
      // Update peer connections - replace video track
      peersRef.current.forEach(peerData => {
        if (peerData.peer && peerData.peer._pc) {
          const senders = peerData.peer._pc.getSenders();
          currentStream.getVideoTracks().forEach(track => {
            const sender = senders.find(s => s.track && s.track.kind === 'video');
            if (sender) {
              // Update track enabled state
              if (sender.track) {
                sender.track.enabled = newState;
              }
              // Replace track to ensure it's sent
              sender.replaceTrack(track).catch(err => {
                console.error('Error replacing video track in peer:', err);
              });
            }
          });
        }
      });
    }
    
    if (onMediaToggle) {
      onMediaToggle('video', newState);
    }
    if (socket && room) {
      socket.emit('user:media-toggle', {
        roomId: room.id.toString(),
        type: 'video',
        enabled: newState
      });
    }
  };

  const toggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    
    // Update local stream tracks immediately
    const currentStream = localStreamRef.current || localStream;
    if (currentStream) {
      currentStream.getAudioTracks().forEach(track => {
        track.enabled = newState;
        // Note: track.muted is read-only, we can only control track.enabled
        console.log('Audio track toggled:', { 
          enabled: newState, 
          muted: track.muted, // Read-only property
          trackId: track.id,
          readyState: track.readyState
        });
      });
      
      // Update peer connections - replace audio track
      peersRef.current.forEach(peerData => {
        if (peerData.peer && peerData.peer._pc) {
          const senders = peerData.peer._pc.getSenders();
          currentStream.getAudioTracks().forEach(track => {
            const sender = senders.find(s => s.track && s.track.kind === 'audio');
            if (sender) {
              // Update track enabled state
              if (sender.track) {
                sender.track.enabled = newState;
              }
              // Replace track to ensure it's sent
              sender.replaceTrack(track).catch(err => {
                console.error('Error replacing audio track in peer:', err);
              });
            }
          });
        }
      });
    }
    
    if (onMediaToggle) {
      onMediaToggle('audio', newState);
    }
    if (socket && room) {
      socket.emit('user:media-toggle', {
        roomId: room.id.toString(),
        type: 'audio',
        enabled: newState
      });
    }
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);

    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacing },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        // Replace video track in existing stream
        const newVideoTrack = newStream.getVideoTracks()[0];
        peersRef.current.forEach(peerData => {
          if (peerData.peer._pc) {
            const senders = peerData.peer._pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(newVideoTrack);
            }
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }

        setLocalStream(newStream);
        newStream.getAudioTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!localStream) return;

    const chunks = [];
    recordedChunksRef.current = chunks;

    const mediaRecorder = new MediaRecorder(localStream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        screenStreamRef.current = screenStream;

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peersRef.current.forEach(peerData => {
          if (peerData.peer._pc) {
            const senders = peerData.peer._pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(videoTrack);
            }
          }
        });

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Handle screen share end
        videoTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Get camera stream back
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        peersRef.current.forEach(peerData => {
          if (peerData.peer._pc) {
            const senders = peerData.peer._pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(videoTrack);
            }
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
    }

    setIsScreenSharing(false);
  };

  const handleDrag = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  // Calculate bounds for dragging
  const getBounds = () => {
    const panelWidth = 800;
    const panelHeight = isMinimized ? 60 : 600;
    return {
      left: 0,
      top: 0,
      right: Math.max(0, window.innerWidth - panelWidth),
      bottom: Math.max(0, window.innerHeight - panelHeight)
    };
  };

  return (
    <Draggable
      handle=".video-panel-header"
      position={position}
      onDrag={handleDrag}
      bounds={getBounds()}
    >
      <div className={`video-call-overlay ${isMinimized ? 'minimized' : ''}`}>
        <div className="video-panel-header">
          <span className="video-panel-title">Video Call</span>
          <div className="video-panel-controls">
            <button
              className="panel-control-btn"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              <FaWindowMinimize />
            </button>
            {onClose && (
              <button
                className="panel-control-btn close-btn"
                onClick={onClose}
                title="Close"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
        {!isMinimized && (
          <div className="video-call-container">
            <div className="video-grid">
          {/* Local video/audio - show if video is enabled or if we have a local stream with audio */}
          {(isVideoEnabled || (localStream && isAudioEnabled)) && (
            <div className="video-item local-video">
              {isVideoEnabled && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="peer-video"
                  onLoadedMetadata={() => {
                    console.log('Local video metadata loaded, stream:', localVideoRef.current?.srcObject);
                    if (localVideoRef.current) {
                      localVideoRef.current.play().catch(err => {
                        console.error('Error playing local video after metadata:', err);
                      });
                    }
                  }}
                  onCanPlay={() => {
                    console.log('Local video can play');
                    if (localVideoRef.current) {
                      localVideoRef.current.play().catch(err => {
                        console.error('Error playing local video:', err);
                      });
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : isAudioEnabled && localStream ? (
                <div className="audio-only-indicator">
                  <div className="avatar-initial-large">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="audio-wave">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              ) : (
                <div className="video-placeholder">
                  <div className="avatar-initial">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>Initializing...</p>
                </div>
              )}
              <div className="video-label">
                You {!isVideoEnabled && isAudioEnabled && '(Audio Only)'}
                {isVideoEnabled && !isAudioEnabled && '(Video Only)'}
              </div>
            </div>
          )}

          {/* Remote videos - show all room participants with media enabled (excluding current user) */}
          {room.participants
            .filter(participant => {
              const participantIdStr = participant.id?.toString();
              const currentUserIdStr = user?.id?.toString();
              // Exclude current user (they have their own panel)
              return participantIdStr !== currentUserIdStr;
            })
            .map((participant) => {
              const participantIdStr = participant.id?.toString();
              // Check if this participant has media enabled (video or audio)
              const hasMedia = usersWithVideo?.has(participantIdStr) || 
                              participantStreams[participant.id]?.getAudioTracks().length > 0 ||
                              participantStreams[participant.id]?.getVideoTracks().length > 0;
              
              // Only show if they have media enabled or we have a stream for them
              if (!hasMedia && !participantStreams[participant.id]) {
                return null;
              }
            
              // Find peer data if connection exists
              const peerData = peers.find(p => {
                const pIdStr = p.userId?.toString();
                return pIdStr === participantIdStr;
              });
              
              return (
                <div key={participant.id} className="video-item">
                  {participantStreams[participant.id]?.getVideoTracks().length > 0 ? (
                  <video
                    ref={el => {
                      if (el) {
                        videoRefs.current[participant.id] = el;
                      }
                    }}
                    id={`peer-${participant.id}`}
                    autoPlay
                    playsInline
                    muted={false}
                    className="peer-video"
                    onLoadedMetadata={() => {
                      const videoEl = document.getElementById(`peer-${participant.id}`);
                      if (videoEl && videoEl.srcObject) {
                        console.log('Remote video metadata loaded for', participant.name);
                        videoEl.muted = false; // Ensure audio plays
                        videoEl.volume = 1.0; // Ensure volume is at max
                        const audioTracks = videoEl.srcObject?.getAudioTracks() || [];
                        audioTracks.forEach(track => {
                          track.enabled = true;
                          // Note: track.muted is read-only
                          console.log('Enabled audio track for', participant.name, track.id);
                        });
                        videoEl.play().catch(err => {
                          console.error('Error playing remote video:', err);
                        });
                      }
                    }}
                    onCanPlay={() => {
                      const videoEl = document.getElementById(`peer-${participant.id}`);
                      if (videoEl) {
                        videoEl.muted = false; // Ensure audio plays
                        videoEl.volume = 1.0; // Ensure volume is at max
                        const audioTracks = videoEl.srcObject?.getAudioTracks() || [];
                        audioTracks.forEach(track => {
                          track.enabled = true;
                          // Note: track.muted is read-only
                        });
                        videoEl.play().catch(err => {
                          console.error('Error playing remote video (canplay):', err);
                        });
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }}
                  />
                ) : participantStreams[participant.id]?.getAudioTracks().length > 0 ? (
                  <div className="audio-only-indicator">
                    <div className="avatar-initial-large">
                      {(peerData?.user?.name || participant.name)?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="audio-wave">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                ) : (
                  <div className="video-placeholder">
                    <div className="avatar-initial">
                      {(peerData?.user?.name || participant.name)?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>Connecting...</p>
                  </div>
                )}
                  <div className="video-label">
                    {peerData?.user?.name || participant.name || `User`}
                    {participantStreams[participant.id]?.getVideoTracks().length === 0 && 
                     participantStreams[participant.id]?.getAudioTracks().length > 0 && 
                     ' (Audio Only)'}
                    {!participantStreams[participant.id] && hasMedia && ' (Connecting...)'}
                  </div>
                </div>
              );
            })
            .filter(Boolean) // Remove null entries
          }
          
          {(!isVideoEnabled && !isAudioEnabled && peers.length === 0) && (
            <div className="no-videos-message">
              <p>No active media streams</p>
              <p style={{ fontSize: '14px', color: '#999' }}>Turn on your camera or microphone to start</p>
            </div>
          )}
        </div>

        <div className="call-controls">
          <button
            className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
            onClick={toggleAudio}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <FaMicrophone size={16} /> : <FaMicrophoneSlash size={16} />}
          </button>
          <button
            className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <FaVideo size={16} /> : <FaVideoSlash size={16} />}
          </button>
          <button
            className="control-btn"
            onClick={switchCamera}
            title="Switch camera"
          >
            <FaSyncAlt size={16} />
          </button>
          <button
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <FaDesktop size={16} />
          </button>
          <button
            className={`control-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <FaStop size={16} /> : <FaCircle size={16} />}
          </button>
        </div>
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default VideoCall;


