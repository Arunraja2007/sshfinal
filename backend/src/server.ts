import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './api/routes/auth.routes.js';
import projectsRouter from './api/routes/projects.routes.js';
import anomaliesRouter from './api/routes/anomalies.routes.js';
import analyticsRouter from './api/routes/analytics.routes.js';
import gisRouter from './api/routes/gis.routes.js';
import auditorRouter from './api/routes/auditor.routes.js';
import implementingAgencyRouter from './api/routes/implementingAgency.routes.js';
import mpRouter from './api/routes/mp.routes.js';
import publicRouter from './api/routes/public.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { validateHouse } from './middleware/validation.js';
import { optionalAuth } from './middleware/auth.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(validateHouse);
app.use(optionalAuth);

// Health checks and status
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'MPLADS Sentinel API',
    
    timestamp: new Date().toISOString(),
  });
});

app.get(['/', '/api'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'MPLADS Sentinel API',
    endpoints: [
      '/health',
      '/api/auth/profile',
      '/api/auth/demo-accounts',
      '/api/projects',
      '/api/anomalies',
      '/api/analytics',
      '/api/gis',
      '/api/auditor',
      '/api/implementing-agency',
      '/api/mp',
    ],
  });
});

// Mount modular REST APIs
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/anomalies', anomaliesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/gis', gisRouter);
app.use('/api/auditor', auditorRouter);
app.use('/api/implementing-agency', implementingAgencyRouter);
app.use('/api/mp', mpRouter);
app.use('/api/public', publicRouter);

// Global error handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[MPLADS Sentinel Backend] Server running on http://localhost:${PORT}`);
  });
}

export default app;
