/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/database';

interface AuthRequest extends Request {
  user?: any;
}

export const createRating = async (req: AuthRequest, res: Response) => {
  try {
    const { mentorId, score, comment } = req.body;
    const menteeId = req.user.id;

    // Validate score
    if (score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Score must be between 1 and 5'
      });
    }

    // Check if mentor exists and is active
    const mentor = await prisma.user.findFirst({
      where: { 
        id: mentorId, 
        role: 'MENTOR',
        status: 'ACTIVE'
      }
    });

    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found or inactive'
      });
    }

    // Create or update rating
    const rating = await prisma.rating.upsert({
      where: {
        mentorId_menteeId: {
          mentorId,
          menteeId
        }
      },
      update: {
        score,
        comment
      },
      create: {
        mentorId,
        menteeId,
        score,
        comment
      },
      include: {
        mentor: {
          select: { id: true, name: true, email: true }
        },
        mentee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: rating,
      message: 'Rating submitted successfully'
    });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating'
    });
  }
};

export const getRatings = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    let ratings;

    if (user.role === 'ADMIN') {
      // Admin can see all ratings
      ratings = await prisma.rating.findMany({
        include: {
          mentor: {
            select: { id: true, name: true, email: true }
          },
          mentee: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (user.role === 'MENTOR') {
      // Mentor can see their own ratings
      ratings = await prisma.rating.findMany({
        where: { mentorId: user.id },
        include: {
          mentor: {
            select: { id: true, name: true, email: true }
          },
          mentee: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Mentee can see ratings they've given
      ratings = await prisma.rating.findMany({
        where: { menteeId: user.id },
        include: {
          mentor: {
            select: { id: true, name: true, email: true }
          },
          mentee: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({
      success: true,
      data: ratings
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings'
    });
  }
};

export const getMentorRatings = async (req: AuthRequest, res: Response) => {
  try {
    const { mentorId } = req.params;

    const ratings = await prisma.rating.findMany({
      where: { mentorId },
      include: {
        mentee: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average rating
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum: any, rating: { score: any; }) => sum + rating.score, 0) / ratings.length
      : 0;

    res.json({
      success: true,
      data: {
        ratings,
        averageRating,
        totalRatings: ratings.length
      }
    });
  } catch (error) {
    console.error('Get mentor ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentor ratings'
    });
  }
};

export const getAllRatingsForMentors = async (req: AuthRequest, res: Response) => {
  try {
    // This endpoint allows mentees to see all ratings for all mentors
    // Useful for displaying mentor ratings on the mentors page
    const ratings = await prisma.rating.findMany({
      include: {
        mentor: {
          select: { id: true, name: true, email: true }
        },
        mentee: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: ratings
    });
  } catch (error) {
    console.error('Get all ratings for mentors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ratings'
    });
  }
};