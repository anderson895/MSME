/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/database';

interface AuthRequest extends Request {
  user?: any;
}

export const getChatUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    let chatUsers: any[] = [];

    if (user.role === 'ADMIN') {
      // Admin can chat with all active users
      chatUsers = await prisma.user.findMany({
        where: { 
          status: 'ACTIVE',
          id: { not: user.id } // Exclude self
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true
        },
        orderBy: { name: 'asc' }
      });

      // Add General Chat group for admin
      const generalGroup = await prisma.chatGroup.findFirst({
        where: { isGeneral: true }
      });
      
      if (generalGroup) {
        chatUsers.unshift({
          id: generalGroup.id,
          name: generalGroup.name,
          role: 'GROUP',
          isGroup: true
        });
      }
    } else if (user.role === 'MENTOR') {
      // Mentor can chat with assigned mentees and admins
      const assignedMentees = await prisma.user.findMany({
        where: {
          role: 'MENTEE',
          status: 'ACTIVE',
          menteeSessions: {
            some: {
              session: {
                mentorId: user.id
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true
        }
      });

      const admins = await prisma.user.findMany({
        where: { 
          role: 'ADMIN',
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true
        }
      });

      // Fetch groups that mentor is a member of
      const groupMemberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      });

      const groups = groupMemberships.map(membership => ({
        id: membership.group.id,
        name: membership.group.name,
        role: 'GROUP',
        isGroup: true,
        description: membership.group.description
      }));

      chatUsers = [...groups, ...assignedMentees, ...admins];
    } else {
      // Mentee can chat with assigned mentors and admins
      const assignedMentors = await prisma.user.findMany({
        where: {
          role: 'MENTOR',
          status: 'ACTIVE',
          mentorSessions: {
            some: {
              mentees: {
                some: {
                  menteeId: user.id
                }
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true
        }
      });

      const admins = await prisma.user.findMany({
        where: { 
          role: 'ADMIN',
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true
        }
      });

      // Add General Chat group for mentees
      const generalGroup = await prisma.chatGroup.findFirst({
        where: { isGeneral: true }
      });
      
      chatUsers = [...assignedMentors, ...admins];
      
      if (generalGroup) {
        chatUsers.unshift({
          id: generalGroup.id,
          name: generalGroup.name,
          role: 'GROUP',
          isGroup: true
        });
      }
    }

    res.json({
      success: true,
      data: chatUsers
    });
  } catch (error) {
    console.error('Get chat users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat users'
    });
  }
};

export const getDirectMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Verify target user exists and is active
    const targetUser = await prisma.user.findFirst({
      where: { 
        id: userId,
        status: 'ACTIVE'
      }
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Fetch direct messages between current user and target user
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: currentUserId,
            receiverId: userId
          },
          {
            senderId: userId,
            receiverId: currentUserId
          }
        ],
        groupId: null // Only direct messages
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get direct messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
};

export const getGroupMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Verify user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Fetch group messages
    const messages = await prisma.message.findMany({
      where: {
        groupId,
        receiverId: null // Only group messages
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group messages'
    });
  }
};

export const markMessagesAsRead = async (req: AuthRequest, res: Response) => {
  try {
    // const { messageIds } = req.body;

    // This is a placeholder for read status functionality
    // You can extend this when you add read status to your message schema
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
};

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, memberIds } = req.body;
    const { user } = req;

    // Only mentors and admins can create groups
    if (user.role !== 'MENTOR' && user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only mentors and admins can create groups'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    // Create the group
    const group = await prisma.chatGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isGeneral: false
      }
    });

    // Add creator as member
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id
      }
    });

    // Add other members if provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const validMemberIds = memberIds.filter((id: string) => id !== user.id); // Exclude creator
      
      if (validMemberIds.length > 0) {
        await prisma.groupMember.createMany({
          data: validMemberIds.map((memberId: string) => ({
            groupId: group.id,
            userId: memberId
          })),
          skipDuplicates: true
        });
      }
    }

    // Fetch the created group with members
    const createdGroup = await prisma.chatGroup.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: createdGroup!.id,
        name: createdGroup!.name,
        description: createdGroup!.description,
        role: 'GROUP',
        isGroup: true,
        members: createdGroup!.members.map(m => m.user)
      },
      message: 'Group created successfully'
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group'
    });
  }
};

export const addGroupMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const { user } = req;

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: user.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Member IDs are required'
      });
    }

    // Add members
    await prisma.groupMember.createMany({
      data: memberIds.map((memberId: string) => ({
        groupId,
        userId: memberId
      })),
      skipDuplicates: true
    });

    res.json({
      success: true,
      message: 'Members added successfully'
    });
  } catch (error) {
    console.error('Add group members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add members'
    });
  }
};