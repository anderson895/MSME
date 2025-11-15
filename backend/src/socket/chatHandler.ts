/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { createNotification } from '../controllers/notificationController';

interface SocketUser {
  id: string;
  name: string;
  role: string;
}

const connectedUsers = new Map<string, SocketUser>();

export const setupChatHandlers = (io: Server) => {
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, status: 'ACTIVE' }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      // Prevent mentors with pending approval from connecting to chat
      if (user.role === 'MENTOR' && user.status === 'PENDING_APPROVAL') {
        return next(new Error('Account pending approval'));
      }
      socket.userId = user.id;
      socket.userData = {
        id: user.id,
        name: user.name,
        role: user.role
      };

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`User ${socket.userData?.name} connected`);
    
    // Store connected user
    if (socket.userData) {
      connectedUsers.set(socket.id, socket.userData);
      
      // Emit user online event to all clients
      io.emit('user_online', socket.userData.id);
      
      // Send list of all online users to the newly connected user
      const onlineUserIds = Array.from(connectedUsers.values()).map(u => u.id);
      socket.emit('online_users', onlineUserIds);
    }

    // Join user to their role-based room
    if (socket.userData?.role) {
      socket.join(`role_${socket.userData.role}`);
      socket.join(`user_${socket.userData.id}`); // Join personal room for notifications
    }

    // Handle joining chat rooms
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      console.log(`User ${socket.userData?.name} joined room ${roomId}`);
    });

    // Handle direct messages
    socket.on('send_message', async (data: {
      receiverId?: string;
      groupId?: string;
      content: string;
    }) => {
      try {
        const message = await prisma.message.create({
          data: {
            content: data.content,
            senderId: socket.userId!,
            receiverId: data.receiverId,
            groupId: data.groupId
          },
          include: {
            sender: {
              select: { id: true, name: true, avatar: true }
            }
          }
        });

        if (data.receiverId) {
          // Direct message
          socket.to(`user_${data.receiverId}`).emit('new_message', message);
          
          // Check if receiver is currently viewing the chat with the sender
          // If they are, we'll skip creating a notification (they can see the message in real-time)
          // Note: This is a simple check - in a more complex system, you might track active chat sessions
          
          // Create notification for receiver with accurate timestamp
          // Only create if receiver is not the sender (shouldn't happen, but safety check)
          if (data.receiverId !== socket.userId) {
            try {
              const notification = await createNotification(
                data.receiverId,
                'New Message',
                `You have a new message from ${socket.userData?.name}`,
                'info'
              );
              
              // Emit notification to receiver with senderId for navigation
              socket.to(`user_${data.receiverId}`).emit('new_notification', {
                title: 'New Message',
                message: `You have a new message from ${socket.userData?.name}`,
                type: 'info',
                senderId: socket.userId,
                senderName: socket.userData?.name,
                timestamp: message.createdAt
              });
            } catch (error) {
              console.error('Error creating message notification:', error);
            }
          }
        } else if (data.groupId) {
          // Group message
          socket.to(data.groupId).emit('new_message', message);
        }

        socket.emit('message_sent', message);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { receiverId?: string; groupId?: string }) => {
      if (data.receiverId) {
        socket.to(`user_${data.receiverId}`).emit('user_typing', {
          userId: socket.userId,
          name: socket.userData?.name
        });
      } else if (data.groupId) {
        socket.to(data.groupId).emit('user_typing', {
          userId: socket.userId,
          name: socket.userData?.name
        });
      }
    });

    socket.on('typing_stop', (data: { receiverId?: string; groupId?: string }) => {
      if (data.receiverId) {
        socket.to(`user_${data.receiverId}`).emit('user_stopped_typing', {
          userId: socket.userId
        });
      } else if (data.groupId) {
        socket.to(data.groupId).emit('user_stopped_typing', {
          userId: socket.userId
        });
      }
    });

    // Handle video call signaling
    socket.on('call_user', (data: { receiverId: string; offer: any }) => {
      socket.to(`user_${data.receiverId}`).emit('incoming_call', {
        callerId: socket.userId,
        callerName: socket.userData?.name,
        offer: data.offer
      });
    });

    socket.on('answer_call', (data: { callerId: string; answer: any }) => {
      socket.to(`user_${data.callerId}`).emit('call_answered', {
        answer: data.answer
      });
    });

    socket.on('ice_candidate', (data: { receiverId: string; candidate: any }) => {
      socket.to(`user_${data.receiverId}`).emit('ice_candidate', {
        candidate: data.candidate
      });
    });

    socket.on('end_call', (data: { receiverId: string }) => {
      socket.to(`user_${data.receiverId}`).emit('call_ended');
    });

    socket.on('reject_call', (data: { callerId: string }) => {
      socket.to(`user_${data.callerId}`).emit('call_rejected');
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userData?.name} disconnected`);
      const userId = socket.userData?.id;
      connectedUsers.delete(socket.id);
      
      // Check if user has any other active connections
      const hasOtherConnections = Array.from(connectedUsers.values()).some(u => u.id === userId);
      
      // Only emit offline if user has no other active connections
      if (userId && !hasOtherConnections) {
        io.emit('user_offline', userId);
      }
    });
  });
};

// Extend Socket interface
declare module 'socket.io' {
  interface Socket {
    userId?: string;
    userData?: SocketUser;
  }
}