import express, { Request, Response } from 'express';
import Joi from 'joi';

import { ContactTier, ContactStatus, RelationshipType } from '@prisma/client';

const router = express.Router();
import prisma from "../utils/prisma";

// Validation schemas
const createContactSchema = Joi.object({
  firstName: Joi.string().max(50).optional().allow(''),
  lastName: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().optional().allow(''),
  company: Joi.string().optional().allow(''),
  position: Joi.string().optional().allow(''),
  linkedinUrl: Joi.string().uri().optional().allow(''),
  twitterUrl: Joi.string().uri().optional().allow(''),
  website: Joi.string().uri().optional().allow(''),
  tier: Joi.string().valid(...Object.values(ContactTier)).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  source: Joi.string().optional().allow(''),
  connectionDate: Joi.date().optional(),
  relationshipType: Joi.string().valid(...Object.values(RelationshipType)).optional(),
  relationshipNotes: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow(''),
  state: Joi.string().optional().allow(''),
  country: Joi.string().optional().allow(''),
  timezone: Joi.string().optional().allow('')
});

const updateContactSchema = createContactSchema.keys({
  status: Joi.string().valid(...Object.values(ContactStatus)).optional()
});

// Get all contacts with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      tier,
      status = 'ACTIVE',
      tags,
      company,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      minPriority,
      minOpportunity,
      minStrategic,
      hasOpportunityFlags
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    // Build where clause
    const where: any = {
      accountId: req.user!.accountId,
      status: status as ContactStatus
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
        { position: { contains: search as string, mode: 'insensitive' } },
        { relationshipNotes: { contains: search as string, mode: 'insensitive' } },
        { source: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (tier) {
      where.tier = tier as ContactTier;
    }

    if (company) {
      where.company = { contains: company as string, mode: 'insensitive' };
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = {
        hasSome: tagArray
      };
    }

    // Add AI scoring filters
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

    // Get contacts
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true }
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
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get contact by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, email: true }
        },
        updatedBy: {
          select: { firstName: true, lastName: true, email: true }
        },
        relationships: {
          include: {
            relatedContact: {
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
        relatedTo: {
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
        outreach: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            sentBy: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Create new contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createContactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const contact = await prisma.contact.create({
      data: {
        ...value,
        accountId: req.user!.accountId,
        createdById: req.user!.id,
        updatedById: req.user!.id
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Bulk import contacts
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body;
    
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Contacts array is required and cannot be empty' });
    }

    // Limit bulk import size to prevent abuse
    if (contacts.length > 10000) {
      return res.status(400).json({ error: 'Cannot import more than 10,000 contacts at once' });
    }

    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as string[]
    };

    // Process contacts in batches to avoid overwhelming the database
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < contacts.length; i += batchSize) {
      batches.push(contacts.slice(i, i + batchSize));
    }

    console.log(`Processing ${contacts.length} contacts in ${batches.length} batches of ${batchSize}`);

    for (const batch of batches) {
      const contactsData = [];
      
      for (const contactData of batch) {
        // Validate each contact
        const { error, value } = createContactSchema.validate(contactData);
        if (error) {
          results.failed++;
          results.errors.push(`Validation error: ${error.details[0].message}`);
          continue;
        }

        contactsData.push({
          ...value,
          accountId: req.user!.accountId,
          createdById: req.user!.id,
          updatedById: req.user!.id
        });
      }

      // Bulk insert this batch
      if (contactsData.length > 0) {
        try {
          const created = await prisma.contact.createMany({
            data: contactsData,
            skipDuplicates: true
          });
          results.success += created.count;
          results.duplicates += (contactsData.length - created.count);
          console.log(`Batch completed: ${created.count} contacts created, ${contactsData.length - created.count} duplicates skipped`);
        } catch (error) {
          console.error('Batch insert error:', error);
          results.failed += contactsData.length;
          results.errors.push(`Batch insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    console.log(`Bulk import completed: ${results.success} created, ${results.failed} failed, ${results.duplicates} duplicates`);

    res.status(201).json({
      message: 'Bulk import completed',
      results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

// Update contact
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateContactSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const contact = await prisma.contact.update({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      },
      data: {
        ...value,
        updatedById: req.user!.id,
        lastContactDate: new Date()
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true }
        },
        updatedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    res.json(contact);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Check if user has permission for contact deletion
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !canPerformDestructiveOperations(currentUser.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Only crew leaders and admins can delete contacts.' 
      });
    }

    const contact = await prisma.contact.update({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      },
      data: { 
        status: ContactStatus.ARCHIVED,
        updatedById: req.user!.id
      }
    });

    res.json({ message: 'Contact archived successfully', contact });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to archive contact' });
  }
});

// Add relationship between contacts
router.post('/:id/relationships', async (req: Request, res: Response) => {
  try {
    const { relatedContactId, relationshipType, strength, notes } = req.body;

    if (!relatedContactId || !relationshipType) {
      return res.status(400).json({ error: 'Related contact ID and relationship type required' });
    }

    // Verify both contacts belong to the account
    const [contact1, contact2] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: req.params.id, accountId: req.user!.accountId }
      }),
      prisma.contact.findFirst({
        where: { id: relatedContactId, accountId: req.user!.accountId }
      })
    ]);

    if (!contact1 || !contact2) {
      return res.status(404).json({ error: 'One or both contacts not found' });
    }

    // Create bidirectional relationship
    const relationship = await prisma.contactRelationship.create({
      data: {
        contactId: req.params.id,
        relatedContactId,
        relationshipType: relationshipType as RelationshipType,
        strength,
        notes
      },
      include: {
        relatedContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            position: true
          }
        }
      }
    });

    res.status(201).json(relationship);
  } catch (error) {
    console.error('Create relationship error:', error);
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

// Get contact analytics
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { 
        id: req.params.id,
        accountId: req.user!.accountId
      },
      include: {
        _count: {
          select: {
            outreach: true,
            relationships: true,
            relatedTo: true,
            campaignContacts: true
          }
        },
        outreach: {
          select: {
            type: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Calculate engagement metrics
    const totalOutreach = contact._count.outreach;
    const responded = contact.outreach.filter(o => o.status === 'RESPONDED').length;
    const responseRate = totalOutreach > 0 ? (responded / totalOutreach) * 100 : 0;
    
    // Recent activity
    const recentOutreach = contact.outreach.slice(0, 5);
    
    res.json({
      totalOutreach,
      totalRelationships: contact._count.relationships + contact._count.relatedTo,
      totalCampaigns: contact._count.campaignContacts,
      responseRate: Math.round(responseRate * 100) / 100,
      recentActivity: recentOutreach
    });
  } catch (error) {
    console.error('Contact analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch contact analytics' });
  }
});

// Helper function to check if user can perform destructive operations
const canPerformDestructiveOperations = (userRole: string): boolean => {
  return ['CREW_LEADER', 'ADMIN'].includes(userRole);
};

// Bulk operations
router.post('/bulk/delete', async (req: Request, res: Response) => {
  try {
    // Check if user has permission for bulk delete
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !canPerformDestructiveOperations(currentUser.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Only crew leaders and admins can delete contacts in bulk.' 
      });
    }

    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Contact IDs array required' });
    }

    // Additional protection: prevent bulk deletion of more than 100 contacts at once
    if (contactIds.length > 100) {
      return res.status(400).json({ 
        error: 'Cannot delete more than 100 contacts at once. Please split into smaller batches.' 
      });
    }

    const result = await prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
        accountId: req.user!.accountId
      },
      data: {
        status: ContactStatus.ARCHIVED,
        updatedById: req.user!.id
      }
    });

    res.json({ 
      message: `${result.count} contacts archived successfully`,
      archivedCount: result.count 
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete contacts' });
  }
});

router.post('/bulk/update-tier', async (req: Request, res: Response) => {
  try {
    const { contactIds, tier } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Contact IDs array required' });
    }

    if (!tier || !Object.values(ContactTier).includes(tier)) {
      return res.status(400).json({ error: 'Valid tier required' });
    }

    const result = await prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
        accountId: req.user!.accountId
      },
      data: {
        tier: tier as ContactTier,
        updatedById: req.user!.id
      }
    });

    res.json({ 
      message: `${result.count} contacts updated to ${tier}`,
      updatedCount: result.count 
    });
  } catch (error) {
    console.error('Bulk tier update error:', error);
    res.status(500).json({ error: 'Failed to update contact tiers' });
  }
});

router.post('/bulk/add-tags', async (req: Request, res: Response) => {
  try {
    const { contactIds, tags } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Contact IDs array required' });
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'Tags array required' });
    }

    // Get existing contacts with their current tags
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        accountId: req.user!.accountId
      },
      select: { id: true, tags: true }
    });

    // Update each contact with merged tags
    const updatePromises = contacts.map(contact => {
      const existingTags = contact.tags || [];
      const mergedTags = [...new Set([...existingTags, ...tags])];
      
      return prisma.contact.update({
        where: { id: contact.id },
        data: {
          tags: mergedTags,
          updatedById: req.user!.id
        }
      });
    });

    await Promise.all(updatePromises);

    res.json({ 
      message: `Tags added to ${contacts.length} contacts`,
      updatedCount: contacts.length 
    });
  } catch (error) {
    console.error('Bulk add tags error:', error);
    res.status(500).json({ error: 'Failed to add tags to contacts' });
  }
});

export default router;