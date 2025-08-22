import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { 
  createAnnouncement, 
  getAnnouncements, 
  deleteAnnouncement 
} from '../controllers/announcementController';

const router = Router();

router.post('/', authenticateToken, requireAdmin, createAnnouncement);
router.get('/', authenticateToken, getAnnouncements);
router.delete('/:id', authenticateToken, requireAdmin, deleteAnnouncement);

export default router;