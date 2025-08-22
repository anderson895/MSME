/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/database';
import { CreateSessionRequest } from '../types';

interface AuthRequest extends Request {
  user?: any;
}

export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, duration, menteeIds }: CreateSessionRequest = req.body;
    const mentorId = req.user.id;

    const session = await prisma.session.create({
      data: {
        title,
        description,
        date: new Date(date),
        duration,
        mentorId,
        mentees: {
          create: menteeIds.map(menteeId => ({ menteeId }))
        }
      },
      include: {
        mentor: { select: { id: true, name: true, email: true } },
        mentees: {
          include: {
            mentee: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: session,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session'
    });
  }
};

export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    let sessions;

    if (user.role === 'ADMIN') {
      sessions = await prisma.session.findMany({
        include: {
          mentor: { select: { id: true, name: true, email: true } },
          mentees: {
            include: {
              mentee: { select: { id: true, name: true, email: true } }
            }
          }
        },
        orderBy: { date: 'asc' }
      });
    } else if (user.role === 'MENTOR') {
      sessions = await prisma.session.findMany({
        where: { mentorId: user.id },
        include: {
          mentor: { select: { id: true, name: true, email: true } },
          mentees: {
            include: {
              mentee: { select: { id: true, name: true, email: true } }
            }
          }
        },
        orderBy: { date: 'asc' }
      });
    } else {
      sessions = await prisma.session.findMany({
        where: {
          mentees: {
            some: { menteeId: user.id }
          }
        },
        include: {
          mentor: { select: { id: true, name: true, email: true } },
          mentees: {
            include: {
              mentee: { select: { id: true, name: true, email: true } }
            }
          }
        },
        orderBy: { date: 'asc' }
      });
    }

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions'
    });
  }
};

export const updateSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, date, duration, status } = req.body;
    const { user } = req;

    // Check if user has permission to update this session
    if (user.role === 'MENTOR') {
      const session = await prisma.session.findUnique({
        where: { id }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (session.mentorId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own sessions'
        });
      }
    }

    const session = await prisma.session.update({
      where: { id },
      data: {
        title,
        description,
        date: date ? new Date(date) : undefined,
        duration,
        status
      },
      include: {
        mentor: { select: { id: true, name: true, email: true } },
        mentees: {
          include: {
            mentee: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      data: session,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session'
    });
  }
};

export const deleteSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Check if user has permission to delete this session
    if (user.role === 'MENTOR') {
      const session = await prisma.session.findUnique({
        where: { id }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (session.mentorId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own sessions'
        });
      }
    }

    await prisma.session.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session'
    });
  }
};