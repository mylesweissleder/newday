import express, { Request, Response } from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { CampaignStatus, CampaignContactStatus } from '@prisma/client';
import { aiScoringService } from '../services/aiScoring';

const router = express.Router();
const prisma = new PrismaClient();

const createCampaignSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  objective: Joi.string().max(200).optional().allow(''),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  emailTemplate: Joi.string().optional().allow(''),
  linkedinTemplate: Joi.string().optional().allow(''),
  emailSubject: Joi.string().optional().allow('')
});

// Get all campaigns
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { accountId: req.user!.accountId };
    if (status) {
      where.status = status as CampaignStatus;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { contacts: true }
          }
        }
      }),
      prisma.campaign.count({ where })
    ]);

    res.json({
      campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Create new campaign
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...value,
        accountId: req.user!.accountId,
        createdById: req.user!.id
      }
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Get campaign by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      },
      include: {
        contacts: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: true,
                position: true,
                tier: true
              }
            }
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Update campaign
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { error, value } = createCampaignSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const campaign = await prisma.campaign.update({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      },
      data: value
    });

    res.json(campaign);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Add contacts to campaign
router.post('/:id/contacts', async (req: Request, res: Response) => {
  try {
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Contact IDs array is required' });
    }

    // Verify campaign exists and belongs to account
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Add contacts to campaign
    const campaignContacts = await Promise.all(
      contactIds.map(contactId =>
        prisma.campaignContact.upsert({
          where: {
            campaignId_contactId: {
              campaignId: req.params.id,
              contactId
            }
          },
          create: {
            campaignId: req.params.id,
            contactId
          },
          update: {}
        })
      )
    );

    res.json({ message: 'Contacts added to campaign', count: campaignContacts.length });
  } catch (error) {
    console.error('Add contacts to campaign error:', error);
    res.status(500).json({ error: 'Failed to add contacts to campaign' });
  }
});

// Remove contact from campaign
router.delete('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    await prisma.campaignContact.delete({
      where: {
        campaignId_contactId: {
          campaignId: req.params.id,
          contactId: req.params.contactId
        }
      }
    });

    res.json({ message: 'Contact removed from campaign' });
  } catch (error) {
    console.error('Remove contact from campaign error:', error);
    res.status(500).json({ error: 'Failed to remove contact from campaign' });
  }
});

// Update campaign contact status
router.put('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const { status, personalizedNote } = req.body;

    const campaignContact = await prisma.campaignContact.update({
      where: {
        campaignId_contactId: {
          campaignId: req.params.id,
          contactId: req.params.contactId
        }
      },
      data: {
        status: status as CampaignContactStatus,
        personalizedNote
      }
    });

    res.json(campaignContact);
  } catch (error) {
    console.error('Update campaign contact error:', error);
    res.status(500).json({ error: 'Failed to update campaign contact' });
  }
});

// Get campaign analytics
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      },
      include: {
        contacts: {
          include: {
            contact: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Calculate stats
    const totalContacts = campaign.contacts.length;
    const statusCounts = campaign.contacts.reduce((acc: any, cc) => {
      acc[cc.status] = (acc[cc.status] || 0) + 1;
      return acc;
    }, {});

    const tierDistribution = campaign.contacts.reduce((acc: any, cc) => {
      const tier = cc.contact.tier || 'UNASSIGNED';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    const companyDistribution = campaign.contacts
      .filter(cc => cc.contact.company)
      .reduce((acc: any, cc) => {
        const company = cc.contact.company!;
        acc[company] = (acc[company] || 0) + 1;
        return acc;
      }, {});

    res.json({
      totalContacts,
      statusCounts,
      tierDistribution,
      companyDistribution: Object.entries(companyDistribution)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
    });
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

/**
 * Get AI-powered contact suggestions for campaigns
 */
router.get('/ai-suggestions', async (req: Request, res: Response) => {
  try {
    const { 
      campaignObjective, 
      suggestionType = 'priority',
      limit = 20,
      minScore = 60
    } = req.query;

    let contacts = [];
    
    switch (suggestionType) {
      case 'priority':
        contacts = await aiScoringService.getTopPriorityContacts(
          req.user!.accountId, 
          Number(limit)
        );
        break;
      case 'opportunity':
        contacts = await aiScoringService.getHighOpportunityContacts(
          req.user!.accountId, 
          Number(limit)
        );
        break;
      case 'strategic':
        contacts = await aiScoringService.getStrategicNetworkingRecommendations(
          req.user!.accountId, 
          Number(limit)
        );
        break;
      default:
        contacts = await aiScoringService.getTopPriorityContacts(
          req.user!.accountId, 
          Number(limit)
        );
    }

    // Filter by minimum score if specified
    if (minScore) {
      contacts = contacts.filter(contact => {
        const score = suggestionType === 'priority' ? contact.priorityScore :
                     suggestionType === 'opportunity' ? contact.opportunityScore :
                     contact.strategicValue;
        return score && score >= Number(minScore);
      });
    }

    // Exclude contacts already in active campaigns
    const activeContacts = await prisma.campaignContact.findMany({
      where: {
        campaign: {
          accountId: req.user!.accountId,
          status: { in: ['DRAFT', 'ACTIVE'] }
        }
      },
      select: { contactId: true }
    });

    const activeContactIds = new Set(activeContacts.map(cc => cc.contactId));
    const suggestedContacts = contacts.filter(contact => !activeContactIds.has(contact.id));

    res.json({
      contacts: suggestedContacts,
      suggestionType,
      count: suggestedContacts.length,
      excludedActiveContacts: activeContactIds.size
    });
  } catch (error) {
    console.error('AI campaign suggestions error:', error);
    res.status(500).json({ error: 'Failed to get AI campaign suggestions' });
  }
});

export default router;