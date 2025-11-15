import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { 
  createAnnouncement, 
  getAnnouncements, 
  deleteAnnouncement,
  getReadAnnouncements,
  markAnnouncementAsRead,
  markAnnouncementAsUnread
} from '../controllers/announcementController';

const router = Router();

router.post('/', authenticateToken, requireAdmin, createAnnouncement);
router.get('/', authenticateToken, getAnnouncements);
router.get('/read-status', authenticateToken, getReadAnnouncements);
router.post('/:id/read', authenticateToken, markAnnouncementAsRead);
router.delete('/:id/read', authenticateToken, markAnnouncementAsUnread);
// Keep delete announcement route last to avoid conflicts with /:id/read
router.delete('/:id', authenticateToken, requireAdmin, deleteAnnouncement);

export default router;