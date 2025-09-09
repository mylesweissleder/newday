import express from 'express';

import { 
  opportunitySuggestionService, 
  UnifiedOpportunitySuggestion,
  OpportunityFilters,
  OpportunityDashboard
} from '../services/opportunitySuggestionService';
import { introductionEngine } from '../services/introductionEngine';
import { reconnectionEngine } from '../services/reconnectionEngine';
import { networkGapAnalysis } from '../services/networkGapAnalysis';
import { businessOpportunityMatcher } from '../services/businessOpportunityMatcher';

const router = express.Router();
import prisma from "../utils/prisma";

/**
 * GET /opportunities
 * Get opportunity suggestions with filters
 */
router.get('/', async (req: any, res: any) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Parse filters from query parameters
    const filters: OpportunityFilters = {
      categories: req.query.categories ? (req.query.categories as string).split(',') as any[] : undefined,
      types: req.query.types ? (req.query.types as string).split(',') as any[] : undefined,
      priorities: req.query.priorities ? (req.query.priorities as string).split(',') as any[] : undefined,
      minConfidence: req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined,
      minImpact: req.query.minImpact ? parseInt(req.query.minImpact as string) : undefined,
      timeHorizon: req.query.timeHorizon as any,
      contactIds: req.query.contactIds ? (req.query.contactIds as string).split(',') : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      sortBy: req.query.sortBy as any || 'composite'
    };

    const opportunities = await opportunitySuggestionService.generateOpportunitySuggestions(accountId, filters);

    res.json({
      opportunities,
      count: opportunities.length,
      filters: filters
    });
  } catch (error) {
    console.error('Error getting opportunities:', error);
    res.status(500).json({ 
      error: 'Failed to get opportunity suggestions',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /opportunities/dashboard
 * Get opportunity dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const dashboard = await opportunitySuggestionService.getOpportunityDashboard(accountId);
    res.json(dashboard);
  } catch (error) {
    console.error('Error getting opportunity dashboard:', error);
    res.status(500).json({ error: 'Failed to get opportunity dashboard' });
  }
});

/**
 * GET /opportunities/analytics
 * Get opportunity analytics and performance metrics
 */
router.get('/analytics', async (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string) : 90;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const analytics = await opportunitySuggestionService.getOpportunityAnalytics(accountId, timeRange);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting opportunity analytics:', error);
    res.status(500).json({ error: 'Failed to get opportunity analytics' });
  }
});

/**
 * GET /opportunities/introductions
 * Get introduction opportunities specifically
 */
router.get('/introductions', async (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const introductions = await introductionEngine.detectIntroductionOpportunities(accountId, limit);
    res.json(introductions);
  } catch (error) {
    console.error('Error getting introduction opportunities:', error);
    res.status(500).json({ error: 'Failed to get introduction opportunities' });
  }
});

/**
 * GET /opportunities/reconnections
 * Get reconnection opportunities specifically
 */
router.get('/reconnections', async (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Parse reconnection filters
    const filters: any = {};
    if (req.query.minDaysSinceContact) {
      filters.minDaysSinceContact = parseInt(req.query.minDaysSinceContact as string);
    }
    if (req.query.maxDaysSinceContact) {
      filters.maxDaysSinceContact = parseInt(req.query.maxDaysSinceContact as string);
    }
    if (req.query.relationshipTypes) {
      filters.relationshipTypes = (req.query.relationshipTypes as string).split(',');
    }

    const reconnections = await reconnectionEngine.detectReconnectionOpportunities(accountId, filters, limit);
    res.json(reconnections);
  } catch (error) {
    console.error('Error getting reconnection opportunities:', error);
    res.status(500).json({ error: 'Failed to get reconnection opportunities' });
  }
});

/**
 * GET /opportunities/business
 * Get business opportunities specifically
 */
router.get('/business', async (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Parse business opportunity filters
    const filters: any = {};
    if (req.query.opportunityTypes) {
      filters.opportunityTypes = (req.query.opportunityTypes as string).split(',');
    }
    if (req.query.minConfidence) {
      filters.minConfidence = parseFloat(req.query.minConfidence as string);
    }
    if (req.query.minImpact) {
      filters.minImpact = parseInt(req.query.minImpact as string);
    }

    const businessOpportunities = await businessOpportunityMatcher.findBusinessOpportunities(accountId, filters, limit);
    res.json(businessOpportunities);
  } catch (error) {
    console.error('Error getting business opportunities:', error);
    res.status(500).json({ error: 'Failed to get business opportunities' });
  }
});

/**
 * GET /opportunities/network-gaps
 * Get network gap analysis
 */
router.get('/network-gaps', async (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const networkAnalysis = await networkGapAnalysis.analyzeNetworkGaps(accountId);
    res.json(networkAnalysis);
  } catch (error) {
    console.error('Error getting network gap analysis:', error);
    res.status(500).json({ error: 'Failed to get network gap analysis' });
  }
});

/**
 * PUT /opportunities/:id/status
 * Update opportunity status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const opportunityId = req.params.id;
    const { status, actionType, actionData, notes, userId } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await opportunitySuggestionService.updateOpportunityStatus(
      opportunityId,
      status,
      actionType,
      actionData,
      notes,
      userId
    );

    res.json({ message: 'Opportunity status updated successfully' });
  } catch (error) {
    console.error('Error updating opportunity status:', error);
    res.status(500).json({ error: 'Failed to update opportunity status' });
  }
});

/**
 * POST /opportunities/:id/actions
 * Record an action taken on an opportunity
 */
router.post('/:id/actions', async (req, res) => {
  try {
    const opportunityId = req.params.id;
    const { actionType, actionData, result, resultData, notes, userId } = req.body;

    if (!actionType || !userId) {
      return res.status(400).json({ error: 'Action type and user ID are required' });
    }

    await prisma.opportunityAction.create({
      data: {
        opportunityId,
        actionType,
        actionData,
        result,
        resultData,
        notes,
        takenBy: userId
      }
    });

    res.json({ message: 'Action recorded successfully' });
  } catch (error) {
    console.error('Error recording opportunity action:', error);
    res.status(500).json({ error: 'Failed to record action' });
  }
});

/**
 * GET /opportunities/:id
 * Get specific opportunity details
 */
router.get('/:id', async (req, res) => {
  try {
    const opportunityId = req.params.id;

    const opportunity = await prisma.opportunitySuggestion.findUnique({
      where: { id: opportunityId },
      include: {
        primaryContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            position: true,
            email: true,
            phone: true
          }
        },
        secondaryContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            position: true,
            email: true,
            phone: true
          }
        },
        relatedContacts: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                position: true
              }
            }
          }
        },
        actions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json(opportunity);
  } catch (error) {
    console.error('Error getting opportunity details:', error);
    res.status(500).json({ error: 'Failed to get opportunity details' });
  }
});

/**
 * POST /opportunities/:id/dismiss
 * Dismiss an opportunity
 */
router.post('/:id/dismiss', async (req, res) => {
  try {
    const opportunityId = req.params.id;
    const { reason, userId } = req.body;

    await opportunitySuggestionService.updateOpportunityStatus(
      opportunityId,
      'DISMISSED',
      'DISMISS',
      { reason },
      reason,
      userId
    );

    res.json({ message: 'Opportunity dismissed successfully' });
  } catch (error) {
    console.error('Error dismissing opportunity:', error);
    res.status(500).json({ error: 'Failed to dismiss opportunity' });
  }
});

/**
 * POST /opportunities/:id/accept
 * Accept an opportunity and mark as in progress
 */
router.post('/:id/accept', async (req, res) => {
  try {
    const opportunityId = req.params.id;
    const { userId, notes } = req.body;

    await opportunitySuggestionService.updateOpportunityStatus(
      opportunityId,
      'IN_PROGRESS',
      'ACCEPT',
      { acceptedAt: new Date() },
      notes,
      userId
    );

    res.json({ message: 'Opportunity accepted successfully' });
  } catch (error) {
    console.error('Error accepting opportunity:', error);
    res.status(500).json({ error: 'Failed to accept opportunity' });
  }
});

/**
 * POST /opportunities/:id/complete
 * Mark opportunity as completed
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const opportunityId = req.params.id;
    const { userId, result, notes } = req.body;

    await opportunitySuggestionService.updateOpportunityStatus(
      opportunityId,
      'COMPLETED',
      'MARK_COMPLETE',
      { result, completedAt: new Date() },
      notes,
      userId
    );

    res.json({ message: 'Opportunity completed successfully' });
  } catch (error) {
    console.error('Error completing opportunity:', error);
    res.status(500).json({ error: 'Failed to complete opportunity' });
  }
});

/**
 * POST /opportunities/refresh
 * Regenerate opportunities for an account
 */
router.post('/refresh', async (req, res) => {
  try {
    const { accountId } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Generate fresh opportunities
    const opportunities = await opportunitySuggestionService.generateOpportunitySuggestions(accountId, {
      limit: 100 // Generate more for refresh
    });

    res.json({
      message: 'Opportunities refreshed successfully',
      count: opportunities.length,
      opportunities: opportunities.slice(0, 20) // Return top 20 for preview
    });
  } catch (error) {
    console.error('Error refreshing opportunities:', error);
    res.status(500).json({ error: 'Failed to refresh opportunities' });
  }
});

/**
 * GET /opportunities/history
 * Get opportunity history for an account
 */
router.get('/history', async (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const where: any = { accountId };
    if (status) {
      where.status = status;
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunitySuggestion.findMany({
        where,
        include: {
          primaryContact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              position: true
            }
          },
          _count: {
            select: {
              actions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.opportunitySuggestion.count({ where })
    ]);

    res.json({
      opportunities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting opportunity history:', error);
    res.status(500).json({ error: 'Failed to get opportunity history' });
  }
});

/**
 * GET /opportunities/stats
 * Get opportunity statistics for an account
 */
router.get('/stats', async (req, res) => {
  try {
    const accountId = req.query.accountId as string;
    const timeRange = parseInt(req.query.timeRange as string) || 30; // days
    
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    const [total, byStatus, byCategory, byPriority] = await Promise.all([
      prisma.opportunitySuggestion.count({
        where: {
          accountId,
          createdAt: { gte: startDate }
        }
      }),
      prisma.opportunitySuggestion.groupBy({
        by: ['status'],
        where: {
          accountId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      }),
      prisma.opportunitySuggestion.groupBy({
        by: ['category'],
        where: {
          accountId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      }),
      prisma.opportunitySuggestion.groupBy({
        by: ['priority'],
        where: {
          accountId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      })
    ]);

    res.json({
      timeRange,
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byCategory: byCategory.reduce((acc, item) => {
        acc[item.category] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.id;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error('Error getting opportunity stats:', error);
    res.status(500).json({ error: 'Failed to get opportunity statistics' });
  }
});

export default router;