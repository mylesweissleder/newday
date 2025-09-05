import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        res.status(409).json({
          error: 'A record with this information already exists',
          code: 'DUPLICATE_RECORD'
        });
        return;
      case 'P2025':
        res.status(404).json({
          error: 'Record not found',
          code: 'NOT_FOUND'
        });
        return;
      case 'P2003':
        res.status(400).json({
          error: 'Invalid reference to related record',
          code: 'INVALID_REFERENCE'
        });
        return;
      default:
        res.status(500).json({
          error: 'Database error',
          code: 'DATABASE_ERROR'
        });
        return;
    }
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: error.message,
      code: 'VALIDATION_ERROR'
    });
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
    return;
  }

  // Custom errors with status codes
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    code: statusCode === 500 ? 'INTERNAL_ERROR' : 'CUSTOM_ERROR'
  });
};