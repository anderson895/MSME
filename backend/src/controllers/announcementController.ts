/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/database';
import { createNotification } from './notificationController';
import { getIO } from '../utils/socket';
import { sendAnnouncementEmail } from '../config/email';

interface AuthRequest extends Request {
  user?: any;
}

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, targetRole } = req.body;
    const createdBy = req.user.id;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        targetRole,
        createdBy
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Send notifications to all users with the target role
    try {
      const targetUsers = await prisma.user.findMany({
        where: {
          role: targetRole,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      const io = getIO();
      
      // Create notifications for each target user
      for (const user of targetUsers) {
        try {
          // Create database notification
          await createNotification(
            user.id,
            'New Announcement',
            `${title}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
            'info'
          );

          // Emit real-time notification via socket
          if (io) {
            io.to(`user_${user.id}`).emit('new_notification', {
              title: 'New Announcement',
              message: `${title}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
              type: 'info',
              announcementId: announcement.id,
              timestamp: new Date()
            });
          }

          // Send email notification (non-blocking)
          sendAnnouncementEmail(user.email, user.name, title, message, targetRole)
            .then(() => {
              console.log(`Announcement email sent successfully to ${user.email}`);
            })
            .catch((emailError) => {
              console.error(`Failed to send announcement email to ${user.email}:`, emailError);
              // Don't fail the announcement if email fails
            });
        } catch (error) {
          console.error(`Error sending notification to user ${user.id}:`, error);
        }
      }

      console.log(`Announcement notifications sent to ${targetUsers.length} ${targetRole} user(s)`);
    } catch (error) {
      console.error('Error sending announcement notifications:', error);
      // Don't fail the request if notifications fail
    }

    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement'
    });
  }
};

export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    let announcements;

    if (user.role === 'ADMIN') {
      // Admin can see all announcements
      announcements = await prisma.announcement.findMany({
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Users can see announcements for their role or general ones
      announcements = await prisma.announcement.findMany({
        where: {
          OR: [
            { targetRole: user.role },
            { targetRole: 'MENTEE' } // Assuming general announcements are targeted to MENTEE
          ]
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.announcement.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
};

export const getReadAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const readAnnouncements = await prisma.announcementRead.findMany({
      where: { userId },
      select: {
        announcementId: true
      }
    });

    const readIds = readAnnouncements.map(ra => ra.announcementId);

    res.json({
      success: true,
      data: readIds
    });
  } catch (error) {
    console.error('Get read announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch read announcements'
    });
  }
};

export const markAnnouncementAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if already marked as read
    const existing = await prisma.announcementRead.findUnique({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId
        }
      }
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Announcement already marked as read'
      });
    }

    // Mark as read
    await prisma.announcementRead.create({
      data: {
        announcementId: id,
        userId
      }
    });

    res.json({
      success: true,
      message: 'Announcement marked as read'
    });
  } catch (error) {
    console.error('Mark announcement as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark announcement as read'
    });
  }
};

export const markAnnouncementAsUnread = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Remove read status
    await prisma.announcementRead.deleteMany({
      where: {
        announcementId: id,
        userId
      }
    });

    res.json({
      success: true,
      message: 'Announcement marked as unread'
    });
  } catch (error) {
    console.error('Mark announcement as unread error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark announcement as unread'
    });
  }
};