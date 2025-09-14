import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logSecurity } from '../utils/logger';

// Common sanitization rules
export const sanitizeString = (field: string) => 
  body(field).trim().escape().isLength({ max: 500 });

export const sanitizeEmail = (field: string = 'email') =>
  body(field).trim().normalizeEmail().isEmail().withMessage('Invalid email format');

export const sanitizeId = (field: string = 'id') =>
  param(field).isUUID().withMessage('Invalid ID format');

export const sanitizeSearchQuery = () =>
  query('search').optional().trim().escape().isLength({ max: 100 });

export const sanitizePagination = () => [
  query('page').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
];

// Middleware to check validation results
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log potential security issues
    const errorMessages = errors.array().map(err => err.msg);
    logSecurity('Input validation failed', req.ip, {
      method: req.method,
      url: req.url,
      errors: errorMessages,
      userId: (req as any).user?.userId
    });
    
    return res.status(400).json({
      error: 'Invalid input data',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

// XSS protection middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const checkForXSS = (obj: any): boolean => {
    if (typeof obj === 'string') {
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi
      ];
      
      return xssPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForXSS(value));
    }
    
    return false;
  };
  
  // Check request body for XSS attempts
  if (req.body && checkForXSS(req.body)) {
    logSecurity('XSS attempt detected', req.ip, {
      method: req.method,
      url: req.url,
      body: req.body,
      userId: (req as any).user?.userId
    });
    
    return res.status(400).json({
      error: 'Potentially malicious content detected',
      code: 'XSS_DETECTED'
    });
  }
  
  next();
};

// SQL injection detection middleware  
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  // Define legitimate contact management endpoints that should be exempt from strict SQL injection checks
  const contactManagementEndpoints = [
    '/api/contacts',
    '/api/contacts/bulk',
    '/api/contacts/bulk/delete',
    '/api/contacts/bulk/update-tier', 
    '/api/contacts/bulk/add-tags',
    '/api/import'
  ];
  
  // Check if this is a safe contact management POST endpoint
  const isLegitimateContactEndpoint = req.method === 'POST' && 
    contactManagementEndpoints.some(endpoint => req.url.startsWith(endpoint));
  
  if (isLegitimateContactEndpoint) {
    // Skip SQL injection checks for legitimate contact management operations
    console.log('Skipping SQL injection checks for legitimate contact endpoint:', req.url);
    return next();
  }

  const checkForSQLInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      // More precise SQL injection patterns that avoid common business terms
      const sqlPatterns = [
        // More specific SQL commands with context
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b).*(\b(FROM|WHERE|INTO|VALUES)\b).*[';]/gi,
        // Suspicious numeric comparisons (1=1, etc.)
        /(\b(OR|AND)\b\s*\d+\s*[=<>]\s*\d+)/gi,
        // Comment-based injection attempts
        /[';"].*(-{2}|\/\*|\*\/)/gi,
        // Time-based injection functions
        /\b(sleep|benchmark|waitfor|pg_sleep)\s*\(/gi,
        // Union-based injection with select
        /(\bunion\b\s+(all\s+)?select\b)|(\bselect\b.*\bunion\b)/gi,
        // Script injection attempts
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        // Hex-encoded injection
        /0x[0-9a-f]+/gi
      ];
      
      return sqlPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForSQLInjection(value));
    }
    
    return false;
  };
  
  // Check request parameters for SQL injection attempts
  const checkObjects = [req.body, req.query, req.params];
  
  for (const obj of checkObjects) {
    if (obj && checkForSQLInjection(obj)) {
      logSecurity('SQL injection attempt detected', req.ip, {
        method: req.method,
        url: req.url,
        suspiciousData: obj,
        userId: (req as any).user?.userId
      });
      
      return res.status(400).json({
        error: 'Potentially malicious query detected',
        code: 'SQL_INJECTION_DETECTED'
      });
    }
  }
  
  next();
};

// File upload security middleware
export const fileUploadProtection = (req: Request, res: Response, next: NextFunction) => {
  if (req.file) {
    const allowedTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      logSecurity('Suspicious file upload - invalid mime type', req.ip, {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        userId: (req as any).user?.userId
      });
      
      return res.status(400).json({
        error: 'File type not allowed',
        code: 'INVALID_FILE_TYPE'
      });
    }
    
    const fileExtension = req.file.originalname.toLowerCase().substr(req.file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      logSecurity('Suspicious file upload - invalid extension', req.ip, {
        filename: req.file.originalname,
        extension: fileExtension,
        userId: (req as any).user?.userId
      });
      
      return res.status(400).json({
        error: 'File extension not allowed',
        code: 'INVALID_FILE_EXTENSION'
      });
    }
    
    // Check file size (10MB max)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        error: 'File too large (maximum 10MB)',
        code: 'FILE_TOO_LARGE'
      });
    }
  }
  
  next();
};