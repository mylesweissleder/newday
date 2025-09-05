import express from 'express';
import { validateSiteAccess } from '../middleware/siteAccess';

const router = express.Router();

// Validate site access password
router.post('/validate', validateSiteAccess);

// Get site info (no password required)
router.get('/info', (req, res) => {
  res.json({
    siteName: 'Network CRM',
    description: 'AI-Powered Contact Management & Network Mining',
    version: '1.0.0',
    requiresAccess: true
  });
});

export default router;