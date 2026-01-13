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
      const [
        totalUsers,
        totalMentors,
        totalMentees,
        totalSessions,
        completedSessions,
        totalResources,
        pendingApprovals
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'MENTOR' } }),
        prisma.user.count({ where: { role: 'MENTEE' } }),
        prisma.session.count(),
        prisma.session.count({ where: { status: 'COMPLETED' } }),
        prisma.resource.count(),
        prisma.user.count({ where: { status: 'PENDING_APPROVAL' } })
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

      // Fetch all MSME (mentee) sales data and aggregate by category
      const allMenteeSalesData = await prisma.salesData.findMany({
        where: {
          user: {
            role: 'MENTEE'
          }
        }
      });

      // Calculate category totals for all MSMEs
      const msmeCategoryTotals: Record<string, number> = {};
      allMenteeSalesData.forEach((data) => {
        const category = data.category || 'Other';
        msmeCategoryTotals[category] = (msmeCategoryTotals[category] || 0) + data.revenue;
      });

      // Format category data for pie chart
      const msmeCategoryData = [
        { name: 'Product Sales', value: msmeCategoryTotals['Product Sales'] || 0 },
        { name: 'Service Sales', value: msmeCategoryTotals['Service Sales'] || 0 },
        { name: 'Consulting', value: msmeCategoryTotals['Consulting'] || 0 },
        { name: 'Other', value: msmeCategoryTotals['Other'] || 0 }
      ];

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers: Number(totalUsers),
            totalMentors: Number(totalMentors),
            totalMentees: Number(totalMentees),
            totalSessions: Number(totalSessions),
            completedSessions: Number(completedSessions),
            totalResources: Number(totalResources),
            pendingApprovals: Number(pendingApprovals)
          },
          monthlyRegistrations,
          msmeCategoryData
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
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
      });

      const totalRevenue = salesData.reduce((sum, data) => sum + data.revenue, 0);
      const averageMonthlyRevenue = salesData.length > 0 ? totalRevenue / salesData.length : 0;

      // Calculate category totals
      const categoryTotals: Record<string, number> = {};
      salesData.forEach((data) => {
        const category = data.category || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + data.revenue;
      });

      // Format category data for pie chart
      const categoryData = [
        { name: 'Product Sales', value: categoryTotals['Product Sales'] || 0 },
        { name: 'Service Sales', value: categoryTotals['Service Sales'] || 0 },
        { name: 'Consulting', value: categoryTotals['Consulting'] || 0 },
        { name: 'Other', value: categoryTotals['Other'] || 0 }
      ];

      const attendedSessionsCount = await prisma.sessionMentee.count({
        where: {
          menteeId: user.id,
          attended: true,
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
          categoryData,
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
    const { revenue, category, month, year } = req.body;
    const userId = req.user.id;

    // Validate category
    const validCategories = ['Product Sales', 'Service Sales', 'Consulting', 'Other'];
    const salesCategory = validCategories.includes(category) ? category : 'Other';

    const salesData = await prisma.salesData.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year
        }
      },
      update: { 
        revenue,
        category: salesCategory
      },
      create: {
        userId,
        revenue,
        category: salesCategory,
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
    const [recentMentors, recentMentees, recentSessions, recentResources] = await Promise.all([
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
      // Recent mentee registrations (include all statuses to show new registrations)
      prisma.user.findMany({
        where: {
          role: 'MENTEE'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
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
      ...recentMentees.map(mentee => ({
        type: 'MENTEE_REGISTERED' as const,
        title: mentee.status === 'PENDING_APPROVAL' 
          ? 'New mentee registered (Pending Approval)' 
          : 'New mentee registered',
        description: mentee.name,
        timestamp: mentee.createdAt,
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