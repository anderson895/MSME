import { Router } from 'express';
import { authenticateToken, requireMentor, requireMentee } from '../middleware/auth';
import { 
  getDashboardAnalytics, 
  getMenteeAnalytics,
  createSalesData,
  getRecentActivity
} from '../controllers/analyticsController';

const router = Router();

router.get('/dashboard', authenticateToken, getDashboardAnalytics);
router.get('/recent-activity', authenticateToken, getRecentActivity);
router.get('/sales/:userId', authenticateToken, requireMentor, getMenteeAnalytics);
router.post('/sales', authenticateToken, requireMentee, createSalesData);

export default router;