/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { validatePassword } from '../utils/passwordValidation';
import { getIO } from '../utils/socket';
import { sendApprovalEmail } from '../config/email';

interface AuthRequest extends Request {
  user?: any;
  file?: Express.Multer.File;
}

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, status } = req.query;
    const { user } = req;
    console.log(user)
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;

    // If user is not admin, restrict access based on role
    if (user.role !== 'ADMIN') {
      if (user.role === 'MENTOR') {
        // Mentors can only see mentees
        where.role = 'MENTEE';
      } else {
        // Mentees can't access this endpoint
        where.role = 'MENTOR';
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        verified: true,
        businessPermitUrl: true,
        businessPermitFileName: true,
        businessPermitFileSize: true,
        experienceLevel: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // For admin users, include attended sessions count for mentees
    let usersWithStats: any[] = users;
    if (user.role === 'ADMIN') {
      usersWithStats = await Promise.all(
        users.map(async (u) => {
          if (u.role === 'MENTEE') {
            // Count all sessions where mentee attended, regardless of session status
            // This includes IN_PROGRESS and COMPLETED sessions
            const attendedSessionsCount = await prisma.sessionMentee.count({
              where: {
                menteeId: u.id,
                attended: true
              }
            });
            return {
              ...u,
              attendedSessions: Number(attendedSessionsCount)
            };
          }
          return u;
        })
      );
    }

    // Only include business permit info for admins
    const usersData = user.role === 'ADMIN' 
      ? usersWithStats 
      : usersWithStats.map((user) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { businessPermitUrl, businessPermitFileName, businessPermitFileSize, attendedSessions, ...rest } = user;
          return rest;
        });

    res.json({
      success: true,
      data: usersData
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        verified: true,
        businessPermitUrl: true,
        businessPermitFileName: true,
        businessPermitFileSize: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions: users can view their own profile or view users they can interact with
    if (user.role !== 'ADMIN') {
      if (user.id !== id) {
        // Mentors can view mentees, mentees can view mentors
        if (user.role === 'MENTOR' && targetUser.role !== 'MENTEE') {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized to view this user'
          });
        }
        if (user.role === 'MENTEE' && targetUser.role !== 'MENTOR') {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized to view this user'
          });
        }
      }
    }

    // Only include business permit info for admins
    const userData = user.role === 'ADMIN' 
      ? targetUser 
      : (() => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { businessPermitUrl, businessPermitFileName, businessPermitFileSize, ...rest } = targetUser!;
          return rest;
        })();

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Get existing user to check previous status and role
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        status: true,
        role: true
      }
    });

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        verified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // If user was approved (status changed from PENDING_APPROVAL to ACTIVE), send notifications
    if (
      existingUser &&
      existingUser.status === 'PENDING_APPROVAL' &&
      status === 'ACTIVE' &&
      (user.role === 'MENTOR' || user.role === 'MENTEE')
    ) {
      // Send email notification to the approved user (non-blocking)
      sendApprovalEmail(user.email, user.name, user.role)
        .then(() => {
          console.log(`Approval email sent successfully to ${user.email} (${user.role})`);
        })
        .catch((emailError) => {
          console.error('Failed to send approval email:', emailError);
          // Don't fail the approval if email fails
        });

      // Emit socket event for mentor approvals (for admin dashboard)
      if (user.role === 'MENTOR') {
        const io = getIO();
        if (io) {
          try {
            io.emit('mentor_approved', {
              mentorId: user.id,
              name: user.name,
              timestamp: new Date()
            });
          } catch (error) {
            console.error('Error emitting mentor_approved event:', error);
          }
        }
      }
    }

    res.json({
      success: true,
      data: user,
      message: `User ${status.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, avatar } = req.body;
    
    // Check if user is updating their own profile or is admin
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this profile'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, avatar },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        verified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Check if user is updating their own password
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to change this password'
      });
    }

    // Validate new password requirements
    const passwordValidation = validatePassword(newPassword || '');
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message || 'Password does not meet requirements'
      });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password using bcrypt (same as login)
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Hash new password using bcrypt (same as registration)
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const mentors = await prisma.user.count({ where: { role: 'MENTOR' } });
    const mentees = await prisma.user.count({ where: { role: 'MENTEE' } });
    const activeUsers = await prisma.user.count({ where: { status: 'ACTIVE' } });
    const totalSessions = await prisma.session.count();
    const completedSessions = await prisma.session.count({ where: { status: 'COMPLETED' } });

    res.json({
      success: true,
      data: {
        totalUsers,
        mentors,
        mentees,
        activeUsers,
        totalSessions,
        completedSessions
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if user is updating their own avatar or is admin
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this avatar'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Generate avatar URL (relative to uploads directory)
    const avatarUrl = `/uploads/${req.file.filename}`;

    // Update user avatar
    const user = await prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        verified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: user,
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar'
    });
  }
};

export const updateExperienceLevel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { experienceLevel } = req.body;

    // Only admins can update experience level
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only admins can update experience level.'
      });
    }

    // Validate experience level
    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    if (!validLevels.includes(experienceLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience level. Must be BEGINNER, INTERMEDIATE, or ADVANCED.'
      });
    }

    // Get user to check if they are a mentee
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (targetUser.role !== 'MENTEE') {
      return res.status(400).json({
        success: false,
        message: 'Experience level can only be set for mentees (MSMEs).'
      });
    }

    // Update experience level
    const user = await prisma.user.update({
      where: { id },
      data: { experienceLevel },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        experienceLevel: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: user,
      message: `Experience level updated to ${experienceLevel} successfully`
    });
  } catch (error) {
    console.error('Update experience level error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update experience level'
    });
  }
};

export const getBusinessPermit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Only admins can view business permits
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only admins can view business permits.'
      });
    }

    // Get user with business permit info
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        businessPermitUrl: true,
        businessPermitFileName: true,
        businessPermitFileSize: true
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!targetUser.businessPermitUrl) {
      return res.status(404).json({
        success: false,
        message: 'Business permit not found for this user'
      });
    }

    // Construct file path - handle both relative and absolute paths
    let filePath: string;
    if (targetUser.businessPermitUrl.startsWith('/uploads/')) {
      // Relative path from project root
      filePath = path.join(process.cwd(), targetUser.businessPermitUrl);
    } else if (path.isAbsolute(targetUser.businessPermitUrl)) {
      // Absolute path
      filePath = targetUser.businessPermitUrl;
    } else {
      // Assume it's relative to uploads directory
      filePath = path.join(process.cwd(), 'uploads', targetUser.businessPermitUrl);
    }

    // Normalize the path to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Security check: ensure file is within uploads directory
    if (!normalizedPath.startsWith(uploadsDir)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid file path'
      });
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('Business permit file not found:', normalizedPath);
      return res.status(404).json({
        success: false,
        message: 'Business permit file not found on server'
      });
    }

    // Determine content type based on file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    }

    // Set headers for file download/view
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(targetUser.businessPermitFileName || 'business-permit')}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    // Send file with error handling
    res.sendFile(normalizedPath, (err) => {
      if (err) {
        console.error('Error sending business permit file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error serving business permit file'
          });
        }
      }
    });
  } catch (error) {
    console.error('Get business permit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve business permit'
    });
  }
};