import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/openai';
import { networkChatService } from '../services/networkChatService';

const router = express.Router();
const prisma = new PrismaClient();

// Analyze single contact with AI
router.post('/analyze-contact/:id', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const insights = await aiService.analyzeContact(contact);

    // Store insights in database
    await prisma.contact.update({
      where: { id: req.params.id },
      data: {
        aiInsights: insights as any,
        updatedById: req.user!.id
      }
    });

    res.json(insights);
  } catch (error) {
    console.error('AI contact analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze contact' });
  }
});

// Analyze entire network
router.post('/analyze-network', async (req: Request, res: Response) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { 
        accountId: req.user!.accountId,
        status: 'ACTIVE'
      },
      include: {
        relationships: {
          include: {
            relatedContact: true
          }
        }
      }
    });

    const networkAnalysis = await aiService.analyzeNetwork(contacts);

    res.json(networkAnalysis);
  } catch (error) {
    console.error('AI network analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze network' });
  }
});

// Generate personalized outreach message
router.post('/generate-message/:id', async (req: Request, res: Response) => {
  try {
    const { context, tone = 'professional' } = req.body;

    if (!context) {
      return res.status(400).json({ error: 'Context is required for message generation' });
    }

    const contact = await prisma.contact.findFirst({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const message = await aiService.generateOutreachMessage(contact, context, tone);

    res.json({ message });
  } catch (error) {
    console.error('AI message generation error:', error);
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

// Find similar contacts
router.get('/similar-contacts/:id', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const allContacts = await prisma.contact.findMany({
      where: { 
        accountId: req.user!.accountId,
        status: 'ACTIVE',
        id: { not: contact.id }
      }
    });

    const similarContacts = await aiService.findSimilarContacts(contact, allContacts);

    res.json(similarContacts);
  } catch (error) {
    console.error('Find similar contacts error:', error);
    res.status(500).json({ error: 'Failed to find similar contacts' });
  }
});

// Get contact recommendations based on criteria
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const { 
      criteria,
      tier,
      industry,
      relationship_type,
      limit = 10
    } = req.body;

    if (!criteria) {
      return res.status(400).json({ error: 'Search criteria is required' });
    }

    // Build filter based on criteria
    const where: any = {
      accountId: req.user!.accountId,
      status: 'ACTIVE'
    };

    if (tier) {
      where.tier = tier;
    }

    if (relationship_type) {
      where.relationshipType = relationship_type;
    }

    const contacts = await prisma.contact.findMany({
      where,
      take: Number(limit) * 2, // Get more to filter through AI
      orderBy: [
        { tier: 'asc' },
        { updatedAt: 'desc' }
      ]
    });

    // Use AI to rank contacts based on criteria
    const rankedContacts = contacts
      .map(contact => ({
        ...contact,
        relevanceScore: calculateRelevance(contact, criteria, industry)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, Number(limit));

    res.json(rankedContacts);
  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Helper function to calculate relevance score
function calculateRelevance(contact: any, criteria: string, industry?: string): number {
  let score = 0;
  const criteriaLower = criteria.toLowerCase();
  
  // Company match
  if (contact.company && contact.company.toLowerCase().includes(criteriaLower)) {
    score += 3;
  }
  
  // Position match
  if (contact.position && contact.position.toLowerCase().includes(criteriaLower)) {
    score += 2;
  }
  
  // Tags match
  if (contact.tags && contact.tags.some((tag: string) => 
    tag.toLowerCase().includes(criteriaLower)
  )) {
    score += 2;
  }
  
  // Industry match
  if (industry && contact.company) {
    const contactIndustry = inferIndustryFromCompany(contact.company);
    if (contactIndustry.toLowerCase() === industry.toLowerCase()) {
      score += 1;
    }
  }
  
  // Tier bonus
  if (contact.tier === 'TIER_1') {
    score += 1;
  }
  
  return score;
}

function inferIndustryFromCompany(company: string): string {
  const industryKeywords: { [key: string]: string[] } = {
    'Technology': ['tech', 'software', 'AI', 'data', 'startup', 'app'],
    'Finance': ['bank', 'financial', 'investment', 'capital', 'fund'],
    'Healthcare': ['health', 'medical', 'pharma', 'biotech'],
    'Education': ['university', 'school', 'education']
  };
  
  const companyLower = company.toLowerCase();
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => companyLower.includes(keyword))) {
      return industry;
    }
  }
  
  return 'Other';
}


// Chat with your network using natural language
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ 
        error: 'Question is required and must be a string' 
      });
    }

    if (question.length > 500) {
      return res.status(400).json({ 
        error: 'Question must be less than 500 characters' 
      });
    }

    const chatQuery = {
      question: question.trim(),
      accountId: req.user!.accountId,
      userId: req.user!.id
    };

    const response = await networkChatService.processNetworkQuery(chatQuery);

    res.json({
      ...response,
      timestamp: new Date().toISOString(),
      query: question
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process your question. Please try again.',
      query_understood: false
    });
  }
});

export default router;
