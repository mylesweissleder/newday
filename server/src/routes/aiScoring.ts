import express, { Request, Response } from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { aiScoringService } from '../services/aiScoring';

const prisma = new PrismaClient();

const router = express.Router();

// Validation schemas
const scoringConfigSchema = Joi.object({
  userGoals: Joi.array().items(Joi.string()).optional(),
  contactIds: Joi.array().items(Joi.string()).optional()
});

const batchScoringSchema = Joi.object({
  contactIds: Joi.array().items(Joi.string()).optional(),
  userGoals: Joi.array().items(Joi.string()).optional()
});

/**
 * Get AI scoring for a specific contact
 */
router.get('/contact/:id', async (req: Request, res: Response) => {
  try {
    const { userGoals } = req.query;
    const goals = userGoals ? (Array.isArray(userGoals) ? userGoals : [userGoals]) : undefined;

    const scoring = await aiScoringService.scoreContact(
      req.params.id,
      req.user!.accountId,
      goals as string[]
    );

    res.json(scoring);
  } catch (error) {
    console.error('AI scoring error:', error);
    if (error instanceof Error && error.message === 'Contact not found') {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.status(500).json({ error: 'Failed to calculate AI scoring' });
  }
});

/**
 * Trigger batch scoring for contacts
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { error, value } = batchScoringSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { contactIds, userGoals } = value;

    // Start batch scoring (runs in background)
    aiScoringService.batchScoreContacts(
      req.user!.accountId,
      contactIds,
      userGoals
    ).catch(err => console.error('Batch scoring error:', err));

    res.json({ 
      message: 'Batch scoring started',
      contactCount: contactIds?.length || 'all contacts'
    });
  } catch (error) {
    console.error('Batch scoring initiation error:', error);
    res.status(500).json({ error: 'Failed to start batch scoring' });
  }
});

/**
 * Get top priority contacts
 */
router.get('/priority', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    
    const contacts = await aiScoringService.getTopPriorityContacts(
      req.user!.accountId,
      Number(limit)
    );

    res.json({
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Priority contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch priority contacts' });
  }
});

/**
 * Get high opportunity contacts
 */
router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    
    const contacts = await aiScoringService.getHighOpportunityContacts(
      req.user!.accountId,
      Number(limit)
    );

    res.json({
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Opportunity contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunity contacts' });
  }
});

/**
 * Get strategic networking recommendations
 */
router.get('/strategic', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    
    const contacts = await aiScoringService.getStrategicNetworkingRecommendations(
      req.user!.accountId,
      Number(limit)
    );

    res.json({
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Strategic networking error:', error);
    res.status(500).json({ error: 'Failed to fetch strategic networking recommendations' });
  }
});

/**
 * Get AI scoring dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [topPriority, opportunities, strategic] = await Promise.all([
      aiScoringService.getTopPriorityContacts(req.user!.accountId, 10),
      aiScoringService.getHighOpportunityContacts(req.user!.accountId, 10),
      aiScoringService.getStrategicNetworkingRecommendations(req.user!.accountId, 10)
    ]);

    // Calculate some basic stats
    const totalScored = await prisma.contact.count({
      where: {
        accountId: req.user!.accountId,
        status: 'ACTIVE',
        priorityScore: { not: null }
      }
    });

    const avgPriorityScore = await prisma.contact.aggregate({
      where: {
        accountId: req.user!.accountId,
        status: 'ACTIVE',
        priorityScore: { not: null }
      },
      _avg: {
        priorityScore: true,
        opportunityScore: true,
        strategicValue: true
      }
    });

    res.json({
      stats: {
        totalScored,
        averages: avgPriorityScore._avg
      },
      recommendations: {
        topPriority: topPriority.slice(0, 5),
        opportunities: opportunities.slice(0, 5),
        strategic: strategic.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('AI scoring dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * Update scoring factors for a contact (manual override)
 */
router.put('/contact/:id/factors', async (req: Request, res: Response) => {
  try {
    const { scoringFactors, priorityScore, opportunityScore, strategicValue } = req.body;

    const contact = await prisma.contact.update({
      where: {
        id: req.params.id,
        accountId: req.user!.accountId
      },
      data: {
        scoringFactors: scoringFactors || undefined,
        priorityScore: priorityScore !== undefined ? priorityScore : undefined,
        opportunityScore: opportunityScore !== undefined ? opportunityScore : undefined,
        strategicValue: strategicValue !== undefined ? strategicValue : undefined,
        lastScoringUpdate: new Date()
      }
    });

    res.json({
      message: 'Scoring factors updated',
      contact: {
        id: contact.id,
        priorityScore: contact.priorityScore,
        opportunityScore: contact.opportunityScore,
        strategicValue: contact.strategicValue
      }
    });
  } catch (error) {
    console.error('Update scoring factors error:', error);
    res.status(500).json({ error: 'Failed to update scoring factors' });
  }
});

/**
 * Get contacts by scoring criteria
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      minPriority,
      minOpportunity,
      minStrategic,
      hasOpportunityFlags,
      sortBy = 'priorityScore',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      accountId: req.user!.accountId,
      status: 'ACTIVE'
    };

    // Add scoring filters
    if (minPriority) {
      where.priorityScore = { gte: Number(minPriority) };
    }
    if (minOpportunity) {
      where.opportunityScore = { gte: Number(minOpportunity) };
    }
    if (minStrategic) {
      where.strategicValue = { gte: Number(minStrategic) };
    }
    if (hasOpportunityFlags === 'true') {
      where.opportunityFlags = { not: { equals: [] } };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: {
          networkAnalytics: {
            select: {
              totalConnections: true,
              influenceScore: true,
              betweennessCentrality: true
            }
          },
          _count: {
            select: {
              outreach: true,
              relationships: true,
              relatedTo: true
            }
          }
        }
      }),
      prisma.contact.count({ where })
    ]);

    res.json({
      contacts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('AI scoring search error:', error);
    res.status(500).json({ error: 'Failed to search contacts by scoring' });
  }
});

export default router;