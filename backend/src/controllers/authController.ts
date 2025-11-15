/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/database';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../config/email';
import { LoginRequest, RegisterRequest, AuthTokens } from '../types';
import { validatePassword } from '../utils/passwordValidation';

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
    
    // Check if business permit is required for mentees
    if (role === 'MENTEE' && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Business permit document is required for mentee registration'
      });
    }

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email }
      });
    } catch (dbError: any) {
      // Handle database connection errors
      if (dbError.code === 'P1000' || dbError.message?.includes('Authentication failed') || dbError.message?.includes('database credentials')) {
        console.error('Database authentication error:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database connection error. Please check your database credentials.',
          ...(process.env.NODE_ENV === 'development' && { 
            details: 'Verify your DATABASE_URL in .env file. Format: mysql://username:password@localhost:3306/database_name',
            error: dbError.message
          })
        });
      }
      
      // Handle database not found errors
      if (dbError.code === 'P1003' || dbError.message?.includes('does not exist')) {
        console.error('Database not found error:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database not found. Please create the database first.',
          ...(process.env.NODE_ENV === 'development' && { 
            details: 'Run: CREATE DATABASE mentorship_db; in MySQL, then run: npm run db:push',
            error: dbError.message,
            fixSteps: [
              '1. Connect to MySQL: mysql -u root -p',
              '2. Create database: CREATE DATABASE mentorship_db;',
              '3. Run: npm run db:push (in backend directory)',
              '4. Restart the server'
            ]
          })
        });
      }
      
      throw dbError; // Re-throw if it's not a connection error
    }

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

    // Prepare user data
    const userData: any = {
      name,
      email,
      passwordHash,
      role,
      status: role === 'MENTOR' ? 'PENDING_APPROVAL' : 'ACTIVE',
      verified,
      verificationToken,
      verificationTokenExpires
    };

    // Add business permit data for mentees
    if (role === 'MENTEE' && req.file) {
      userData.businessPermitUrl = `/uploads/${req.file.filename}`;
      userData.businessPermitFileName = req.file.originalname;
      userData.businessPermitFileSize = req.file.size;
    }

    // Create user
    const user = await prisma.user.create({
      data: userData
    });

    // Send verification email for mentees
    if (role === 'MENTEE' && verificationToken) {
      try {
        await sendVerificationEmail(email, name, verificationToken);
        console.log(`Verification email sent successfully to ${email}`);
      } catch (emailError: any) {
        console.error('Failed to send verification email:', emailError);
        console.error('Email error details:', {
          message: emailError.message,
          code: emailError.code,
          response: emailError.response
        });
        // Log email configuration status
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          console.error('EMAIL_USER or EMAIL_PASS environment variables are not set!');
        }
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
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError' || error.message?.includes('required')) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Validation error: Please check your input'
      });
    }
    
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message || 'Internal server error'
        : 'Internal server error. Please try again later.'
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

    // Check if mentee account is pending approval (after email verification)
    if (user.role === 'MENTEE' && user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending admin approval. Please wait for an administrator to approve your account before you can log in.'
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

    // Update user as verified and set status to PENDING_APPROVAL (requires admin approval)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        status: 'PENDING_APPROVAL',
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
      message: 'Email verified successfully! Your account is now pending admin approval. You will be notified once your account has been approved and you can access the platform.'
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
      console.log(`Verification email resent successfully to ${email}`);
      res.json({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.'
      });
    } catch (emailError: any) {
      console.error('Failed to send verification email:', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        code: emailError.code
      });
      res.status(500).json({
        success: false,
        message: emailError.message || 'Failed to send verification email. Please check email configuration.'
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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Don't reveal if user exists or not for security reasons
    // Always return success message
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires
      }
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, user.name, resetToken);
      console.log(`Password reset email sent successfully to ${email}`);
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (emailError: any) {
      console.error('Failed to send password reset email:', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        code: emailError.code
      });
      res.status(500).json({
        success: false,
        message: emailError.message || 'Failed to send password reset email. Please check email configuration.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Validate password requirements
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message || 'Password does not meet requirements'
      });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};