import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getDirectMessages, 
  getGroupMessages, 
  getChatUsers,
  markMessagesAsRead,
  createGroup,
  addGroupMembers,
  deleteMessages,
  getGroupMembers,
  leaveGroup,
  deleteGroup,
  removeGroupMember
} from '../controllers/messageController';

const router = Router();

/**
 * @swagger
 * /api/messages/users:
 *   get:
 *     tags: [Messages]
 *     summary: Get chat users based on role
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat users retrieved successfully
 */
router.get('/users', authenticateToken, getChatUsers);

/**
 * @swagger
 * /api/messages/direct/{userId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get direct messages with a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Direct messages retrieved successfully
 */
router.get('/direct/:userId', authenticateToken, getDirectMessages);

/**
 * @swagger
 * /api/messages/group/{groupId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get group messages for a specific group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group messages retrieved successfully
 */
router.get('/group/:groupId', authenticateToken, getGroupMessages);

/**
 * @swagger
 * /api/messages/mark-read:
 *   post:
 *     tags: [Messages]
 *     summary: Mark messages as read
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 */
router.post('/mark-read', authenticateToken, markMessagesAsRead);

/**
 * @swagger
 * /api/messages/groups:
 *   post:
 *     tags: [Messages]
 *     summary: Create a new group chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Group created successfully
 */
router.post('/groups', authenticateToken, createGroup);

/**
 * @swagger
 * /api/messages/groups/{groupId}/members:
 *   post:
 *     tags: [Messages]
 *     summary: Add members to a group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberIds
 *             properties:
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Members added successfully
 */
router.post('/groups/:groupId/members', authenticateToken, addGroupMembers);

/**
 * @swagger
 * /api/messages/delete:
 *   delete:
 *     tags: [Messages]
 *     summary: Delete messages (soft delete)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID for direct messages
 *               groupId:
 *                 type: string
 *                 description: Group ID for group messages
 *     responses:
 *       200:
 *         description: Messages deleted successfully
 */
router.delete('/delete', authenticateToken, deleteMessages);

/**
 * @swagger
 * /api/messages/groups/{groupId}/members:
 *   get:
 *     tags: [Messages]
 *     summary: Get group members list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group members retrieved successfully
 */
router.get('/groups/:groupId/members', authenticateToken, getGroupMembers);

/**
 * @swagger
 * /api/messages/groups/{groupId}/leave:
 *   post:
 *     tags: [Messages]
 *     summary: Leave a group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left group successfully
 */
router.post('/groups/:groupId/leave', authenticateToken, leaveGroup);

/**
 * @swagger
 * /api/messages/groups/{groupId}:
 *   delete:
 *     tags: [Messages]
 *     summary: Delete a group (creator or admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted successfully
 */
router.delete('/groups/:groupId', authenticateToken, deleteGroup);

/**
 * @swagger
 * /api/messages/groups/{groupId}/members/{memberId}:
 *   delete:
 *     tags: [Messages]
 *     summary: Remove a member from group (creator or admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete('/groups/:groupId/members/:memberId', authenticateToken, removeGroupMember);

export default router;