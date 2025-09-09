import express, { Request, Response } from 'express';
import Joi from 'joi';

import { OutreachType, OutreachStatus } from '@prisma/client';

const router = express.Router();
import prisma from "../utils/prisma";

const createOutreachSchema = Joi.object({
  contactId: Joi.string().required(),
  type: Joi.string().valid(...Object.values(OutreachType)).required(),
  subject: Joi.string().max(200).optional().allow(''),
  message: Joi.string().required()
});

// Get outreach history with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      contactId,
      type,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      contact: {
        accountId: req.user!.accountId
      }
    };

    if (contactId) {
      where.contactId = contactId as string;
    }

    if (type) {
      where.type = type as OutreachType;
    }

    if (status) {
      where.status = status as OutreachStatus;
    }

    const [outreach, total] = await Promise.all([
      prisma.outreach.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              position: true
            }
          },
          sentBy: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.outreach.count({ where })
    ]);

    res.json({
      outreach,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get outreach error:', error);
    res.status(500).json({ error: 'Failed to fetch outreach history' });
  }
});

// Create new outreach record
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createOutreachSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { contactId, type, subject, message } = value;

    // Verify contact belongs to account
    const contact = await prisma.contact.findFirst({
      where: { 
        id: contactId,
        accountId: req.user!.accountId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const outreach = await prisma.outreach.create({
      data: {
        contactId,
        type,
        subject,
        message,
        sentById: req.user!.id,
        status: OutreachStatus.PENDING
      },
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            company: true
          }
        }
      }
    });

    // Update contact's last contact date
    await prisma.contact.update({
      where: { id: contactId },
      data: { 
        lastContactDate: new Date(),
        updatedById: req.user!.id
      }
    });

    res.status(201).json(outreach);
  } catch (error) {
    console.error('Create outreach error:', error);
    res.status(500).json({ error: 'Failed to create outreach record' });
  }
});

// Update outreach status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, response } = req.body;

    if (!Object.values(OutreachStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData: any = { status };

    // Set timestamps based on status
    if (status === OutreachStatus.SENT && !updateData.sentAt) {
      updateData.sentAt = new Date();
    } else if (status === OutreachStatus.OPENED && !updateData.openedAt) {
      updateData.openedAt = new Date();
    } else if (status === OutreachStatus.RESPONDED) {
      updateData.respondedAt = new Date();
      if (response) {
        updateData.response = response;
      }
    }

    const outreach = await prisma.outreach.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            company: true
          }
        }
      }
    });

    res.json(outreach);
  } catch (error) {
    console.error('Update outreach status error:', error);
    res.status(500).json({ error: 'Failed to update outreach status' });
  }
});

// Get outreach analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { timeframe = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const where = {
      contact: { accountId: req.user!.accountId },
      createdAt: { gte: startDate }
    };

    // Get overall stats
    const [
      totalOutreach,
      outreachByType,
      outreachByStatus,
      responseRate
    ] = await Promise.all([
      prisma.outreach.count({ where }),
      
      prisma.outreach.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      
      prisma.outreach.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      
      prisma.outreach.findMany({
        where,
        select: { status: true }
      }).then(results => {
        const total = results.length;
        const responded = results.filter(r => r.status === 'RESPONDED').length;
        return total > 0 ? (responded / total) * 100 : 0;
      })
    ]);

    // Get daily outreach trend
    const dailyTrend = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM outreach o
      JOIN contacts c ON o.contact_id = c.id
      WHERE c.account_id = ${req.user!.accountId}
        AND o.created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Top performing contacts
    const topContacts = await prisma.outreach.groupBy({
      by: ['contactId'],
      where: {
        ...where,
        status: 'RESPONDED'
      },
      _count: true,
      orderBy: { _count: { contactId: 'desc' } },
      take: 10
    });

    const contactDetails = await prisma.contact.findMany({
      where: {
        id: { in: topContacts.map(tc => tc.contactId) },
        accountId: req.user!.accountId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true
      }
    });

    const topContactsWithDetails = topContacts.map(tc => ({
      ...contactDetails.find(cd => cd.id === tc.contactId),
      responseCount: tc._count
    }));

    res.json({
      totalOutreach,
      outreachByType,
      outreachByStatus,
      responseRate: Math.round(responseRate * 100) / 100,
      dailyTrend,
      topContacts: topContactsWithDetails
    });
  } catch (error) {
    console.error('Outreach analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch outreach analytics' });
  }
});

// Get contact outreach timeline
router.get('/contact/:contactId/timeline', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    // Verify contact belongs to account
    const contact = await prisma.contact.findFirst({
      where: { 
        id: contactId,
        accountId: req.user!.accountId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const timeline = await prisma.outreach.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      include: {
        sentBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(timeline);
  } catch (error) {
    console.error('Contact timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch contact timeline' });
  }
});

export default router;