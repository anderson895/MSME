/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io from "socket.io-client";
import { useAuth } from './AuthContext';

type Socket = ReturnType<typeof io>;

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface IncomingCall {
  callerId: string;
  callerName: string;
  offer: RTCSessionDescriptionInit;
}

interface SocketContextType {
  socket: Socket | null;
  messages: Message[];
  onlineUsers: string[];
  notifications: Array<{
    title: string;
    message: string;
    type: string;
    sessionId?: string;
    meetingUrl?: string;
    senderId?: string;
    senderName?: string;
    timestamp?: string;
    announcementId?: string;
  }>;
  incomingCall: IncomingCall | null;
  sendMessage: (data: {
    receiverId?: string;
    groupId?: string;
    content: string;
  }) => void;
  joinRoom: (roomId: string) => void;
  clearNotifications: () => void;
  clearIncomingCall: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Array<{
    title: string;
    message: string;
    type: string;
    sessionId?: string;
    meetingUrl?: string;
    senderId?: string;
    senderName?: string;
    timestamp?: string;
    announcementId?: string;
  }>>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (user && !(user.role === 'MENTOR' && user.status === 'PENDING_APPROVAL')) {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const socketInstance = io(SOCKET_URL, {
        auth: { token }
      });

      socketInstance.on('connect', () => {
        console.log('Connected to socket server');
      });

      socketInstance.on('new_message', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });

      socketInstance.on('message_sent', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });

      socketInstance.on('new_notification', (notification: {
        title: string;
        message: string;
        type: string;
        senderId?: string;
        senderName?: string;
        timestamp?: string;
        sessionId?: string;
        meetingUrl?: string;
        announcementId?: string;
      }) => {
        setNotifications(prev => [...prev, notification]);
      });

      socketInstance.on('user_typing', (data: { userId: string; name: string }) => {
        // Handle typing indicator
        console.log(`${data.name} is typing...`);
      });

      socketInstance.on('user_stopped_typing', (_data: { userId: string }) => {
        // Handle stop typing indicator
        console.log('User stopped typing');
      });

      socketInstance.on('online_users', (users: string[]) => {
        setOnlineUsers(users);
      });

      socketInstance.on('user_online', (userId: string) => {
        setOnlineUsers(prev => [...prev, userId]);
      });

      socketInstance.on('user_offline', (userId: string) => {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      });

      socketInstance.on('incoming_call', (data: { callerId: string; callerName: string; offer: RTCSessionDescriptionInit }) => {
        // Only show notification if not already on video call page
        if (window.location.pathname !== '/app/video-call') {
          setIncomingCall(data);
          // Play notification sound if possible
          try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {
              // Ignore if audio play fails (user interaction required)
            });
          } catch (e) {
            // Ignore audio errors
          }
        }
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [user]);

  const sendMessage = (data: {
    receiverId?: string;
    groupId?: string;
    content: string;
  }) => {
    if (socket) {
      socket.emit('send_message', data);
    }
  };

  const joinRoom = (roomId: string) => {
    if (socket) {
      socket.emit('join_room', roomId);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  return (
    <SocketContext.Provider value={{
      socket,
      messages,
      onlineUsers,
      notifications,
      incomingCall,
      sendMessage,
      joinRoom,
      clearNotifications,
      clearIncomingCall
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};