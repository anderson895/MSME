import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireMentor } from '../middleware/auth';
import { 
  createResource, 
  getResources, 
  getResourceById,
  updateResource,
  deleteResource,
  getCategories,
  downloadResource
} from '../controllers/resourceController';

const router = Router();

// Ensure uploads directory exists (use absolute path)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path for production compatibility
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + sanitizedOriginalName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') } // 5MB
});

/**
 * @swagger
 * /api/resources:
 *   post:
 *     tags: [Resources]
 *     summary: Upload a new resource
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Resource uploaded successfully
 */
router.post('/', authenticateToken, requireMentor, upload.single('file'), createResource);

/**
 * @swagger
 * /api/resources:
 *   get:
 *     tags: [Resources]
 *     summary: Get all resources
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resources retrieved successfully
 */
router.get('/', authenticateToken, getResources);

/**
 * @swagger
 * /api/resources/categories:
 *   get:
 *     tags: [Resources]
 *     summary: Get all resource categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', authenticateToken, getCategories);

/**
 * @swagger
 * /api/resources/{id}/download:
 *   get:
 *     tags: [Resources]
 *     summary: Download a resource file
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
 *         description: File download initiated
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/download', authenticateToken, downloadResource);

/**
 * @swagger
 * /api/resources/{id}:
 *   get:
 *     tags: [Resources]
 *     summary: Get resource by ID
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
 *         description: Resource retrieved successfully
 */
router.get('/:id', authenticateToken, getResourceById);

/**
 * @swagger
 * /api/resources/{id}:
 *   put:
 *     tags: [Resources]
 *     summary: Update a resource
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resource updated successfully
 */
router.put('/:id', authenticateToken, upload.single('file'), updateResource);

/**
 * @swagger
 * /api/resources/{id}:
 *   delete:
 *     tags: [Resources]
 *     summary: Delete a resource
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
 *         description: Resource deleted successfully
 */
router.delete('/:id', authenticateToken, deleteResource);

export default router;