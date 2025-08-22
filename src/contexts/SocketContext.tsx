/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io } from "socket.io-client";
import { useAuth } from './AuthContext';
import { Socket } from 'socket.io-client';

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

interface SocketContextType {
  socket: Socket | null;
  messages: Message[];
  onlineUsers: string[];
  notifications: Array<{
    title: string;
    message: string;
    type: string;
  }>;
  sendMessage: (data: {
    receiverId?: string;
    groupId?: string;
    content: string;
  }) => void;
  joinRoom: (roomId: string) => void;
  clearNotifications: () => void;
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
  }>>([]);

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
  return (
    <SocketContext.Provider value={{
      socket,
      messages,
      onlineUsers,
      notifications,
      sendMessage,
      joinRoom,
      clearNotifications
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