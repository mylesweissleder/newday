import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';
import { validateEnvironment, getConfig } from './utils/validateEnv';

// Route imports
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import contactRoutes from './routes/contacts';
import campaignRoutes from './routes/campaigns';
import outreachRoutes from './routes/outreach';
import aiRoutes from './routes/ai';
import importRoutes from './routes/import';
import uploadRoutes from './routes/upload';
import analyticsRoutes from './routes/analytics';
import siteAccessRoutes from './routes/siteAccess';
import emailRoutes from './routes/email';
import userRoutes from './routes/user';
import crewRoutes from './routes/crew';
import relationshipRoutes from './routes/relationships';
import aiScoringRoutes from './routes/aiScoring';
import opportunityRoutes from './routes/opportunities';
import networkVisualizationRoutes from './routes/networkVisualization';

// Middleware imports
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { siteAccessControl } from './middleware/siteAccess';
import { xssProtection, sqlInjectionProtection } from './middleware/sanitizer';

dotenv.config();

// Validate environment and get configuration
const config = getConfig();

const app = express();
const prisma = new PrismaClient();
const PORT = config.port;

// Middleware
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 10, // limit each IP to 10 auth attempts per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 uploads per minute
  message: 'Too many upload requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 
    [
      'https://api.whatintheworldwasthat.com', 
      'https://whatintheworldwasthat.com', 
      'https://www.whatintheworldwasthat.com', 
      'https://network-crm.vercel.app',
      'https://truecrew.vercel.app',
      'https://truecrew-client.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173'
    ] : 
    ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(xssProtection);
app.use(sqlInjectionProtection);

// Site access control removed - using Site-Password headers for security instead

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Apply global rate limiting
app.use(limiter);

// Routes
app.use('/api/auth/site-access', siteAccessRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/accounts', authenticateToken, accountRoutes);
app.use('/api/contacts', authenticateToken, contactRoutes);
app.use('/api/campaigns', authenticateToken, campaignRoutes);
app.use('/api/outreach', authenticateToken, outreachRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/import', authenticateToken, importRoutes);
app.use('/api/upload', uploadLimiter, authenticateToken, uploadRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/crew', authenticateToken, crewRoutes);
app.use('/api/relationships', authenticateToken, relationshipRoutes);
app.use('/api/ai-scoring', authenticateToken, aiScoringRoutes);
app.use('/api/opportunities', authenticateToken, opportunityRoutes);
app.use('/api/network', authenticateToken, networkVisualizationRoutes);
app.use('/api/email', authenticateToken, emailRoutes);

// Error handling
app.use(errorHandler);

// Process monitoring and graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', new Error(String(reason)), { promise });
  gracefulShutdown('unhandledRejection');
});

app.listen(PORT, () => {
  logger.info(`🚀 Network CRM Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${config.nodeEnv}`);
  logger.info(`🔒 Security features enabled: Rate limiting, Helmet, CORS`);
  logger.info(`📝 Structured logging active`);
});