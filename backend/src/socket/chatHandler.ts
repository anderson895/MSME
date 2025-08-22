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
          
          // Create notification for receiver
          try {
            await createNotification(
              data.receiverId,
              'New Message',
              `You have a new message from ${socket.userData?.name}`,
              'info'
            );
            
            // Emit notification to receiver
            socket.to(`user_${data.receiverId}`).emit('new_notification', {
              title: 'New Message',
              message: `You have a new message from ${socket.userData?.name}`,
              type: 'info'
            });
          } catch (error) {
            console.error('Error creating message notification:', error);
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

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userData?.name} disconnected`);
      connectedUsers.delete(socket.id);
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