/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/database';

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