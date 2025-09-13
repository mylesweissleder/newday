import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = express.Router();

// Get crew-wide contacts with filtering and search
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      page = '1', 
      limit = '50',
      includeContributions = 'false',
      sharedOnly = 'false'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {
      accountId: req.user!.accountId,
      status: 'ACTIVE'
    };

    if (sharedOnly === 'true') {
      where.isSharedWithCrew = true;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
        { position: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: [search as string] } }
      ];
    }

    const include: any = {
      createdBy: {
        select: { firstName: true, lastName: true, email: true }
      },
      updatedBy: {
        select: { firstName: true, lastName: true, email: true }
      }
    };

    if (includeContributions === 'true') {
      include.contributions = {
        include: {
          contributor: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include,
        orderBy: [
          { priorityScore: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip: offset,
        take: limitNum
      }),
      prisma.contact.count({ where })
    ]);

    res.json({
      contacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching crew contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// AI-powered contact search with natural language queries
router.post('/ai-search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { query, limit = 20 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // For now, implement basic keyword search
    // TODO: Integrate with AI service for semantic search
    const keywords = query.toLowerCase().split(' ').filter((word: string) => word.length > 2);
    
    const contacts = await prisma.contact.findMany({
      where: {
        accountId: req.user!.accountId,
        status: 'ACTIVE',
        OR: [
          {
            OR: keywords.map((keyword: string) => ({
              firstName: { contains: keyword, mode: 'insensitive' }
            }))
          },
          {
            OR: keywords.map((keyword: string) => ({
              lastName: { contains: keyword, mode: 'insensitive' }
            }))
          },
          {
            OR: keywords.map((keyword: string) => ({
              company: { contains: keyword, mode: 'insensitive' }
            }))
          },
          {
            OR: keywords.map((keyword: string) => ({
              position: { contains: keyword, mode: 'insensitive' }
            }))
          },
          {
            tags: { hasSome: keywords }
          }
        ]
      },
      include: {
        contributions: {
          include: {
            contributor: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        relationships: {
          include: {
            relatedContact: {
              select: { firstName: true, lastName: true, company: true }
            }
          }
        }
      },
      orderBy: [
        { priorityScore: 'desc' },
        { engagementScore: 'desc' }
      ],
      take: limit
    });

    // TODO: Add AI reasoning for why these contacts match
    const results = contacts.map(contact => ({
      ...contact,
      aiReason: `Matches keywords: ${keywords.join(', ')}`,
      relevanceScore: Math.random() * 100 // Placeholder
    }));

    res.json({
      query,
      results,
      total: results.length
    });
  } catch (error) {
    console.error('Error in AI search:', error);
    res.status(500).json({ error: 'Failed to perform AI search' });
  }
});

// Get contact relationship paths (AI-powered network discovery)
router.get('/:contactId/relationship-paths', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { targetContactId, maxDepth = 3 } = req.query;

    // Find direct relationships
    const relationships = await prisma.contactRelationship.findMany({
      where: {
        OR: [
          { contactId },
          { relatedContactId: contactId }
        ]
      },
      include: {
        contact: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            company: true,
            position: true,
            priorityScore: true
          }
        },
        relatedContact: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            company: true,
            position: true,
            priorityScore: true
          }
        }
      }
    });

    // If target specified, find path to target
    if (targetContactId) {
      // TODO: Implement shortest path algorithm
      // For now, return direct connections
      const directPath = relationships.find(rel => 
        (rel.contactId === targetContactId || rel.relatedContactId === targetContactId)
      );

      if (directPath) {
        return res.json({
          paths: [{
            contacts: [contactId, targetContactId],
            relationships: [directPath],
            strength: directPath.strength,
            depth: 1
          }]
        });
      }
    }

    // Return all relationships grouped by type
    const groupedPaths = relationships.reduce((acc: any, rel) => {
      const type = rel.relationshipType;
      if (!acc[type]) acc[type] = [];
      
      const otherContact = rel.contactId === contactId ? rel.relatedContact : rel.contact;
      acc[type].push({
        contact: otherContact,
        relationship: rel,
        strength: rel.strength
      });
      
      return acc;
    }, {});

    res.json({
      contactId,
      relationshipTypes: groupedPaths,
      totalConnections: relationships.length
    });
  } catch (error) {
    console.error('Error finding relationship paths:', error);
    res.status(500).json({ error: 'Failed to find relationship paths' });
  }
});

// Generate AI icebreaker for contacting someone
router.post('/:contactId/generate-icebreaker', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { context, tone = 'professional', purpose = 'networking' } = req.body;

    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        accountId: req.user!.accountId
      },
      include: {
        relationships: {
          include: {
            relatedContact: {
              select: { firstName: true, lastName: true, company: true }
            }
          }
        },
        contributions: {
          include: {
            contributor: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // TODO: Integrate with AI service for intelligent icebreaker generation
    // For now, generate template-based icebreakers
    const icebreakers = generateTemplateIcebreakers(contact, req.user!, context, tone, purpose);

    res.json({
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        position: contact.position
      },
      icebreakers,
      context,
      tone,
      purpose
    });
  } catch (error) {
    console.error('Error generating icebreaker:', error);
    res.status(500).json({ error: 'Failed to generate icebreaker' });
  }
});

// Get contact contribution history
router.get('/:contactId/contributions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const contributions = await prisma.contactContribution.findMany({
      where: { contactId },
      include: {
        contributor: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ contributions });
  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// Helper function to generate template-based icebreakers
function generateTemplateIcebreakers(contact: any, user: any, context: string, tone: string, purpose: string) {
  const templates: any = {
    professional: {
      networking: [
        `Hi ${contact.firstName}, I came across your profile and was impressed by your work at ${contact.company}. I'd love to connect and learn more about your experience in ${contact.position?.toLowerCase() || 'your field'}.`,
        `Hello ${contact.firstName}, I'm ${user.firstName} and I noticed we might have some mutual connections. I'd be interested in connecting to share insights about ${contact.company} and the industry.`,
        `Hi ${contact.firstName}, I'm reaching out because I'm always looking to connect with talented professionals like yourself at ${contact.company}. Would you be open to a brief conversation?`
      ],
      business: [
        `Hi ${contact.firstName}, I hope this message finds you well. I'm ${user.firstName} and I believe there might be some synergies between what you're doing at ${contact.company} and my work. Would you be interested in exploring potential collaboration?`,
        `Hello ${contact.firstName}, I've been following ${contact.company}'s work and I'm impressed by your team's approach. I'd love to discuss how we might work together.`
      ]
    },
    casual: {
      networking: [
        `Hey ${contact.firstName}! I saw your profile and thought we should connect. Your work at ${contact.company} looks really interesting.`,
        `Hi ${contact.firstName}, hope you're doing well! I'd love to connect and maybe grab coffee sometime to chat about ${contact.company} and the industry.`
      ]
    }
  };

  const selectedTemplates = templates[tone]?.[purpose] || templates.professional.networking;
  
  if (context) {
    selectedTemplates.push(`Hi ${contact.firstName}, ${context} I thought you might be interested in connecting.`);
  }

  return selectedTemplates.map((template: string, index: number) => ({
    id: index + 1,
    text: template,
    tone,
    purpose,
    confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
  }));
}

export default router;