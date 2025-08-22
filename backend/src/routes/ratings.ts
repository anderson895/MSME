import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  createRating, 
  getRatings, 
  getMentorRatings 
} from '../controllers/ratingController';

const router = Router();

/**
 * @swagger
 * /api/ratings:
 *   post:
 *     tags: [Ratings]
 *     summary: Create a rating for a mentor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mentorId:
 *                 type: string
 *               score:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating created successfully
 */
router.post('/', authenticateToken, createRating);

/**
 * @swagger
 * /api/ratings:
 *   get:
 *     tags: [Ratings]
 *     summary: Get ratings (filtered by user role)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ratings retrieved successfully
 */
router.get('/', authenticateToken, getRatings);

/**
 * @swagger
 * /api/ratings/mentor/{mentorId}:
 *   get:
 *     tags: [Ratings]
 *     summary: Get ratings for a specific mentor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mentorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mentor ratings retrieved successfully
 */
router.get('/mentor/:mentorId', authenticateToken, getMentorRatings);

export default router;