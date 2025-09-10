import logger from './logger';

interface RequiredEnvVars {
  JWT_SECRET: string;
  DATABASE_URL: string;
  NODE_ENV?: string;
  PORT?: string;
  OPENAI_API_KEY?: string;
  EMAIL_HOST?: string;
  EMAIL_PORT?: string;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
}

const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];

export const validateEnvironment = (): RequiredEnvVars => {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  // Check optional but important variables
  if (!process.env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY - AI features will be disabled');
  }
  
  if (!process.env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY - Email features will be disabled');
  }
  
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set - defaulting to development');
  }
  
  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment configuration warnings:', { warnings });
  }
  
  // Fail if required variables are missing
  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error('Environment validation failed', { missing });
    throw new Error(error);
  }
  
  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters in production');
  }
  
  logger.info('Environment validation successful');
  
  return process.env as RequiredEnvVars;
};

export const getConfig = () => {
  const env = validateEnvironment();
  
  return {
    port: parseInt(env.PORT || '3002'),
    nodeEnv: env.NODE_ENV || 'development',
    isDevelopment: env.NODE_ENV !== 'production',
    isProduction: env.NODE_ENV === 'production',
    jwtSecret: env.JWT_SECRET,
    databaseUrl: env.DATABASE_URL,
    openai: {
      apiKey: env.OPENAI_API_KEY
    },
    email: {
      host: env.EMAIL_HOST,
      port: parseInt(env.EMAIL_PORT || '587'),
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS
    }
  };
};