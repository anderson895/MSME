/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/database';

interface AuthRequest extends Request {
  user?: any;
}

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    if (user.role === 'ADMIN') {
      // Admin analytics
      const [
        totalUsers,
        totalMentors,
        totalMentees,
        totalSessions,
        completedSessions,
        totalResources
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'MENTOR' } }),
        prisma.user.count({ where: { role: 'MENTEE' } }),
        prisma.session.count(),
        prisma.session.count({ where: { status: 'COMPLETED' } }),
        prisma.resource.count()
      ]);

      // Monthly user registrations
      const monthlyRegistrationsRaw = await prisma.$queryRaw`
        SELECT 
          MONTH(createdAt) as month,
          YEAR(createdAt) as year,
          COUNT(*) as count
        FROM users 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY YEAR(createdAt), MONTH(createdAt)
        ORDER BY year, month
      ` as Array<{ month: number; year: number; count: bigint }>;

      // Convert BigInt to number for JSON serialization
      const monthlyRegistrations = monthlyRegistrationsRaw.map(item => ({
        month: item.month,
        year: item.year,
        count: Number(item.count)
      }));

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers: Number(totalUsers),
            totalMentors: Number(totalMentors),
            totalMentees: Number(totalMentees),
            totalSessions: Number(totalSessions),
            completedSessions: Number(completedSessions),
            totalResources: Number(totalResources)
          },
          monthlyRegistrations
        }
      });
    } else if (user.role === 'MENTOR') {
      // Mentor analytics
      const assignedMenteesCount = await prisma.sessionMentee.count({
        where: {
          session: {
            mentorId: user.id
          }
        }
      });

      const totalSessionsCount = await prisma.session.count({
        where: { mentorId: user.id }
      });

      const completedSessionsCount = await prisma.session.count({
        where: { 
          mentorId: user.id,
          status: 'COMPLETED'
        }
      });

      const averageRating = await prisma.rating.aggregate({
        where: { mentorId: user.id },
        _avg: { score: true }
      });

      const uploadedResourcesCount = await prisma.resource.count({
        where: { uploadedBy: user.id }
      });

      res.json({
        success: true,
        data: {
          assignedMentees: Number(assignedMenteesCount),
          totalSessions: Number(totalSessionsCount),
          completedSessions: Number(completedSessionsCount),
          averageRating: averageRating._avg.score || 0,
          uploadedResources: Number(uploadedResourcesCount)
        }
      });
    } else {
      // Mentee analytics - sales data
      const salesData = await prisma.salesData.findMany({
        where: { userId: user.id },
        orderBy: { month: 'asc' }
      });

      const totalRevenue = salesData.reduce((sum, data) => sum + data.revenue, 0);
      const averageMonthlyRevenue = salesData.length > 0 ? totalRevenue / salesData.length : 0;

      const attendedSessionsCount = await prisma.sessionMentee.count({
        where: {
          menteeId: user.id,
          session: {
            status: 'COMPLETED'
          }
        }
      });

      const upcomingSessionsCount = await prisma.sessionMentee.count({
        where: {
          menteeId: user.id,
          session: {
            status: 'SCHEDULED',
            date: {
              gte: new Date()
            }
          }
        }
      });

      res.json({
        success: true,
        data: {
          salesData,
          totalRevenue,
          averageMonthlyRevenue,
          attendedSessions: Number(attendedSessionsCount),
          upcomingSessions: Number(upcomingSessionsCount)
        }
      });
    }
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

export const getMenteeAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user has permission to view this data
    // Allow if: user is viewing their own data, user is ADMIN, or user is MENTOR viewing their mentee's data
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      // If user is a mentor, check if the mentee is assigned to them
      if (req.user.role === 'MENTOR') {
        // Check if there's at least one session where this mentor is assigned to this mentee
        const sessionWithMentee = await prisma.session.findFirst({
          where: {
            mentorId: req.user.id,
            mentees: {
              some: {
                menteeId: userId
              }
            }
          }
        });

        if (!sessionWithMentee) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized to view this data. This mentee is not assigned to you.'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this data'
        });
      }
    }

    const salesData = await prisma.salesData.findMany({
      where: { userId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    res.json({
      success: true,
      data: salesData
    });
  } catch (error) {
    console.error('Get mentee analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentee analytics'
    });
  }
};

export const createSalesData = async (req: AuthRequest, res: Response) => {
  try {
    const { revenue, month, year } = req.body;
    const userId = req.user.id;

    const salesData = await prisma.salesData.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year
        }
      },
      update: { revenue },
      create: {
        userId,
        revenue,
        month,
        year
      }
    });

    res.json({
      success: true,
      data: salesData,
      message: 'Sales data saved successfully'
    });
  } catch (error) {
    console.error('Create sales data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save sales data'
    });
  }
};

export const getRecentActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    // Only admins can view recent activity
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view recent activity'
      });
    }

    // Fetch recent activities (last 10 of each type)
    const [recentMentors, recentSessions, recentResources] = await Promise.all([
      // Recent mentor registrations
      prisma.user.findMany({
        where: {
          role: 'MENTOR',
          status: 'ACTIVE'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      }),
      // Recent completed sessions
      prisma.session.findMany({
        where: {
          status: 'COMPLETED'
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          mentor: {
            select: {
              name: true
            }
          }
        }
      }),
      // Recent resource uploads
      prisma.resource.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          title: true,
          createdAt: true,
          uploader: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    // Combine and sort all activities by date
    const activities = [
      ...recentMentors.map(mentor => ({
        type: 'MENTOR_REGISTERED' as const,
        title: 'New mentor registered',
        description: mentor.name,
        timestamp: mentor.createdAt,
        icon: 'users' as const
      })),
      ...recentSessions.map(session => ({
        type: 'SESSION_COMPLETED' as const,
        title: 'Training session completed',
        description: session.title,
        timestamp: session.updatedAt,
        icon: 'calendar' as const
      })),
      ...recentResources.map(resource => ({
        type: 'RESOURCE_UPLOADED' as const,
        title: 'New resource uploaded',
        description: resource.title,
        timestamp: resource.createdAt,
        icon: 'book' as const
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10); // Get top 10 most recent

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity'
    });
  }
};