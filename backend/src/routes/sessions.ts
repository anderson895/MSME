import { Router } from 'express';
import {
  createSession,
  deleteSession,
  getSessions,
  getSessionById,
  markAttendance,
  updateSession
} from '../controllers/sessionController';
import { authenticateToken, requireMentor } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     tags: [Sessions]
 *     summary: Create a new training session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *               menteeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Session created successfully
 */
router.post('/', authenticateToken, requireMentor, createSession);

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: Get training sessions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 */
router.get('/', authenticateToken, getSessions);

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     tags: [Sessions]
 *     summary: Get a training session by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       404:
 *         description: Session not found
 *       403:
 *         description: Access denied
 */
router.get('/:id', authenticateToken, getSessionById);

/**
 * @swagger
 * /api/sessions/{id}:
 *   put:
 *     tags: [Sessions]
 *     summary: Update a training session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session updated successfully
 */
router.put('/:id', authenticateToken, requireMentor, updateSession);

/**
 * @swagger
 * /api/sessions/{sessionId}/attendance:
 *   post:
 *     tags: [Sessions]
 *     summary: Mark mentee attendance for a session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               menteeId:
 *                 type: string
 *                 description: Required for mentor/admin, optional for mentee (uses own ID)
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *       404:
 *         description: Session or mentee assignment not found
 *       403:
 *         description: Access denied
 */
router.post('/:sessionId/attendance', authenticateToken, markAttendance);

/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     tags: [Sessions]
 *     summary: Delete a training session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session deleted successfully
 */
router.delete('/:id', authenticateToken, requireMentor, deleteSession);

export default router;