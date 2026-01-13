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

      // Fetch all groups that admin is a member of
      const adminGroupMemberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        include: {
          group: true
        }
      });

      const adminGroups = adminGroupMemberships.map(membership => ({
        id: membership.group.id,
        name: membership.group.name,
        role: 'GROUP',
        isGroup: true,
        description: membership.group.description,
        createdBy: (membership.group as any).createdBy,
        isGeneral: membership.group.isGeneral
      }));

      chatUsers = [...adminGroups, ...chatUsers];
    } else if (user.role === 'MENTOR') {
      // Mentor can chat with assigned mentees and admins
      // First, get all sessions where this mentor is the mentor
      const mentorSessions = await prisma.session.findMany({
        where: {
          mentorId: user.id
        },
        select: {
          id: true
        }
      });

      const sessionIds = mentorSessions.map(s => s.id);

      // Then get all mentees assigned to these sessions
      const sessionMentees = await prisma.sessionMentee.findMany({
        where: {
          sessionId: { in: sessionIds }
        },
        select: {
          menteeId: true
        },
        distinct: ['menteeId']
      });

      const menteeIds = sessionMentees.map(sm => sm.menteeId);

      // Fetch the mentee users
      const assignedMentees = menteeIds.length > 0 ? await prisma.user.findMany({
        where: {
          id: { in: menteeIds },
          role: 'MENTEE',
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true
        }
      }) : [];

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
          group: true
        }
      });

      const groups = groupMemberships.map(membership => ({
        id: membership.group.id,
        name: membership.group.name,
        role: 'GROUP',
        isGroup: true,
        description: membership.group.description,
        createdBy: (membership.group as any).createdBy,
        isGeneral: membership.group.isGeneral
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

      // Fetch groups that mentee is a member of (including general group and groups they were added to)
      const groupMemberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        include: {
          group: true
        }
      });

      const groups = groupMemberships.map(membership => ({
        id: membership.group.id,
        name: membership.group.name,
        role: 'GROUP',
        isGroup: true,
        description: membership.group.description,
        createdBy: (membership.group as any).createdBy,
        isGeneral: membership.group.isGeneral
      }));
      
      chatUsers = [...groups, ...assignedMentors, ...admins];
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
    // Exclude deleted messages (deletedAt is null)
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
        groupId: null, // Only direct messages
        deletedAt: null // Exclude deleted messages
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
    // Exclude deleted messages (deletedAt is null)
    const messages = await prisma.message.findMany({
      where: {
        groupId,
        receiverId: null, // Only group messages
        deletedAt: null // Exclude deleted messages
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
        isGeneral: false,
        createdBy: user.id
      } as any
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

export const getGroupMembers = async (req: AuthRequest, res: Response) => {
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

    // Fetch group with members
    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
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
          },
          orderBy: { joinedAt: 'asc' }
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      } as any
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        createdBy: (group as any).createdBy,
        isGeneral: group.isGeneral,
        creator: (group as any).creator,
        members: (group as any).members.map((m: any) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.user.role,
          avatar: m.user.avatar,
          joinedAt: m.joinedAt
        }))
      }
    });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group members'
    });
  }
};

export const leaveGroup = async (req: AuthRequest, res: Response) => {
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

    // Check if it's a general group (cannot leave)
    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      select: { isGeneral: true }
    });

    if (group?.isGeneral) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave the general group'
      });
    }

    // Remove user from group
    await prisma.groupMember.delete({
      where: { id: membership.id }
    });

    res.json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave group'
    });
  }
};

export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Verify user is the creator of the group
    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      select: { createdBy: true, isGeneral: true } as any
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.isGeneral) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the general group'
      });
    }

    if ((group as any).createdBy !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator or admin can delete this group'
      });
    }

    // Delete group (cascade will delete members and messages)
    await prisma.chatGroup.delete({
      where: { id: groupId }
    });

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete group'
    });
  }
};

export const removeGroupMember = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.id;

    // Verify user is the creator of the group or admin
    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      select: { createdBy: true, isGeneral: true } as any
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if ((group as any).createdBy !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only the group creator or admin can remove members'
      });
    }

    // Find the membership to remove
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: memberId
      }
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this group'
      });
    }

    // Remove member
    await prisma.groupMember.delete({
      where: { id: membership.id }
    });

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  }
};

export const deleteMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, groupId } = req.body;
    const currentUserId = req.user.id;

    if (!userId && !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Either userId or groupId is required'
      });
    }

    let whereClause: any = {};

    if (groupId) {
      // For group messages, verify user is a member
      const membership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: currentUserId
        }
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      whereClause = {
        groupId,
        receiverId: null
      };
    } else if (userId) {
      // For direct messages, verify target user exists
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

      // Only delete messages where current user is the sender or receiver
      whereClause = {
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
        groupId: null
      };
    }

    // Soft delete: set deletedAt timestamp instead of actually deleting
    const result = await prisma.message.updateMany({
      where: {
        ...whereClause,
        deletedAt: null // Only update messages that aren't already deleted
      },
      data: {
        deletedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Messages deleted successfully',
      data: { count: result.count }
    });
  } catch (error) {
    console.error('Delete messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete messages'
    });
  }
};