import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3002;

// Middleware
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
      'http://localhost:5173'
    ] : 
    ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Site access control removed - using Site-Password headers for security instead

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth/site-access', siteAccessRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/accounts', authenticateToken, accountRoutes);
app.use('/api/contacts', authenticateToken, contactRoutes);
app.use('/api/campaigns', authenticateToken, campaignRoutes);
app.use('/api/outreach', authenticateToken, outreachRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/import', authenticateToken, importRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/crew', authenticateToken, crewRoutes);
app.use('/api/relationships', authenticateToken, relationshipRoutes);
app.use('/api/ai-scoring', authenticateToken, aiScoringRoutes);
app.use('/api/opportunities', authenticateToken, opportunityRoutes);
app.use('/api/network', authenticateToken, networkVisualizationRoutes);
app.use('/api/email', emailRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Network CRM Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});