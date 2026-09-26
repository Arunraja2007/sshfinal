import { Router } from 'express';
import { getDashboardKPIs, getCategoryBreakdown, getObservatoryAnalytics, getStateRiskRankings } from '../../controllers/analytics.controller.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/kpis', optionalAuth, getDashboardKPIs);
router.get('/categories', optionalAuth, getCategoryBreakdown);
router.get('/observatory', optionalAuth, getObservatoryAnalytics);
router.get('/state-risk', optionalAuth, getStateRiskRankings);

export default router;
