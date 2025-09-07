import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

// Middleware imports
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { siteAccessControl } from './middleware/siteAccess';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 
    ['https://api.whatintheworldwasthat.com', 'https://whatintheworldwasthat.com', 'https://www.whatintheworldwasthat.com', 'https://network-crm.vercel.app'] : 
    ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply site access control in production
if (process.env.NODE_ENV === 'production') {
  app.use(siteAccessControl);
}

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