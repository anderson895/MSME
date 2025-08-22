/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/database';
import { sendVerificationEmail, sendWelcomeEmail } from '../config/email';
import { LoginRequest, RegisterRequest, AuthTokens } from '../types';

interface AuthRequest extends Request {
  user?: any;
}

// Load secrets safely and fail-fast if missing
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets are not defined in environment variables');
}

const generateTokens = (userId: string): AuthTokens => {
  const accessToken = jwt.sign(
    { userId },
    JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as SignOptions
  );

  const refreshToken = jwt.sign(
    { userId },
    JWT_REFRESH_SECRET as string,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as SignOptions
  );

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'MENTEE' }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token for mentees
    let verificationToken = null;
    let verificationTokenExpires = null;
    let verified = role !== 'MENTEE'; // Auto-verify non-mentees

    if (role === 'MENTEE') {
      verificationToken = require('crypto').randomBytes(32).toString('hex');
      verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      verified = false;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        status: role === 'MENTOR' ? 'PENDING_APPROVAL' : 'ACTIVE',
        verified,
        verificationToken,
        verificationTokenExpires
      }
    });

    // Send verification email for mentees
    if (role === 'MENTEE' && verificationToken) {
      try {
        await sendVerificationEmail(email, name, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue with registration even if email fails
      }
    }

    // Auto-join general group chat for mentees
    if (role === 'MENTEE') {
      try {
        let generalGroup = await prisma.chatGroup.findFirst({
          where: { isGeneral: true }
        });

        if (!generalGroup) {
          generalGroup = await prisma.chatGroup.create({
            data: {
              name: 'General Chat',
              description: 'General discussion for all mentees',
              isGeneral: true
            }
          });
        }

        await prisma.groupMember.create({
          data: {
            groupId: generalGroup.id,
            userId: user.id
          }
        });

        console.log(`Mentee ${user.name} automatically added to General Chat`);
      } catch (error) {
        console.error('Failed to add mentee to general chat:', error);
        // Continue with registration even if chat group addition fails
      }
    }

    const tokens = generateTokens(user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;

    // For mentors, don't include tokens since they can't log in yet
    const responseData = role === 'MENTOR' 
      ? { user: userWithoutPassword }
      : { user: userWithoutPassword, ...tokens };

    res.status(201).json({
      success: true,
      data: responseData,
      message: role === 'MENTEE' 
        ? 'Registration successful! Please check your email to verify your account.'
        : role === 'MENTOR'
        ? 'Registration successful! Your mentor account is pending admin approval. You will be notified once approved.'
        : 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    console.log(user)

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password using bcrypt
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Check if mentor account is approved
    if (user.role === 'MENTOR' && user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Your mentor account is pending admin approval. Please wait for an administrator to approve your account before you can log in.'
      });
    }

    // Check if mentee account is verified
    if (user.role === 'MENTEE' && !user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        requiresVerification: true
      });
    }

    const tokens = generateTokens(user.id);

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        ...tokens
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      JWT_REFRESH_SECRET as string
    ) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, status: 'ACTIVE' }
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const tokens = generateTokens(user.id);
    

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token as string,
        verificationTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        verificationToken: null,
        verificationTokenExpires: null
      }
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in to your account.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Account is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires
      }
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, user.name, verificationToken);
      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};