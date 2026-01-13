import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  changePassword,
  getBusinessPermit,
  getUser,
  getUsers,
  getUserStats,
  updateExperienceLevel,
  updateProfile,
  updateUserStatus,
  uploadAvatar
} from '../controllers/userController';
import { authenticateToken, requireAdmin, requireMentee } from '../middleware/auth';

const router = Router();

// Ensure uploads directory exists (use absolute path)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Configure multer for avatar upload
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path for production compatibility
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitizedExt = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + sanitizedExt);
  }
});

const avatarUpload = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, MENTOR, MENTEE]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/', authenticateToken, requireMentee, getUsers);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user statistics (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 */
router.get('/stats', authenticateToken, requireAdmin, getUserStats);

/**
 * @swagger
 * /api/users/{id}/status:
 *   put:
 *     tags: [Users]
 *     summary: Update user status (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.put('/:id/status', authenticateToken, requireMentee, updateUserStatus);

/**
 * @swagger
 * /api/users/{id}/experience-level:
 *   put:
 *     tags: [Users]
 *     summary: Update mentee experience level (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               experienceLevel:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *     responses:
 *       200:
 *         description: Experience level updated successfully
 */
router.put('/:id/experience-level', authenticateToken, requireAdmin, updateExperienceLevel);

/**
 * @swagger
 * /api/users/{id}/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/:id/profile', authenticateToken, updateProfile);

/**
 * @swagger
 * /api/users/{id}/password:
 *   put:
 *     tags: [Users]
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.put('/:id/password', authenticateToken, changePassword);

/**
 * @swagger
 * /api/users/{id}/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Upload user avatar
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
router.post('/:id/avatar', authenticateToken, avatarUpload.single('avatar'), uploadAvatar);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a single user by ID
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
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticateToken, getUser);

/**
 * @swagger
 * /api/users/{id}/business-permit:
 *   get:
 *     tags: [Users]
 *     summary: Get business permit file (Admin only)
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
 *         description: Business permit file retrieved successfully
 *       404:
 *         description: Business permit not found
 */
router.get('/:id/business-permit', authenticateToken, requireAdmin, getBusinessPermit);

export default router;