import {
    MessageSquare,
    Mic,
    MicOff,
    Monitor,
    PhoneOff,
    Settings,
    Users,
    Video,
    VideoOff
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import SimplePeer from 'simple-peer';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

const VideoCallPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allParticipants, setAllParticipants] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [otherParticipant, setOtherParticipant] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
  }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null); // For one-on-one calls
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map()); // For group calls
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRefs = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const peerRef = useRef<SimplePeer.Instance | null>(null); // Keep for backward compatibility during transition
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const isCallerRef = useRef(false);
  const isCallActiveRef = useRef(false);
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    // Clean up any existing streams from previous sessions on mount
    const cleanupExistingStreams = async () => {
      try {
        // Clean up existing streams
        
        // Try to get user media with constraints to see if anything is already active
        // If this fails, we'll handle it in initializeCall
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
      } catch (error) {
        // Ignore errors during cleanup
        console.log('Cleanup check:', error);
      }
    };

    cleanupExistingStreams();
    fetchParticipantInfo();
  }, []);

  // Track if call is active (has peer connection or participants)
  useEffect(() => {
    const isActive = peerRef.current !== null || participants.length > 0;
    isCallActiveRef.current = isActive;
  }, [participants.length]);

  // Mark attendance when mentee successfully connects to a session
  // Only mark when mentee has actually joined (has local stream and peer connection established)
  useEffect(() => {
    let delayTimer: NodeJS.Timeout | null = null;

    if (
      sessionId && 
      user?.role === 'MENTEE' && 
      connectionState === 'connected' && 
      !attendanceMarked &&
      localStreamRef.current && // Must have local stream (camera/mic active)
      (peerRef.current !== null || peerRefs.current.size > 0) // Must have peer connection
    ) {
      // Add a small delay to ensure the mentee has actually joined, not just navigated to the page
      delayTimer = setTimeout(async () => {
        // Double-check conditions after delay
        if (
          connectionState === 'connected' &&
          localStreamRef.current &&
          (peerRef.current !== null || peerRefs.current.size > 0) &&
          !attendanceMarked
        ) {
          try {
            await axios.post(`/sessions/${sessionId}/attendance`);
            setAttendanceMarked(true);
            console.log('[VideoCall] Attendance marked for session:', sessionId);
          } catch (error) {
            console.error('[VideoCall] Error marking attendance:', error);
            // Don't fail the call if attendance marking fails
          }
        }
      }, 3000); // Wait 3 seconds to ensure mentee has actually joined
    }

    return () => {
      if (delayTimer) {
        clearTimeout(delayTimer);
      }
    };
  }, [sessionId, user?.role, connectionState, attendanceMarked]);

  // Set remote stream to video element when it becomes available
  useEffect(() => {
    // Check periodically if video element is ready and we have a stream
    const checkAndSetStream = () => {
      if (remoteVideoRef.current && remoteStreamRef.current) {
        if (!remoteVideoRef.current.srcObject || remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          console.log('Video element ready, setting remote stream');
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1.0;
          remoteVideoRef.current.play().catch(err => {
            console.error('Error playing remote video (from useEffect):', err);
          });
          setHasRemoteStream(true);
        }
      }
    };

    // Check immediately
    checkAndSetStream();

    // Check periodically until stream is set
    const interval = setInterval(checkAndSetStream, 200);
    
    return () => clearInterval(interval);
  }, [hasRemoteStream]); // Re-run when hasRemoteStream changes

  // Prevent navigation away from active call
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCallActiveRef.current && !allowNavigationRef.current) {
        e.preventDefault();
        e.returnValue = 'You have an active call. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Push initial state to track navigation
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      const isCallActive = isCallActiveRef.current || sessionStorage.getItem('isCallActive') === 'true';
      const allowNavigation = allowNavigationRef.current || sessionStorage.getItem('allowNavigation') === 'true';
      
      console.log('[VideoCall] PopState event:', {
        isCallActive,
        allowNavigation,
        isCallActiveRef: isCallActiveRef.current,
        allowNavigationRef: allowNavigationRef.current
      });
      
      if (isCallActive && !allowNavigation) {
        // Prevent the navigation by pushing state back
        window.history.pushState(null, '', window.location.href);
        const message = user?.role === 'MENTEE' 
          ? 'You have an active session. Leaving will disconnect you. Do you want to leave the session?'
          : 'You have an active call. Ending the call will disconnect you. Do you want to end the call and leave?';
        const confirmed = window.confirm(message);
        if (confirmed) {
          allowNavigationRef.current = true;
          isCallActiveRef.current = false;
          sessionStorage.setItem('isCallActive', 'false');
          sessionStorage.setItem('allowNavigation', 'true');
          if (user?.role === 'MENTEE') {
            leaveSession();
          } else {
            endCall();
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Store navigation blocker in a way that can be accessed globally
  useEffect(() => {
    // Store call active state in sessionStorage so other components can check it
    const updateCallState = () => {
      sessionStorage.setItem('isCallActive', isCallActiveRef.current ? 'true' : 'false');
    };
    
    updateCallState();
    const interval = setInterval(updateCallState, 1000);
    
    return () => clearInterval(interval);
  }, [participants.length]);

  useEffect(() => {
    // Check for pending call offer from notification (only when socket is ready)
    if (socket) {
      const pendingCall = sessionStorage.getItem('pendingCallOffer');
      if (pendingCall) {
        try {
          const callData = JSON.parse(pendingCall);
          sessionStorage.removeItem('pendingCallOffer');
          
          // Set participant and handle call
          setOtherParticipant({
            id: callData.callerId,
            name: callData.callerName,
            avatar: undefined
          });
          
          // Wait a bit for state to update, then handle call
          setTimeout(async () => {
            await handleIncomingCall(callData.offer, callData.callerId, callData.callerName);
          }, 300);
        } catch (error) {
          console.error('Error parsing pending call offer:', error);
        }
      }
    }
  }, [socket]);

  useEffect(() => {
    if (socket) {
      setupSocketListeners();
    }
    
    return () => {
      if (socket) {
        socket.off('incoming_call');
        socket.off('call_answered');
        socket.off('call_ended');
        socket.off('ice_candidate');
      }
    };
  }, [socket]);

  useEffect(() => {
    // For session calls, only mentor should initiate
    // Mentee should wait for incoming call but prepare media stream
    if (otherParticipant && socket && !peerRef.current) {
      if (sessionId && user?.role === 'MENTEE') {
        // Mentee should wait for mentor to initiate the call
        // But prepare media stream in advance
        console.log('Waiting for mentor to initiate session call...');
        setConnectionState('connecting');
        
        // Prepare media stream in advance so we're ready to answer
        const prepareMedia = async () => {
          try {
            if (!localStreamRef.current) {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
              });
              localStreamRef.current = stream;
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
              }
            }
          } catch (error) {
            console.error('Error preparing media for mentee:', error);
          }
        };
        prepareMedia();
      } else {
        // Mentor or non-session calls: initiate immediately
        initializeCall();
      }
    }
    return () => {
      // Don't cleanup here, only on unmount
    };
  }, [otherParticipant, socket, sessionId, user?.role]);

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('incoming_call', async (data: { callerId: string; callerName: string; offer: RTCSessionDescriptionInit }) => {
      // For session calls, check if the caller matches the expected participant
      // For non-session calls, check if we're on the call page
      const isSessionCall = sessionId !== null;
      const callerMatches = otherParticipant?.id === data.callerId;
      const isOnCallPage = window.location.pathname === '/video-call';
      
      if (callerMatches || (!otherParticipant && isOnCallPage) || (isSessionCall && isOnCallPage)) {
        // Handle the incoming call
        await handleIncomingCall(data.offer, data.callerId, data.callerName);
      }
    });

    socket.on('call_answered', async (data: { answer: RTCSessionDescriptionInit }) => {
      console.log('Received call answer:', data);
      if (!peerRef.current) {
        console.warn('Peer connection not ready when answer received, waiting...');
        // Wait a bit for peer to be created
        setTimeout(() => {
          if (peerRef.current && data.answer) {
            try {
              peerRef.current.signal(data.answer);
              console.log('Signaled answer to peer connection (delayed)');
            } catch (error) {
              console.error('Error signaling answer (delayed):', error);
            }
          }
        }, 500);
        return;
      }
      
      if (data.answer) {
        try {
          peerRef.current.signal(data.answer);
          console.log('Signaled answer to peer connection');
        } catch (error) {
          console.error('Error signaling answer:', error);
          // Don't end the call on error, just log it
          // The peer might recover or we can retry
        }
      } else {
        console.warn('Answer data is missing');
      }
    });

    socket.on('ice_candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      if (peerRef.current && data.candidate) {
        // SimplePeer expects ICE candidates in a specific format
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          peerRef.current.signal(data.candidate as any);
        } catch (error) {
          console.error('Error signaling ICE candidate:', error);
        }
      }
    });

    socket.on('call_ended', () => {
      endCall();
    });
  };

  const fetchParticipantInfo = async () => {
    try {
      const mentorId = searchParams.get('mentor');
      const menteeId = searchParams.get('mentee');
      const callerId = searchParams.get('caller');
      const sessionId = searchParams.get('sessionId');
      
      console.log('[VideoCall] Fetching participant info:', {
        mentorId,
        menteeId,
        callerId,
        sessionId,
        currentUserRole: user?.role,
        currentUserId: user?.id
      });
      
      let participantId = mentorId || menteeId || callerId;
      
      // Store sessionId if it exists in URL (for later use when ending call)
      if (sessionId) {
        setSessionId(sessionId);
        console.log('[VideoCall] Session ID stored:', sessionId);
      }
      
      // If sessionId is provided, fetch session participants
      if (sessionId && !participantId) {
        try {
          console.log('[VideoCall] Fetching session data for sessionId:', sessionId);
          const sessionResponse = await axios.get(`/sessions/${sessionId}`);
          const session = sessionResponse.data.data;
          console.log('[VideoCall] Session data received:', {
            sessionId: session.id,
            title: session.title,
            mentor: session.mentor,
            menteesCount: session.mentees?.length || 0,
            meetingUrl: session.meetingUrl,
            mentees: session.mentees?.map((sm: { mentee: { id: string; name: string } }) => ({
              id: sm.mentee.id,
              name: sm.mentee.name
            }))
          });
          
          // Check if this is a group session (multiple mentees)
          const isGroupSession = session.mentees && session.mentees.length > 1;
          
          if (isGroupSession) {
            // For group sessions, check if there's an external meeting URL
            const hasExternalMeetingUrl = session.meetingUrl && 
              !session.meetingUrl.includes('/video-call?sessionId=') &&
              (session.meetingUrl.startsWith('http://') || session.meetingUrl.startsWith('https://'));
            
            if (hasExternalMeetingUrl) {
              // Redirect to external meeting URL (e.g., Google Meet, Zoom)
              console.log('[VideoCall] Group session with external meeting URL, redirecting:', session.meetingUrl);
              window.location.href = session.meetingUrl;
              return;
            } else if (!session.meetingUrl) {
              // Group session without meeting URL - show error
              console.error('[VideoCall] Group session without meeting URL');
              alert('This group session does not have a meeting URL. Please contact the mentor to provide a meeting link (e.g., Google Meet, Zoom).');
              if (user?.role === 'MENTEE') {
                navigate('/mentee');
              } else {
                navigate('/sessions');
              }
              return;
            }
            // If meetingUrl exists but points to /video-call, continue with simple-peer (fallback)
          }
          
          // For group calls: collect ALL participants (mentor + all mentees)
          const allSessionParticipants: Array<{ id: string; name: string; avatar?: string }> = [];
          
          // Add mentor if not current user
          if (session.mentor && session.mentor.id !== user?.id) {
            allSessionParticipants.push({
              id: session.mentor.id,
              name: session.mentor.name,
              avatar: undefined // Can be fetched if needed
            });
          }
          
          // Add all mentees that are not the current user
          session.mentees?.forEach((sm: { mentee: { id: string; name: string; email: string } }) => {
            if (sm.mentee.id !== user?.id) {
              allSessionParticipants.push({
                id: sm.mentee.id,
                name: sm.mentee.name,
                avatar: undefined
              });
            }
          });
          
          console.log('[VideoCall] All session participants:', {
            total: allSessionParticipants.length,
            participants: allSessionParticipants.map(p => ({ id: p.id, name: p.name }))
          });
          
          // Store all participants for group call
          setAllParticipants(allSessionParticipants);
          
          // For backward compatibility: if only one participant, set as otherParticipant
          if (allSessionParticipants.length === 1) {
            setOtherParticipant(allSessionParticipants[0]);
            participantId = allSessionParticipants[0].id;
            console.log('[VideoCall] Single participant mode, setting otherParticipant:', participantId);
          } else if (allSessionParticipants.length > 1) {
            // Group call mode - we'll connect to all participants
            console.log('[VideoCall] Group call mode with', allSessionParticipants.length, 'participants');
            // Set first participant as otherParticipant for backward compatibility
            setOtherParticipant(allSessionParticipants[0]);
            participantId = allSessionParticipants[0].id;
          } else {
            console.error('[VideoCall] No other participants found in session:', {
              userRole: user?.role,
              userId: user?.id,
              sessionMentor: session.mentor?.id,
              sessionMentees: session.mentees?.map((sm: { mentee: { id: string } }) => sm.mentee.id)
            });
            alert('No other participants found in this session. Please try again.');
            // Redirect based on user role
            if (user?.role === 'MENTEE') {
              navigate('/mentee');
            } else {
              navigate('/sessions');
            }
            return;
          }
          
          console.log('[VideoCall] Participant ID determined:', participantId);
        } catch (error: unknown) {
          console.error('[VideoCall] Error fetching session:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Check if it's a 404 or 403 error (session not found or no access)
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
            console.error('[VideoCall] Session fetch error details:', {
              status: axiosError.response?.status,
              message: axiosError.response?.data?.message,
              sessionId
            });
            
            if (axiosError.response?.status === 404) {
              console.warn('[VideoCall] Session not found (404)');
              alert('Session not found. It may have been cancelled or completed.');
            } else if (axiosError.response?.status === 403) {
              console.warn('[VideoCall] Access denied to session (403)');
              alert('You do not have access to this session.');
            } else {
              console.error('[VideoCall] Session fetch failed with status:', axiosError.response?.status);
              alert(`Failed to load session information: ${axiosError.response?.data?.message || errorMessage}. Please try again.`);
            }
          } else {
            console.error('[VideoCall] Session fetch failed with unknown error:', errorMessage);
            alert(`Failed to load session information: ${errorMessage}. Please try again.`);
          }
          
          // Navigate back - based on user role
          if (user?.role === 'MENTEE') {
            navigate('/mentee');
          } else {
            navigate('/sessions');
          }
          return;
        }
      }

      if (!participantId) {
        console.error('[VideoCall] No participant ID provided after all attempts');
        navigate(-1);
        return;
      }

      console.log('[VideoCall] Fetching participant user info for ID:', participantId);
      // Fetch participant information
      const response = await axios.get(`/users/${participantId}`);
      const participant = response.data.data;
      console.log('[VideoCall] Participant info received:', {
        id: participant.id,
        name: participant.name,
        hasAvatar: !!participant.avatar
      });
      
      setOtherParticipant({
        id: participant.id,
        name: participant.name,
        avatar: participant.avatar
      });
      console.log('[VideoCall] Other participant set successfully');
    } catch (error: unknown) {
      console.error('[VideoCall] Error fetching participant info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[VideoCall] Falling back to basic participant info');
      
      // Still allow call to proceed with basic info
      const mentorId = searchParams.get('mentor');
      const menteeId = searchParams.get('mentee');
      const callerId = searchParams.get('caller');
      const urlSessionId = searchParams.get('sessionId');
      const participantId = mentorId || menteeId || callerId;
      
      console.log('[VideoCall] Fallback participant info:', {
        participantId,
        urlSessionId,
        error: errorMessage
      });
      
      // Store sessionId even in error case
      if (urlSessionId) {
        setSessionId(urlSessionId);
        setAttendanceMarked(false); // Reset attendance flag when session changes
        console.log('[VideoCall] Session ID stored in error case:', urlSessionId);
      }
      
      if (participantId) {
        console.log('[VideoCall] Setting fallback participant:', participantId);
        setOtherParticipant({
          id: participantId,
          name: 'Participant',
          avatar: undefined
        });
      } else {
        console.error('[VideoCall] No fallback participant ID available');
      }
    } finally {
      console.log('[VideoCall] Participant info fetch completed, setting loading to false');
      setLoading(false);
    }
  };

  const createPeer = (initiator: boolean, stream: MediaStream, participant?: { id: string; name: string; avatar?: string }) => {
    // Capture current socket and participant to avoid stale closures
    const currentSocket = socket;
    // Use provided participant or fall back to state
    const currentParticipant = participant || otherParticipant;

    if (!currentSocket) {
      throw new Error('Socket is not available');
    }

    if (!currentParticipant) {
      throw new Error('Other participant is not available');
    }

    if (!stream || !stream.getTracks || stream.getTracks().length === 0) {
      throw new Error('Invalid media stream provided');
    }

    // Check if SimplePeer is available
    if (!SimplePeer) {
      throw new Error('SimplePeer library is not loaded. Please refresh the page.');
    }

    let peer: SimplePeer.Instance;
    try {
      console.log('Creating SimplePeer:', { 
        initiator, 
        hasStream: !!stream, 
        streamTracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      peer = new SimplePeer({
        initiator,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
      
      console.log('SimplePeer created successfully');
    } catch (peerError: unknown) {
      console.error('Error creating SimplePeer:', peerError);
      const errorMessage = peerError instanceof Error ? peerError.message : 'Unknown error';
      throw new Error(`Failed to create peer connection: ${errorMessage}`);
    }

    // Handle signal data (offer/answer/ICE candidates)
    peer.on('signal', (data) => {
      if (currentSocket && currentParticipant && data) {
        try {
          if (data.type === 'offer') {
            currentSocket.emit('call_user', {
              receiverId: currentParticipant.id,
              offer: data
            });
          } else if (data.type === 'answer') {
            currentSocket.emit('answer_call', {
              callerId: currentParticipant.id,
              answer: data
            });
          } else {
            // ICE candidate
            currentSocket.emit('ice_candidate', {
              receiverId: currentParticipant.id,
              candidate: data
            });
          }
        } catch (error) {
          console.error('Error emitting signal:', error);
        }
      }
    });

    // Handle remote stream
    peer.on('stream', (remoteStream) => {
      const participantId = currentParticipant?.id;
      console.log('[VideoCall] Remote stream received from:', participantId, currentParticipant?.name, {
        stream: remoteStream,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
        videoTrackEnabled: remoteStream.getVideoTracks()[0]?.enabled,
        audioTrackEnabled: remoteStream.getAudioTracks()[0]?.enabled
      });
      
      // Store stream by participant ID for group calls
      if (participantId) {
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(participantId, remoteStream);
          console.log('[VideoCall] Stored remote stream for participant:', participantId, 'Total streams:', newMap.size);
          return newMap;
        });
      }
      
      // For backward compatibility: store in remoteStreamRef if it's the first/only stream
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = remoteStream;
      }
      
      // Try to set it immediately if video element is ready (for one-on-one calls)
      const setStreamToVideo = () => {
        if (remoteVideoRef.current && remoteStreamRef.current) {
          console.log('[VideoCall] Setting remote stream to video element (one-on-one mode)');
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1.0;
          
          // Force video to play
          remoteVideoRef.current.play().catch(err => {
            console.error('[VideoCall] Error playing remote video:', err);
          });
          
          setHasRemoteStream(true);
          setConnectionState('connected');
          console.log('[VideoCall] Remote stream set to video element successfully');
          return true;
        }
        return false;
      };
      
      if (!setStreamToVideo()) {
        console.warn('[VideoCall] Remote video ref is not available, will retry when element is ready');
        // The useEffect below will handle setting it when the ref becomes available
      }
      
      // Set state immediately even if video element isn't ready
      setHasRemoteStream(true);
      setConnectionState('connected');
      
      // Add remote participant when stream is received
      const participantToAdd = currentParticipant || otherParticipant;
      if (participantToAdd) {
        setParticipants(prev => {
          const exists = prev.some(p => p.id === participantToAdd.id);
          if (!exists) {
            console.log('[VideoCall] Adding remote participant:', participantToAdd.name);
            return [...prev, {
              id: participantToAdd.id,
              name: participantToAdd.name,
              avatar: participantToAdd.avatar,
              isVideoEnabled: true,
              isAudioEnabled: true
            }];
          }
          return prev;
        });
      }
    });

    // Handle connection state
    peer.on('connect', () => {
      console.log('Peer connected successfully');
      setConnectionState('connected');
      // Ensure remote stream is checked
      if (remoteVideoRef.current?.srcObject) {
        setHasRemoteStream(true);
      }
    });

    peer.on('close', () => {
      console.log('Peer connection closed - this might be normal during reconnection');
      // Don't immediately update state - the peer might reconnect
      // Only update if we were actually connected
      setConnectionState(prev => {
        if (prev === 'connected') {
          console.warn('Peer closed while connected - this might indicate a problem');
          return 'disconnected';
        }
        // If connecting, keep trying
        return prev;
      });
      // Don't clear remote stream immediately - it might reconnect
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      // Don't automatically end call on error, just update state
      // Some errors are recoverable (like ICE connection failures that can retry)
      setConnectionState(prev => {
        // Only mark as failed if we were connected
        if (prev === 'connected') {
          return 'failed';
        }
        // If connecting, keep trying
        return prev;
      });
    });

    return peer;
  };

  const initializeCall = async () => {
    try {
      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setConnectionState('failed');
        alert('Your browser does not support video calling. Please use a modern browser.');
        return;
      }

      // Check if we already have an active stream that we can reuse
      let stream: MediaStream | null = null;
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks();
        const activeTracks = tracks.filter(track => track.readyState === 'live');
        
        // If we have active tracks, reuse the existing stream
        if (activeTracks.length > 0) {
          console.log('Reusing existing media stream');
          stream = localStreamRef.current;
        } else {
          // Clean up inactive stream
          tracks.forEach(track => track.stop());
          localStreamRef.current = null;
        }
      }

      // If we don't have an active stream, try to get a new one
      if (!stream) {
        // Clean up screen share stream if it exists
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => {
            track.stop();
          });
          screenStreamRef.current = null;
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
        } catch (mediaError: unknown) {
          console.error('Error accessing media devices:', mediaError);
          
          // Check the specific error type
          const error = mediaError as DOMException;
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setConnectionState('failed');
            alert('Camera/microphone access was denied. Please allow permissions in your browser settings and try again.');
            return;
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setConnectionState('failed');
            alert('No camera or microphone found. Please connect a device and try again.');
            return;
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            // If already in use, try to work with existing stream or provide helpful message
            console.log('Device already in use, checking for existing streams...');
            
            // Try to enumerate devices to see what's available
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const videoDevices = devices.filter(d => d.kind === 'videoinput');
              const audioDevices = devices.filter(d => d.kind === 'audioinput');
              
              if (videoDevices.length === 0 && audioDevices.length === 0) {
                setConnectionState('failed');
                alert('No camera or microphone devices found. Please connect devices and refresh the page.');
                return;
              }
              
              // If we have an existing stream with active tracks, try to use it
              if (localStreamRef.current) {
                const existingTracks = localStreamRef.current.getTracks();
                const hasActiveTracks = existingTracks.some(track => track.readyState === 'live');
                
                if (hasActiveTracks) {
                  console.log('Using existing active stream despite error');
                  stream = localStreamRef.current;
                } else {
                  setConnectionState('failed');
                  alert('Camera or microphone is already in use. Please close other applications using your camera/microphone and try again.');
                  return;
                }
              } else {
                setConnectionState('failed');
                alert('Camera or microphone is already in use. Please close other applications using your camera/microphone and try again.');
                return;
              }
            } catch {
              setConnectionState('failed');
              alert('Camera or microphone is already in use by another application. Please close other applications and try again.');
              return;
            }
          } else {
            setConnectionState('failed');
            alert(`Unable to access camera/microphone: ${error.message || 'Unknown error'}. Please check your permissions and try again.`);
            return;
          }
        }
      }
      
      // Close existing peer connection if any
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Ensure stream tracks are enabled
      stream.getTracks().forEach(track => {
        track.enabled = true;
      });
      
      // Update video/audio enabled state based on actual track state
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
      }
      if (audioTrack) {
        setIsAudioEnabled(audioTrack.enabled);
      }

      // Check socket and participant before creating peer
      if (!socket) {
        throw new Error('Socket connection is not available. Please refresh the page.');
      }

      if (!otherParticipant) {
        throw new Error('Participant information is not available.');
      }

      // For session calls, add a small delay to ensure the other participant is ready
      if (sessionId) {
        console.log('Session call detected, waiting a moment for other participant to be ready...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check if this is a group call (multiple participants)
      const isGroupCall = allParticipants.length > 1;
      console.log('[VideoCall] Call type:', isGroupCall ? 'GROUP CALL' : 'ONE-ON-ONE', 'Participants:', allParticipants.length);

      if (isGroupCall) {
        // GROUP CALL: Create peer connections for all participants
        console.log('[VideoCall] Initializing group call with', allParticipants.length, 'participants');
        
        // Create peer connections for each participant
        for (const participant of allParticipants) {
          try {
            console.log('[VideoCall] Creating peer connection for:', participant.name, participant.id);
            const peer = createPeer(true, stream, participant);
            peerRefs.current.set(participant.id, peer);
            
            // Also set as main peerRef for backward compatibility (first participant)
            if (!peerRef.current) {
              peerRef.current = peer;
            }
          } catch (error) {
            console.error('[VideoCall] Error creating peer for', participant.name, ':', error);
            // Continue with other participants even if one fails
          }
        }
        
        isCallerRef.current = true;
        setConnectionState('connecting');
        console.log('[VideoCall] Group call initialized, created', peerRefs.current.size, 'peer connections');
      } else {
        // ONE-ON-ONE: Create single peer connection (existing behavior)
        peerRef.current = createPeer(true, stream, otherParticipant || undefined);
        isCallerRef.current = true;
        setConnectionState('connecting');
        console.log('[VideoCall] One-on-one call initialized');
      }

      // Mark call as active immediately
      isCallActiveRef.current = true;
      sessionStorage.setItem('isCallActive', 'true');

      // Add only current user as participant initially
      // Remote participants will be added when their streams are received
      const currentUser: Participant = {
        id: user?.id || '',
        name: user?.name || '',
        avatar: user?.avatar,
        isVideoEnabled: true,
        isAudioEnabled: true
      };

      setParticipants([currentUser]);
      setConnectionState('connecting');

    } catch (error: unknown) {
      console.error('Error initializing call:', error);
      setConnectionState('failed');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error starting call: ${errorMessage}. Please try again.`);
    }
  };

  const handleIncomingCall = async (offer: RTCSessionDescriptionInit, callerId?: string, callerName?: string) => {
    try {
      // Use provided callerId or otherParticipant
      const caller = callerId || otherParticipant?.id;
      const callerNameToUse = callerName || otherParticipant?.name || 'Participant';
      
      if (!caller) {
        console.error('No caller ID available');
        setConnectionState('failed');
        alert('Caller information is not available. Please try again.');
        return;
      }

      // If we don't have otherParticipant set yet, set it now
      if (!otherParticipant || otherParticipant.id !== caller) {
        setOtherParticipant({
          id: caller,
          name: callerNameToUse,
          avatar: undefined
        });
      }

      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setConnectionState('failed');
        alert('Your browser does not support video calling. Please use a modern browser.');
        return;
      }

      // Check if we already have an active stream that we can reuse
      let stream: MediaStream | null = null;
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks();
        const activeTracks = tracks.filter(track => track.readyState === 'live');
        
        // If we have active tracks, reuse the existing stream
        if (activeTracks.length > 0) {
          console.log('Reusing existing media stream');
          stream = localStreamRef.current;
        } else {
          // Clean up inactive stream
          tracks.forEach(track => track.stop());
          localStreamRef.current = null;
        }
      }

      // If we don't have an active stream, try to get a new one
      if (!stream) {
        // Clean up screen share stream if it exists
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => {
            track.stop();
          });
          screenStreamRef.current = null;
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
        } catch (mediaError: unknown) {
          console.error('Error accessing media devices:', mediaError);
          
          // Check the specific error type
          const error = mediaError as DOMException;
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setConnectionState('failed');
            alert('Camera/microphone access was denied. Please allow permissions in your browser settings and try again.');
            return;
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setConnectionState('failed');
            alert('No camera or microphone found. Please connect a device and try again.');
            return;
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            // If already in use, try to work with existing stream or provide helpful message
            console.log('Device already in use, checking for existing streams...');
            
            // Try to enumerate devices to see what's available
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const videoDevices = devices.filter(d => d.kind === 'videoinput');
              const audioDevices = devices.filter(d => d.kind === 'audioinput');
              
              if (videoDevices.length === 0 && audioDevices.length === 0) {
                setConnectionState('failed');
                alert('No camera or microphone devices found. Please connect devices and refresh the page.');
                return;
              }
              
              // If we have an existing stream with active tracks, try to use it
              if (localStreamRef.current) {
                const existingTracks = localStreamRef.current.getTracks();
                const hasActiveTracks = existingTracks.some(track => track.readyState === 'live');
                
                if (hasActiveTracks) {
                  console.log('Using existing active stream despite error');
                  stream = localStreamRef.current;
                } else {
                  setConnectionState('failed');
                  alert('Camera or microphone is already in use. Please close other applications using your camera/microphone and try again.');
                  return;
                }
              } else {
                setConnectionState('failed');
                alert('Camera or microphone is already in use. Please close other applications using your camera/microphone and try again.');
                return;
              }
            } catch {
              setConnectionState('failed');
              alert('Camera or microphone is already in use by another application. Please close other applications and try again.');
              return;
            }
          } else {
            setConnectionState('failed');
            alert(`Unable to access camera/microphone: ${error.message || 'Unknown error'}. Please check your permissions and try again.`);
            return;
          }
        }
      }
      
      // Close existing peer connection if any
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Ensure stream tracks are enabled
      stream.getTracks().forEach(track => {
        track.enabled = true;
      });
      
      // Update video/audio enabled state based on actual track state
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
      }
      if (audioTrack) {
        setIsAudioEnabled(audioTrack.enabled);
      }

      // Add current user as participant
      const currentUser: Participant = {
        id: user?.id || '',
        name: user?.name || '',
        avatar: user?.avatar,
        isVideoEnabled: true,
        isAudioEnabled: true
      };
      setParticipants([currentUser]);

      // Check socket before creating peer
      if (!socket) {
        throw new Error('Socket connection is not available. Please refresh the page.');
      }

      // Create peer connection (initiator = false for receiver)
      // Pass participant info directly to avoid state timing issues
      peerRef.current = createPeer(false, stream, {
        id: caller,
        name: callerNameToUse,
        avatar: undefined
      });
      isCallerRef.current = false;
      setConnectionState('connecting');

      // Mark call as active immediately
      isCallActiveRef.current = true;
      sessionStorage.setItem('isCallActive', 'true');

      // Signal the offer to the peer
      if (offer) {
        peerRef.current.signal(offer);
        console.log('Incoming call answered, signaling offer to peer');
      } else {
        throw new Error('Call offer is missing');
      }
    } catch (error: unknown) {
      console.error('Error handling incoming call:', error);
      setConnectionState('failed');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error answering call: ${errorMessage}. Please try again.`);
    }
  };

  const cleanup = () => {
    console.log('[VideoCall] Cleanup started');
    
    // Stop local video stream
    if (localStreamRef.current) {
      console.log('[VideoCall] Stopping local stream tracks');
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[VideoCall] Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    // Stop screen share stream
    if (screenStreamRef.current) {
      console.log('[VideoCall] Stopping screen share stream tracks');
      screenStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[VideoCall] Stopped screen track:', track.kind);
      });
      screenStreamRef.current = null;
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Destroy all peer connections (group call support)
    if (peerRefs.current.size > 0) {
      console.log('[VideoCall] Destroying', peerRefs.current.size, 'peer connections');
      peerRefs.current.forEach((peer, participantId) => {
        try {
          console.log('[VideoCall] Destroying peer for participant:', participantId);
          peer.destroy();
        } catch (error) {
          console.error('[VideoCall] Error destroying peer for', participantId, ':', error);
        }
      });
      peerRefs.current.clear();
    }
    
    // Destroy single peer connection (backward compatibility)
    if (peerRef.current) {
      console.log('[VideoCall] Destroying main peer connection');
      try {
        peerRef.current.destroy();
      } catch (error) {
        console.error('[VideoCall] Error destroying peer:', error);
      }
      peerRef.current = null;
    }
    
    // Emit end call event to all participants
    if (socket) {
      // Emit to all participants in group call
      if (allParticipants.length > 0) {
        console.log('[VideoCall] Emitting end_call event to', allParticipants.length, 'participants');
        allParticipants.forEach(participant => {
          try {
            socket.emit('end_call', { receiverId: participant.id });
            console.log('[VideoCall] End call event emitted to:', participant.id);
          } catch (error) {
            console.error('[VideoCall] Error emitting end_call to', participant.id, ':', error);
          }
        });
      } else if (otherParticipant) {
        // Fallback to single participant (backward compatibility)
        console.log('[VideoCall] Emitting end_call event to:', otherParticipant.id);
        try {
          socket.emit('end_call', { receiverId: otherParticipant.id });
          console.log('[VideoCall] End call event emitted successfully');
        } catch (error) {
          console.error('[VideoCall] Error emitting end_call:', error);
        }
      }
    } else {
      console.warn('[VideoCall] Cannot emit end_call - socket missing');
    }
    
    // Clear all remote streams
    remoteStreams.forEach((stream, participantId) => {
      console.log('[VideoCall] Stopping remote stream for participant:', participantId);
      stream.getTracks().forEach(track => track.stop());
    });
    setRemoteStreams(new Map());
    
    // Clear single remote stream (backward compatibility)
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }
    
    // Clear all remote video refs
    remoteVideoRefs.current.forEach((videoRef) => {
      if (videoRef) {
        videoRef.srcObject = null;
      }
    });
    remoteVideoRefs.current.clear();
    
    // Reset state
    setHasRemoteStream(false);
    setConnectionState('disconnected');
    setParticipants([]);
    
    // Clear call active state - but allow navigation
    isCallActiveRef.current = false;
    allowNavigationRef.current = true; // Allow navigation after cleanup
    sessionStorage.setItem('isCallActive', 'false');
    sessionStorage.setItem('allowNavigation', 'true');
    
    console.log('[VideoCall] Cleanup completed');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only cleanup if we're actually leaving the page (not just re-rendering)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      // Only emit end_call if we have an active call and are actually unmounting
      if (socket && otherParticipant && isCallActiveRef.current) {
        socket.emit('end_call', { receiverId: otherParticipant.id });
      }
      // Clear call active state on unmount
      isCallActiveRef.current = false;
      allowNavigationRef.current = false;
      sessionStorage.setItem('isCallActive', 'false');
      sessionStorage.removeItem('allowNavigation');
    };
    // Remove dependencies to prevent cleanup on every state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVideo = async () => {
    try {
      // If we're turning video ON, check if we need to recreate the track
      if (!isVideoEnabled) {
        // Check if we have a valid video track
        let videoTrack = localStreamRef.current?.getVideoTracks()[0];
        const needsNewTrack = !videoTrack || videoTrack.readyState === 'ended';
        
        if (needsNewTrack) {
          // Need to get a new video track
          console.log('[VideoCall] Video track missing or stopped, getting new track');
          try {
            // Get existing audio track to preserve it
            const existingAudioTrack = localStreamRef.current?.getAudioTracks()[0];
            
            // Get new stream with video (and audio if we don't have one)
            const newStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: existingAudioTrack ? false : true
            });
            
            const newVideoTrack = newStream.getVideoTracks()[0];
            
            // Create a new combined stream
            const combinedStream = new MediaStream();
            
            // Add the new video track
            combinedStream.addTrack(newVideoTrack);
            
            // Add existing audio track if available, otherwise use audio from new stream
            if (existingAudioTrack) {
              combinedStream.addTrack(existingAudioTrack);
            } else if (newStream.getAudioTracks()[0]) {
              combinedStream.addTrack(newStream.getAudioTracks()[0]);
            }
            
            // Stop old video track if it exists
            if (videoTrack && videoTrack !== newVideoTrack) {
              videoTrack.stop();
            }
            
            // Stop the temporary new stream (we've extracted the tracks we need)
            newStream.getTracks().forEach(track => {
              if (track !== newVideoTrack && (!existingAudioTrack || track.kind !== 'audio')) {
                track.stop();
              }
            });
            
            // Update local stream reference
            localStreamRef.current = combinedStream;
            videoTrack = newVideoTrack;
            
            // Update local video element
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = combinedStream;
            }
            
            // Update all peer connections in group calls
            const updatePeerConnections = async () => {
              // Update all peer connections in peerRefs (group calls)
              for (const [participantId, peer] of peerRefs.current.entries()) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const pc = (peer as any)._pc || (peer as any).pc;
                  if (pc && pc.getSenders) {
                    const senders = pc.getSenders();
                    const videoSender = senders.find((s: RTCRtpSender) => 
                      s.track && s.track.kind === 'video'
                    );
                    if (videoSender && videoTrack) {
                      console.log('[VideoCall] Replacing video track in peer connection for:', participantId);
                      await videoSender.replaceTrack(videoTrack);
                    } else if (!videoSender && videoTrack) {
                      // No video sender exists, add the track
                      console.log('[VideoCall] Adding video track to peer connection for:', participantId);
                      pc.addTrack(videoTrack, combinedStream);
                    }
                  }
                } catch (error) {
                  console.error('[VideoCall] Error updating peer connection for', participantId, ':', error);
                }
              }
              
              // Update main peer connection (backward compatibility)
              if (peerRef.current) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const pc = (peerRef.current as any)._pc || (peerRef.current as any).pc;
                  if (pc && pc.getSenders) {
                    const senders = pc.getSenders();
                    const videoSender = senders.find((s: RTCRtpSender) => 
                      s.track && s.track.kind === 'video'
                    );
                    if (videoSender && videoTrack) {
                      console.log('[VideoCall] Replacing video track in main peer connection');
                      await videoSender.replaceTrack(videoTrack);
                    } else if (!videoSender && videoTrack) {
                      // No video sender exists, add the track
                      console.log('[VideoCall] Adding video track to main peer connection');
                      pc.addTrack(videoTrack, combinedStream);
                    }
                  }
                } catch (error) {
                  console.error('[VideoCall] Error updating main peer connection:', error);
                }
              }
            };
            
            await updatePeerConnections();
          } catch (error) {
            console.error('[VideoCall] Error getting new video track:', error);
            alert('Failed to enable camera. Please check your camera permissions.');
            return;
          }
        } else {
          // Track exists, just enable it
          if (videoTrack) {
            videoTrack.enabled = true;
          }
        }
        
        setIsVideoEnabled(true);
      } else {
        // Turning video OFF - just disable the track
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = false;
            setIsVideoEnabled(false);
          }
        }
      }
    } catch (error) {
      console.error('[VideoCall] Error toggling video:', error);
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

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        console.log('Screen stream obtained:', {
          videoTracks: screenStream.getVideoTracks().length,
          audioTracks: screenStream.getAudioTracks().length
        });
        
        screenStreamRef.current = screenStream;
        
        // Replace tracks in peer connection
        if (peerRef.current) {
          // Access the underlying RTCPeerConnection from simple-peer
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pc = (peerRef.current as any)._pc || (peerRef.current as any).pc;
          if (pc && pc.getSenders) {
            const senders = pc.getSenders();
            console.log('Found senders:', senders.length);
            
            // Replace video track
            const videoTrack = screenStream.getVideoTracks()[0];
            if (videoTrack) {
              const videoSender = senders.find((s: RTCRtpSender) => 
                s.track && s.track.kind === 'video'
              );
              if (videoSender) {
                console.log('Replacing video track with screen share');
                await videoSender.replaceTrack(videoTrack);
                console.log('Video track replaced successfully');
              } else {
                console.warn('No video sender found');
              }
            }
            
            // Replace or add audio track from screen share (if available)
            const audioTrack = screenStream.getAudioTracks()[0];
            if (audioTrack) {
              const audioSender = senders.find((s: RTCRtpSender) => 
                s.track && s.track.kind === 'audio'
              );
              if (audioSender) {
                console.log('Replacing audio track with screen share audio');
                await audioSender.replaceTrack(audioTrack);
              } else {
                console.log('No audio sender found, adding new audio track');
                // Add new audio track if no sender exists
                pc.addTrack(audioTrack, screenStream);
              }
            }
          } else {
            console.error('Could not access RTCPeerConnection from simple-peer');
          }
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Handle when user stops sharing from browser UI
        screenStream.getVideoTracks()[0].onended = async () => {
          console.log('Screen share ended by user');
          setIsScreenSharing(false);
          
          // Restore camera track
          if (peerRef.current && localStreamRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pc = (peerRef.current as any)._pc || (peerRef.current as any).pc;
            if (pc && pc.getSenders) {
              const senders = pc.getSenders();
              const videoTrack = localStreamRef.current.getVideoTracks()[0];
              if (videoTrack) {
                const videoSender = senders.find((s: RTCRtpSender) => 
                  s.track && s.track.kind === 'video'
                );
                if (videoSender) {
                  console.log('Restoring camera video track');
                  await videoSender.replaceTrack(videoTrack);
                }
              }
              
              // Restore original audio track
              const audioTrack = localStreamRef.current.getAudioTracks()[0];
              if (audioTrack) {
                const audioSender = senders.find((s: RTCRtpSender) => 
                  s.track && s.track.kind === 'audio'
                );
                if (audioSender) {
                  console.log('Restoring camera audio track');
                  await audioSender.replaceTrack(audioTrack);
                }
              }
            }
          }
          
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          
          // Stop screen stream
          screenStream.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        };
      } else {
        console.log('Stopping screen share');
        setIsScreenSharing(false);
        
        // Restore camera track
        if (peerRef.current && localStreamRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pc = (peerRef.current as any)._pc || (peerRef.current as any).pc;
          if (pc && pc.getSenders) {
            const senders = pc.getSenders();
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
              const videoSender = senders.find((s: RTCRtpSender) => 
                s.track && s.track.kind === 'video'
              );
              if (videoSender) {
                console.log('Restoring camera video track');
                await videoSender.replaceTrack(videoTrack);
              }
            }
            
            // Restore original audio track
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
              const audioSender = senders.find((s: RTCRtpSender) => 
                s.track && s.track.kind === 'audio'
              );
              if (audioSender) {
                console.log('Restoring camera audio track');
                await audioSender.replaceTrack(audioTrack);
              }
            }
          }
        }
        
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        
        // Stop screen stream
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      setIsScreenSharing(false);
    }
  };

  const leaveSession = async () => {
    console.log('[VideoCall] Leave session button clicked (mentee)');
    try {
      // Allow navigation after leaving
      allowNavigationRef.current = true;
      isCallActiveRef.current = false;
      sessionStorage.setItem('isCallActive', 'false');
      sessionStorage.setItem('allowNavigation', 'true');
      console.log('[VideoCall] Navigation flags set to allow');
      
      // For mentees: only disconnect themselves, don't end call for others
      console.log('[VideoCall] Mentee leaving session - disconnecting only');
      
      // Stop local streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      
      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      
      // Destroy peer connections (but don't emit end_call to others)
      if (peerRefs.current.size > 0) {
        peerRefs.current.forEach((peer) => {
          try {
            peer.destroy();
          } catch (error) {
            console.error('[VideoCall] Error destroying peer:', error);
          }
        });
        peerRefs.current.clear();
      }
      
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (error) {
          console.error('[VideoCall] Error destroying peer:', error);
        }
        peerRef.current = null;
      }
      
      // Clear remote streams
      remoteStreams.forEach((stream) => {
        stream.getTracks().forEach(track => track.stop());
      });
      setRemoteStreams(new Map());
      
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach(track => track.stop());
        remoteStreamRef.current = null;
      }
      
      // Clear all remote video refs
      remoteVideoRefs.current.forEach((videoRef) => {
        if (videoRef) {
          videoRef.srcObject = null;
        }
      });
      remoteVideoRefs.current.clear();
      
      // Reset state
      setHasRemoteStream(false);
      setConnectionState('disconnected');
      setParticipants([]);
      
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate back - mentees should go to their dashboard, not sessions page
      console.log('[VideoCall] Navigating back');
      navigate('/mentee');
    } catch (error) {
      console.error('[VideoCall] Error in leaveSession:', error);
      // Still try to cleanup and navigate even on error
      navigate('/mentee');
    }
  };

  const endCall = async () => {
    console.log('[VideoCall] End call button clicked');
    
    // Check if user is a mentee - they should only be able to leave, not end
    if (user?.role === 'MENTEE') {
      console.log('[VideoCall] Mentee cannot end call, redirecting to leave session');
      leaveSession();
      return;
    }
    
    try {
      // Allow navigation after ending call
      allowNavigationRef.current = true;
      isCallActiveRef.current = false;
      sessionStorage.setItem('isCallActive', 'false');
      sessionStorage.setItem('allowNavigation', 'true');
      console.log('[VideoCall] Navigation flags set to allow');
      
      // If this is a session-based call and user is a mentor, mark session as completed
      if (sessionId && user?.role === 'MENTOR') {
        try {
          console.log('[VideoCall] Updating session status to COMPLETED:', sessionId);
          await axios.put(`/sessions/${sessionId}`, {
            status: 'COMPLETED'
          });
          console.log('[VideoCall] Session marked as completed');
        } catch (error) {
          console.error('[VideoCall] Error updating session status:', error);
          // Continue with cleanup even if update fails
        }
      }
      
      // Cleanup first (this will emit end_call to all participants)
      console.log('[VideoCall] Starting cleanup');
      cleanup();
      
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate back - mentors/admins go to sessions page
      console.log('[VideoCall] Navigating back');
      navigate('/sessions');
    } catch (error) {
      console.error('[VideoCall] Error in endCall:', error);
      // Still try to cleanup and navigate even on error
      cleanup();
      navigate('/sessions');
    }
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      sender: user?.name || 'You',
      message: newMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Auto-scroll to bottom when new message is sent
    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    if (showChat && chatMessages.length > 0) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-lg font-medium">
            {otherParticipant ? `Call with ${otherParticipant.name}` : 'Training Session'}
          </h1>
          <div className="flex items-center space-x-4 text-gray-300">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
            </div>
            {connectionState === 'connecting' && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span className="text-xs">Connecting...</span>
              </div>
            )}
            {connectionState === 'connected' && hasRemoteStream && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs">Connected</span>
              </div>
            )}
            {connectionState === 'failed' && (
              <div className="flex items-center space-x-2 text-red-400">
                <span className="text-xs">Connection failed</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) setShowSettings(false); // Close settings when opening chat
            }}
            className={`p-2 rounded-lg transition-colors ${
              showChat ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Chat"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          
          <button 
            onClick={() => {
              setShowSettings(!showSettings);
              if (!showSettings) setShowChat(false); // Close chat when opening settings
            }}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className={`flex-1 relative ${showChat || showSettings ? 'mr-80' : ''}`}>
          {/* Check if this is a group call */}
          {(() => {
            const isGroupCall = allParticipants.length > 1 || remoteStreams.size > 1;
            const totalParticipants = participants.length;
            
            if (isGroupCall && totalParticipants > 1) {
              // GROUP CALL: Grid layout
              const gridCols = totalParticipants <= 2 ? 2 : totalParticipants <= 4 ? 2 : 3;
              const gridRows = Math.ceil(totalParticipants / gridCols);
              
              return (
                <div className="h-full bg-gray-800 p-4">
                  <div 
                    className="grid gap-4 h-full"
                    style={{
                      gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                      gridTemplateRows: `repeat(${gridRows}, 1fr)`
                    }}
                  >
                    {/* Local Video */}
                    <div className="bg-gray-700 rounded-lg overflow-hidden relative">
                      {isVideoEnabled && localStreamRef.current ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-600">
                          <div className="text-center text-white">
                            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-2xl font-medium">
                                {user?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{user?.name || 'You'}</p>
                            {!isVideoEnabled && <p className="text-xs text-gray-400 mt-1">Video off</p>}
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
                        {user?.name || 'You'} (You)
                      </div>
                    </div>
                    
                    {/* Remote Participants */}
                    {participants.filter(p => p.id !== user?.id).map(participant => {
                      const stream = remoteStreams.get(participant.id);
                      const hasStream = !!stream;
                      
                      return (
                        <div key={participant.id} className="bg-gray-700 rounded-lg overflow-hidden relative">
                          {hasStream ? (
                            <video
                              ref={(el) => {
                                if (el) {
                                  remoteVideoRefs.current.set(participant.id, el);
                                  el.srcObject = stream;
                                  el.play().catch(err => console.error('Error playing video:', err));
                                }
                              }}
                              autoPlay
                              playsInline
                              muted={false}
                              className="w-full h-full object-cover"
                              onLoadedMetadata={() => {
                                console.log('[VideoCall] Remote video loaded for:', participant.name);
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-600">
                              <div className="text-center text-white">
                                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <span className="text-2xl font-medium">
                                    {participant.name.charAt(0)}
                                  </span>
                                </div>
                                <p className="text-sm font-medium">{participant.name}</p>
                                <p className="text-xs text-gray-400 mt-1">Connecting...</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
                            {participant.name}
                            {!participant.isVideoEnabled && <span className="ml-1">(Video off)</span>}
                            {!participant.isAudioEnabled && <span className="ml-1">(Muted)</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            } else {
              // ONE-ON-ONE: Original layout
              return (
                <div className="h-full bg-gray-800 relative">
                  {/* Always render video element so ref is available */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={false}
                    className={`w-full h-full object-cover ${!hasRemoteStream && !remoteVideoRef.current?.srcObject ? 'hidden' : ''}`}
                    style={{ backgroundColor: '#1f2937' }}
                    onLoadedMetadata={() => {
                      console.log('Remote video metadata loaded');
                      setHasRemoteStream(true);
                    }}
                    onCanPlay={() => {
                      console.log('Remote video can play');
                      setHasRemoteStream(true);
                    }}
                    onError={(e) => {
                      console.error('Remote video error:', e);
                    }}
                  />
                  {!hasRemoteStream && !remoteVideoRef.current?.srcObject && (
                    <div className="w-full h-full flex items-center justify-center absolute inset-0 bg-gray-800">
                      <div className="text-center text-gray-400">
                        <Video className="h-16 w-16 mx-auto mb-4" />
                        <p className="text-lg">
                          {connectionState === 'connecting' 
                            ? 'Connecting...' 
                            : connectionState === 'failed'
                            ? 'Connection failed. Please try again.'
                            : 'Waiting for participants to join...'}
                        </p>
                        {connectionState === 'failed' && (
                          <button
                            onClick={() => {
                              if (otherParticipant && socket) {
                                initializeCall();
                              }
                            }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Retry Connection
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Local Video (Picture-in-Picture) */}
                  <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden">
                    {isVideoEnabled ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-600">
                        <div className="text-center text-white">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-lg font-medium">
                              {user?.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <p className="text-xs">{user?.name || 'You'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })()}

          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-4 bg-gray-800 px-6 py-3 rounded-full">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full transition-colors ${
                  isScreenSharing 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                <Monitor className="h-5 w-5" />
              </button>

              {user?.role === 'MENTEE' ? (
                <button
                  onClick={leaveSession}
                  className="p-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
                  title="Leave Session"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={endCall}
                  className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="End Call"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Video Settings</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isVideoEnabled}
                      onChange={toggleVideo}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable Camera</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isAudioEnabled}
                      onChange={toggleAudio}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable Microphone</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Call Settings</h4>
                <div className="space-y-2">
                  <button
                    onClick={toggleScreenShare}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {isScreenSharing ? 'Stop' : 'Start'} Screen Sharing
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Participants</h4>
                <div className="space-y-2">
                  {participants.map(participant => (
                    <div key={participant.id} className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {participant.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                        <p className="text-xs text-gray-500">
                          {participant.isVideoEnabled ? 'Video On' : 'Video Off'} • {participant.isAudioEnabled ? 'Audio On' : 'Audio Off'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {chatMessages.map(message => (
                    <div key={message.id} className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.sender}
                        </span>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-100 rounded-lg px-3 py-2">
                        {message.message}
                      </p>
                    </div>
                  ))}
                  <div ref={chatMessagesEndRef} />
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <form onSubmit={sendChatMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallPage;