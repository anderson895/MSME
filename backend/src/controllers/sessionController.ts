/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/database';
import { CreateSessionRequest } from '../types';
import { getIO } from '../utils/socket';
import { sendSessionNotificationEmail } from '../config/email';

interface AuthRequest extends Request {
  user?: any;
}

export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, duration, meetingUrl, menteeIds }: CreateSessionRequest = req.body;
    const mentorId = req.user.id;

    const session = await prisma.session.create({
      data: {
        title,
        description,
        date: new Date(date),
        duration,
        meetingUrl: meetingUrl || null,
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

    // Send email notifications to all assigned mentees
    if (session.mentees && session.mentees.length > 0) {
      const emailPromises = session.mentees.map(async (sessionMentee) => {
        try {
          await sendSessionNotificationEmail(
            sessionMentee.mentee.email,
            sessionMentee.mentee.name,
            session.title,
            session.description,
            session.date,
            session.duration,
            session.mentor.name
          );
        } catch (error) {
          console.error(`Failed to send email notification to ${sessionMentee.mentee.email}:`, error);
          // Continue with other emails even if one fails
        }
      });

      // Send emails in parallel, but don't wait for all to complete
      Promise.all(emailPromises).catch((error) => {
        console.error('Error sending some session notification emails:', error);
      });
    }

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

export const getSessionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user } = req;

    console.log('[Backend] getSessionById called:', {
      sessionId: id,
      userId: user.id,
      userRole: user.role,
      userName: user.name
    });

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        mentor: { select: { id: true, name: true, email: true } },
        mentees: {
          include: {
            mentee: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!session) {
      console.warn('[Backend] Session not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    console.log('[Backend] Session found:', {
      sessionId: session.id,
      title: session.title,
      mentorId: session.mentorId,
      menteesCount: session.mentees.length,
      menteeIds: session.mentees.map(sm => sm.menteeId)
    });

    // Check if user has access to this session
    if (user.role === 'MENTOR') {
      if (session.mentorId !== user.id) {
        console.warn('[Backend] Access denied - Mentor trying to access another mentor\'s session:', {
          sessionMentorId: session.mentorId,
          requestingUserId: user.id
        });
        return res.status(403).json({
          success: false,
          message: 'You can only view your own sessions'
        });
      }
      console.log('[Backend] Mentor access granted');
    } else if (user.role === 'MENTEE') {
      // Check if mentee is part of this session
      const isMenteeInSession = session.mentees.some(sm => sm.menteeId === user.id);
      console.log('[Backend] Mentee access check:', {
        isMenteeInSession,
        menteeId: user.id,
        sessionMentees: session.mentees.map(sm => sm.menteeId)
      });
      if (!isMenteeInSession) {
        console.warn('[Backend] Access denied - Mentee not part of session');
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this session'
        });
      }
      console.log('[Backend] Mentee access granted');
    } else {
      console.log('[Backend] Admin access granted (no restrictions)');
    }
    // ADMIN can view all sessions

    console.log('[Backend] Returning session data to client');
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('[Backend] Get session by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session'
    });
  }
};

export const updateSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, date, duration, status, menteeIds, meetingUrl } = req.body;
    const { user } = req;

    // Check if session exists
    const existingSession = await prisma.session.findUnique({
      where: { id }
    });

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if user has permission to update this session
    if (user.role === 'MENTOR') {
      if (existingSession.mentorId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own sessions'
        });
      }
    }

    // Get current session with mentees to check if it's a group session
    const sessionWithMentees = await prisma.session.findUnique({
      where: { id },
      include: {
        mentees: true
      }
    });

    const isGroupSession = sessionWithMentees && sessionWithMentees.mentees.length > 1;

    // Prepare update data
    const updateData: any = {
      title,
      description,
      date: date ? new Date(date) : undefined,
      duration,
      status
    };

    // Handle meetingUrl: For group sessions, use provided URL or keep existing
    // For one-on-one sessions, auto-generate simple-peer URL if not provided
    if (status === 'IN_PROGRESS' && existingSession.status !== 'IN_PROGRESS') {
      if (meetingUrl && meetingUrl.trim()) {
        // Use provided meeting URL (for group sessions with external links like Google Meet)
        updateData.meetingUrl = meetingUrl.trim();
      } else if (!isGroupSession && !existingSession.meetingUrl) {
        // Only auto-generate for one-on-one sessions if no URL provided
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        updateData.meetingUrl = `${frontendUrl}/video-call?sessionId=${id}`;
      }
      // For group sessions without provided URL, keep existing or leave empty (mentor must provide)
    } else if (meetingUrl !== undefined) {
      // Allow updating meetingUrl at any time (convert empty strings to null)
      updateData.meetingUrl = meetingUrl && meetingUrl.trim() ? meetingUrl.trim() : null;
    }

    // Update mentees if menteeIds are provided
    if (menteeIds && Array.isArray(menteeIds)) {
      // Delete existing session-mentee relationships
      await prisma.sessionMentee.deleteMany({
        where: { sessionId: id }
      });

      // Create new session-mentee relationships
      if (menteeIds.length > 0) {
        await prisma.sessionMentee.createMany({
          data: menteeIds.map((menteeId: string) => ({
            sessionId: id,
            menteeId
          }))
        });
      }
    }

    const session = await prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        mentor: { select: { id: true, name: true, email: true } },
        mentees: {
          include: {
            mentee: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    const io = getIO();
    
    // If status changed to IN_PROGRESS, send notifications to all mentees
    if (status === 'IN_PROGRESS' && existingSession.status !== 'IN_PROGRESS') {
      const mentees = session.mentees.map(sm => sm.mentee);
      
      // Send notifications to all mentees (only socket notification to avoid duplicates)
      for (const mentee of mentees) {
        try {
          // Only emit real-time notification via socket (database notification will be created by socket handler if needed)
          if (io) {
            io.to(`user_${mentee.id}`).emit('new_notification', {
              title: 'Session Started',
              message: `${session.title} has started! Click to join the meeting.`,
              type: 'info',
              sessionId: session.id,
              meetingUrl: session.meetingUrl,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error(`Error sending notification to mentee ${mentee.id}:`, error);
        }
      }
    }

    // If status changed to COMPLETED, notify admins for recent activity update
    if (status === 'COMPLETED' && existingSession.status !== 'COMPLETED' && io) {
      try {
        // Emit event to all admin users to refresh recent activity
        io.emit('session_completed', {
          sessionId: session.id,
          title: session.title,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error emitting session_completed event:', error);
      }
    }

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

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { menteeId } = req.body;
    const userId = req.user.id;

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        mentees: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Determine which mentee to mark attendance for
    let targetMenteeId = menteeId;
    
    // If user is a mentee, they can mark their own attendance
    if (req.user.role === 'MENTEE') {
      targetMenteeId = userId;
    } 
    // If user is mentor, they can mark attendance for mentees in their sessions
    else if (req.user.role === 'MENTOR') {
      if (session.mentorId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. You can only mark attendance for sessions you created.'
        });
      }
      // If menteeId not provided and user is mentor, return error
      if (!menteeId) {
        return res.status(400).json({
          success: false,
          message: 'menteeId is required when marking attendance as mentor'
        });
      }
      targetMenteeId = menteeId;
    }
    // Admin can mark attendance for any mentee
    else if (req.user.role === 'ADMIN') {
      if (!menteeId) {
        return res.status(400).json({
          success: false,
          message: 'menteeId is required when marking attendance as admin'
        });
      }
      targetMenteeId = menteeId;
    }

    // Check if mentee is assigned to this session
    const sessionMentee = await prisma.sessionMentee.findUnique({
      where: {
        sessionId_menteeId: {
          sessionId,
          menteeId: targetMenteeId
        }
      }
    });

    if (!sessionMentee) {
      return res.status(404).json({
        success: false,
        message: 'Mentee is not assigned to this session'
      });
    }

    // Mark attendance
    await prisma.sessionMentee.update({
      where: {
        sessionId_menteeId: {
          sessionId,
          menteeId: targetMenteeId
        }
      },
      data: {
        attended: true
      }
    });

    res.json({
      success: true,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance'
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