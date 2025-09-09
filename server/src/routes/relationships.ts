import express, { Request, Response } from 'express';
import Joi from 'joi';

import { RelationshipType, PotentialRelationshipStatus } from '@prisma/client';
import { relationshipDiscovery } from '../services/relationshipDiscovery';

const router = express.Router();
import prisma from "../utils/prisma";

// Validation schemas
const createRelationshipSchema = Joi.object({
  relatedContactId: Joi.string().required(),
  relationshipType: Joi.string().valid(...Object.values(RelationshipType)).required(),
  strength: Joi.number().min(0).max(1).optional(),
  confidence: Joi.number().min(0).max(1).optional(),
  notes: Joi.string().optional().allow(''),
  source: Joi.string().optional().allow(''),
  isMutual: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional()
});

const updateRelationshipSchema = createRelationshipSchema.keys({
  relatedContactId: Joi.string().optional()
});

// Get all relationships for a contact
router.get('/contact/:contactId', async (req: Request, res: Response) => {
  try {
    const { includeAnalytics = 'false' } = req.query;
    
    const contact = await prisma.contact.findFirst({
      where: { 
        id: req.params.contactId,
        accountId: req.user!.accountId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const [relationships, relatedTo] = await Promise.all([
      // Direct relationships (where this contact is the source)
      prisma.contactRelationship.findMany({
        where: { contactId: req.params.contactId },
        include: {
          relatedContact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              position: true,
              email: true,
              linkedinUrl: true,
              city: true,
              state: true,
              country: true
            }
          }
        },
        orderBy: [
          { strength: 'desc' },
          { updatedAt: 'desc' }
        ]
      }),
      // Reverse relationships (where this contact is the target)
      prisma.contactRelationship.findMany({
        where: { relatedContactId: req.params.contactId },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              position: true,
              email: true,
              linkedinUrl: true,
              city: true,
              state: true,
              country: true
            }
          }
        },
        orderBy: [
          { strength: 'desc' },
          { updatedAt: 'desc' }
        ]
      })
    ]);

    let analytics = null;
    if (includeAnalytics === 'true') {
      analytics = await prisma.networkAnalytics.findUnique({
        where: { contactId: req.params.contactId }
      });
    }

    res.json({
      relationships,
      relatedTo,
      analytics,
      totalRelationships: relationships.length + relatedTo.length
    });
  } catch (error) {
    console.error('Get relationships error:', error);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// Create a new relationship
router.post('/', async (req: Request, res: Response) => {
  try {
    const { contactId, relatedContactId, ...relationshipData } = req.body;
    
    const { error, value } = createRelationshipSchema.validate({
      relatedContactId,
      ...relationshipData
    });
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    // Verify both contacts belong to the account
    const [contact1, contact2] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: contactId, accountId: req.user!.accountId }
      }),
      prisma.contact.findFirst({
        where: { id: relatedContactId, accountId: req.user!.accountId }
      })
    ]);

    if (!contact1 || !contact2) {
      return res.status(404).json({ error: 'One or both contacts not found' });
    }

    if (contactId === relatedContactId) {
      return res.status(400).json({ error: 'Cannot create relationship with self' });
    }

    // Check if relationship already exists
    const existing = await prisma.contactRelationship.findFirst({
      where: {
        OR: [
          { contactId, relatedContactId },
          { contactId: relatedContactId, relatedContactId: contactId }
        ]
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Relationship already exists' });
    }

    const relationship = await prisma.contactRelationship.create({
      data: {
        contactId,
        relatedContactId,
        relationshipType: value.relationshipType,
        strength: value.strength || 0.5,
        confidence: value.confidence || 0.8,
        notes: value.notes,
        source: value.source || 'manual',
        isMutual: value.isMutual || false,
        isVerified: value.isVerified || true,
        discoveredBy: req.user!.id
      },
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

// Update a relationship
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateRelationshipSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify relationship exists and belongs to account
    const existing = await prisma.contactRelationship.findFirst({
      where: { id: req.params.id },
      include: {
        contact: {
          select: { accountId: true }
        }
      }
    });

    if (!existing || existing.contact.accountId !== req.user!.accountId) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const relationship = await prisma.contactRelationship.update({
      where: { id: req.params.id },
      data: {
        ...value,
        lastVerified: new Date()
      },
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

    res.json(relationship);
  } catch (error) {
    console.error('Update relationship error:', error);
    res.status(500).json({ error: 'Failed to update relationship' });
  }
});

// Delete a relationship
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Verify relationship exists and belongs to account
    const existing = await prisma.contactRelationship.findFirst({
      where: { id: req.params.id },
      include: {
        contact: {
          select: { accountId: true }
        }
      }
    });

    if (!existing || existing.contact.accountId !== req.user!.accountId) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    await prisma.contactRelationship.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Relationship deleted successfully' });
  } catch (error) {
    console.error('Delete relationship error:', error);
    res.status(500).json({ error: 'Failed to delete relationship' });
  }
});

// Find mutual connections between contacts
router.get('/mutual/:contactId1/:contactId2', async (req: Request, res: Response) => {
  try {
    const { contactId1, contactId2 } = req.params;

    // Verify both contacts belong to the account
    const [contact1, contact2] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: contactId1, accountId: req.user!.accountId }
      }),
      prisma.contact.findFirst({
        where: { id: contactId2, accountId: req.user!.accountId }
      })
    ]);

    if (!contact1 || !contact2) {
      return res.status(404).json({ error: 'One or both contacts not found' });
    }

    // Get all connections for both contacts
    const [contact1Connections, contact2Connections] = await Promise.all([
      prisma.contactRelationship.findMany({
        where: {
          OR: [
            { contactId: contactId1 },
            { relatedContactId: contactId1 }
          ]
        },
        select: {
          contactId: true,
          relatedContactId: true,
          relationshipType: true,
          strength: true
        }
      }),
      prisma.contactRelationship.findMany({
        where: {
          OR: [
            { contactId: contactId2 },
            { relatedContactId: contactId2 }
          ]
        },
        select: {
          contactId: true,
          relatedContactId: true,
          relationshipType: true,
          strength: true
        }
      })
    ]);

    // Extract unique contact IDs for each contact
    const contact1ConnectedIds = new Set();
    const contact2ConnectedIds = new Set();

    contact1Connections.forEach(rel => {
      const otherId = rel.contactId === contactId1 ? rel.relatedContactId : rel.contactId;
      contact1ConnectedIds.add(otherId);
    });

    contact2Connections.forEach(rel => {
      const otherId = rel.contactId === contactId2 ? rel.relatedContactId : rel.contactId;
      contact2ConnectedIds.add(otherId);
    });

    // Find mutual connections
    const mutualConnectionIds = [...contact1ConnectedIds].filter(id => 
      contact2ConnectedIds.has(id)
    );

    // Get full contact details for mutual connections
    const mutualConnections = await prisma.contact.findMany({
      where: {
        id: { in: mutualConnectionIds as string[] },
        accountId: req.user!.accountId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        position: true,
        email: true,
        linkedinUrl: true,
        city: true,
        state: true,
        country: true
      }
    });

    res.json({
      contact1: { id: contactId1, name: `${contact1.firstName} ${contact1.lastName}` },
      contact2: { id: contactId2, name: `${contact2.firstName} ${contact2.lastName}` },
      mutualConnections,
      totalMutualConnections: mutualConnections.length
    });
  } catch (error) {
    console.error('Find mutual connections error:', error);
    res.status(500).json({ error: 'Failed to find mutual connections' });
  }
});

// Get network analytics for all contacts
router.get('/analytics/network/:contactId', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { 
        id: req.params.contactId,
        accountId: req.user!.accountId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    let analytics = await prisma.networkAnalytics.findUnique({
      where: { contactId: req.params.contactId }
    });

    // If analytics don't exist or are stale (older than 24 hours), calculate them
    if (!analytics || 
        (new Date().getTime() - analytics.lastCalculated.getTime()) > 24 * 60 * 60 * 1000) {
      
      // Calculate network metrics
      const [directRelationships, allRelationships] = await Promise.all([
        prisma.contactRelationship.findMany({
          where: {
            OR: [
              { contactId: req.params.contactId },
              { relatedContactId: req.params.contactId }
            ]
          },
          include: {
            contact: { select: { company: true, city: true, state: true, country: true, position: true } },
            relatedContact: { select: { company: true, city: true, state: true, country: true, position: true } }
          }
        }),
        prisma.contactRelationship.findMany({
          where: {
            contact: { accountId: req.user!.accountId }
          }
        })
      ]);

      const directConnections = directRelationships.length;
      const verifiedConnections = directRelationships.filter(r => r.isVerified).length;
      const mutualConnections = directRelationships.filter(r => r.isMutual).length;

      // Calculate network reach (2nd degree connections)
      const directConnectionIds = directRelationships.map(rel => 
        rel.contactId === req.params.contactId ? rel.relatedContactId : rel.contactId
      );

      const secondDegreeConnections = await prisma.contactRelationship.count({
        where: {
          OR: [
            { contactId: { in: directConnectionIds }, relatedContactId: { not: req.params.contactId } },
            { relatedContactId: { in: directConnectionIds }, contactId: { not: req.params.contactId } }
          ]
        }
      });

      // Calculate diversity metrics
      const companies = new Set();
      const locations = new Set();
      const positions = new Set();

      directRelationships.forEach(rel => {
        const otherContact = rel.contactId === req.params.contactId ? rel.relatedContact : rel.contact;
        if (otherContact.company) companies.add(otherContact.company);
        if (otherContact.city && otherContact.state) {
          locations.add(`${otherContact.city}, ${otherContact.state}`);
        }
        if (otherContact.position) positions.add(otherContact.position);
      });

      const industryDiversity = companies.size > 0 ? Math.min(1, companies.size / 10) : 0;
      const geographicSpread = locations.size > 0 ? Math.min(1, locations.size / 20) : 0;
      const senioritySpread = positions.size > 0 ? Math.min(1, positions.size / 15) : 0;

      // Simple influence score based on connections and diversity
      const influenceScore = Math.min(1, 
        (directConnections * 0.4 + 
         (secondDegreeConnections * 0.2) + 
         (industryDiversity * 0.2) + 
         (geographicSpread * 0.1) + 
         (senioritySpread * 0.1)) / 10
      );

      // Upsert analytics
      analytics = await prisma.networkAnalytics.upsert({
        where: { contactId: req.params.contactId },
        update: {
          totalConnections: directConnections,
          directConnections,
          mutualConnections,
          networkReach: secondDegreeConnections,
          influenceScore,
          industryDiversity,
          geographicSpread,
          senioritySpread,
          lastCalculated: new Date()
        },
        create: {
          contactId: req.params.contactId,
          totalConnections: directConnections,
          directConnections,
          mutualConnections,
          networkReach: secondDegreeConnections,
          influenceScore,
          industryDiversity,
          geographicSpread,
          senioritySpread,
          lastCalculated: new Date()
        }
      });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Network analytics error:', error);
    res.status(500).json({ error: 'Failed to get network analytics' });
  }
});

// Find shortest path between two contacts
router.get('/path/:fromContactId/:toContactId', async (req: Request, res: Response) => {
  try {
    const { fromContactId, toContactId } = req.params;
    const { maxDegrees = 3 } = req.query;

    // Verify both contacts belong to the account
    const [fromContact, toContact] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: fromContactId, accountId: req.user!.accountId }
      }),
      prisma.contact.findFirst({
        where: { id: toContactId, accountId: req.user!.accountId }
      })
    ]);

    if (!fromContact || !toContact) {
      return res.status(404).json({ error: 'One or both contacts not found' });
    }

    if (fromContactId === toContactId) {
      return res.json({
        path: [{ id: fromContactId, firstName: fromContact.firstName, lastName: fromContact.lastName }],
        degrees: 0,
        pathExists: true
      });
    }

    // Get all relationships in the account for path finding
    const allRelationships = await prisma.contactRelationship.findMany({
      where: {
        contact: { accountId: req.user!.accountId }
      },
      select: {
        contactId: true,
        relatedContactId: true,
        strength: true
      }
    });

    // Build adjacency list
    const graph = new Map<string, Array<{id: string, strength: number}>>();
    
    allRelationships.forEach(rel => {
      if (!graph.has(rel.contactId)) graph.set(rel.contactId, []);
      if (!graph.has(rel.relatedContactId)) graph.set(rel.relatedContactId, []);
      
      graph.get(rel.contactId)!.push({ id: rel.relatedContactId, strength: rel.strength || 0.5 });
      graph.get(rel.relatedContactId)!.push({ id: rel.contactId, strength: rel.strength || 0.5 });
    });

    // BFS to find shortest path
    const queue = [{ id: fromContactId, path: [fromContactId], degrees: 0 }];
    const visited = new Set([fromContactId]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.degrees >= Number(maxDegrees)) continue;

      const neighbors = graph.get(current.id) || [];
      
      for (const neighbor of neighbors) {
        if (neighbor.id === toContactId) {
          // Found target, get full contact details for path
          const pathIds = [...current.path, toContactId];
          const pathContacts = await prisma.contact.findMany({
            where: {
              id: { in: pathIds },
              accountId: req.user!.accountId
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              position: true
            }
          });

          // Order contacts by path
          const orderedPath = pathIds.map(id => 
            pathContacts.find(c => c.id === id)!
          );

          return res.json({
            path: orderedPath,
            degrees: current.degrees + 1,
            pathExists: true
          });
        }

        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push({
            id: neighbor.id,
            path: [...current.path, neighbor.id],
            degrees: current.degrees + 1
          });
        }
      }
    }

    res.json({
      path: [],
      degrees: -1,
      pathExists: false
    });
  } catch (error) {
    console.error('Find path error:', error);
    res.status(500).json({ error: 'Failed to find connection path' });
  }
});

// Discovery endpoints

// Discover potential relationships for a contact
router.post('/discover/:contactId', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { 
        id: req.params.contactId,
        accountId: req.user!.accountId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const potentialRelationships = await relationshipDiscovery.discoverRelationshipsForContact(
      req.params.contactId,
      req.user!.accountId
    );

    // Save high-confidence discoveries to potential relationships table
    const savePromises = potentialRelationships
      .filter(pr => pr.confidence >= 0.5)
      .slice(0, 10) // Top 10
      .map(async (potential) => {
        return prisma.potentialRelationship.upsert({
          where: {
            contactId_relatedContactId: {
              contactId: potential.contactId,
              relatedContactId: potential.relatedContactId
            }
          },
          update: {
            confidence: potential.confidence,
            evidence: potential.evidence as any,
            relationshipType: potential.relationshipType
          },
          create: {
            contactId: potential.contactId,
            relatedContactId: potential.relatedContactId,
            relationshipType: potential.relationshipType,
            confidence: potential.confidence,
            evidence: potential.evidence as any,
            source: potential.source
          }
        });
      });

    await Promise.all(savePromises);

    res.json({
      discoveries: potentialRelationships,
      totalDiscovered: potentialRelationships.length,
      highConfidence: potentialRelationships.filter(pr => pr.confidence >= 0.7).length
    });
  } catch (error) {
    console.error('Discover relationships error:', error);
    res.status(500).json({ error: 'Failed to discover relationships' });
  }
});

// Get potential relationships for review
router.get('/potential', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      minConfidence = 0.3,
      status = 'PENDING'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [potentialRelationships, total] = await Promise.all([
      prisma.potentialRelationship.findMany({
        where: {
          contact: { accountId: req.user!.accountId },
          confidence: { gte: Number(minConfidence) },
          status: status as PotentialRelationshipStatus
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              position: true,
              email: true
            }
          },
          relatedContact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              position: true,
              email: true
            }
          }
        },
        orderBy: { confidence: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.potentialRelationship.count({
        where: {
          contact: { accountId: req.user!.accountId },
          confidence: { gte: Number(minConfidence) },
          status: status as PotentialRelationshipStatus
        }
      })
    ]);

    res.json({
      potentialRelationships,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get potential relationships error:', error);
    res.status(500).json({ error: 'Failed to fetch potential relationships' });
  }
});

// Approve a potential relationship (convert to actual relationship)
router.post('/potential/:id/approve', async (req: Request, res: Response) => {
  try {
    const potential = await prisma.potentialRelationship.findFirst({
      where: { 
        id: req.params.id,
        contact: { accountId: req.user!.accountId }
      }
    });

    if (!potential) {
      return res.status(404).json({ error: 'Potential relationship not found' });
    }

    // Create actual relationship
    const relationship = await prisma.contactRelationship.create({
      data: {
        contactId: potential.contactId,
        relatedContactId: potential.relatedContactId,
        relationshipType: potential.relationshipType,
        strength: Math.min(potential.confidence, 0.8), // Cap at 0.8 for discovered relationships
        confidence: potential.confidence,
        source: 'discovery_approved',
        notes: `Approved from discovery. Evidence: ${JSON.stringify(potential.evidence)}`,
        discoveredBy: req.user!.id,
        isVerified: true
      },
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

    // Update potential relationship status
    await prisma.potentialRelationship.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        reviewedBy: req.user!.id,
        reviewedAt: new Date()
      }
    });

    res.json(relationship);
  } catch (error) {
    console.error('Approve potential relationship error:', error);
    res.status(500).json({ error: 'Failed to approve relationship' });
  }
});

// Reject a potential relationship
router.post('/potential/:id/reject', async (req: Request, res: Response) => {
  try {
    const potential = await prisma.potentialRelationship.findFirst({
      where: { 
        id: req.params.id,
        contact: { accountId: req.user!.accountId }
      }
    });

    if (!potential) {
      return res.status(404).json({ error: 'Potential relationship not found' });
    }

    await prisma.potentialRelationship.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user!.id,
        reviewedAt: new Date()
      }
    });

    res.json({ message: 'Potential relationship rejected' });
  } catch (error) {
    console.error('Reject potential relationship error:', error);
    res.status(500).json({ error: 'Failed to reject potential relationship' });
  }
});

// Run batch discovery for all contacts
router.post('/discovery/batch', async (req: Request, res: Response) => {
  try {
    // Run in background (don't await)
    relationshipDiscovery.batchDiscoverRelationships(req.user!.accountId)
      .catch(error => {
        console.error('Batch discovery error:', error);
      });

    res.json({ 
      message: 'Batch relationship discovery started',
      status: 'running'
    });
  } catch (error) {
    console.error('Start batch discovery error:', error);
    res.status(500).json({ error: 'Failed to start batch discovery' });
  }
});

export default router;