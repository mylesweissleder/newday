import winston from 'winston';

const { combine, timestamp, errors, json, simple, colorize } = winston.format;

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    process.env.NODE_ENV === 'production' ? json() : simple()
  ),
  defaultMeta: { 
    service: 'network-crm-server',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB  
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      simple()
    )
  }));
}

// Helper functions for structured logging
export const logAuth = (action: string, userId?: string, metadata?: any) => {
  logger.info('Auth event', {
    action,
    userId,
    ...metadata,
    category: 'authentication'
  });
};

export const logSecurity = (event: string, ip?: string, metadata?: any) => {
  logger.warn('Security event', {
    event,
    ip,
    ...metadata,
    category: 'security'
  });
};

export const logError = (error: Error, context?: string, metadata?: any) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    context,
    ...metadata,
    category: 'error'
  });
};

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance metric', {
    operation,
    duration,
    ...metadata,
    category: 'performance'
  });
};

export const logDataOperation = (operation: string, table: string, userId?: string, metadata?: any) => {
  logger.info('Data operation', {
    operation,
    table,
    userId,
    ...metadata,
    category: 'data'
  });
};

export default logger;