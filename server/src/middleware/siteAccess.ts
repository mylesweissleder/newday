import { Request, Response, NextFunction } from 'express';

// Simple site-wide password protection
export const siteAccessControl = (req: Request, res: Response, next: NextFunction): void => {
  // Skip protection for health checks and auth endpoints
  if (req.path === '/health' || req.path.startsWith('/api/auth/site-access')) {
    return next();
  }

  const sitePassword = req.headers['x-site-password'] || req.query.sitePassword;
  const requiredPassword = process.env.SITE_ACCESS_PASSWORD || 'NetworkCRM2025!';

  if (!sitePassword || sitePassword !== requiredPassword) {
    res.status(401).json({ 
      error: 'Site access required', 
      code: 'SITE_ACCESS_REQUIRED',
      message: 'This application requires a site access password'
    });
    return;
  }

  next();
};

// Route to validate site access
export const validateSiteAccess = (req: Request, res: Response): void => {
  const { password } = req.body;
  const requiredPassword = process.env.SITE_ACCESS_PASSWORD || 'NetworkCRM2025!';

  if (password === requiredPassword) {
    res.json({ 
      success: true, 
      message: 'Site access granted',
      token: Buffer.from(password).toString('base64') // Simple encoding for frontend
    });
  } else {
    res.status(401).json({ 
      error: 'Invalid site access password',
      code: 'INVALID_SITE_PASSWORD'
    });
  }
};