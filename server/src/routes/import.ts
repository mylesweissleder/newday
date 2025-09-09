import express, { Request, Response } from 'express';
import csv from 'csv-parser';
import fs from 'fs';

import { ContactTier } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
import prisma from "../utils/prisma";

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
  duplicates: number;
}

// Import contacts from CSV
router.post('/csv', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { filePath, mapping, source = 'CSV Import', owner = 'MW' } = req.body;

    if (!filePath || !mapping) {
      return res.status(400).json({ error: 'File path and field mapping required' });
    }

    const result: ImportResult = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
      duplicates: 0
    };

    const contacts: any[] = [];

    // Read CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          result.total++;
          
          try {
            const contact = mapCsvRowToContact(row, mapping, source, owner);
            if (contact.firstName && contact.lastName) {
              contacts.push(contact);
            } else {
              result.failed++;
              result.errors.push(`Row ${result.total}: Missing required fields (firstName, lastName)`);
            }
          } catch (error) {
            result.failed++;
            result.errors.push(`Row ${result.total}: ${error}`);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Process contacts in batches
    const batchSize = 100;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      for (const contactData of batch) {
        try {
          // Check for existing contact by email (if email exists) or name+company
          const existing = contactData.email ? await prisma.contact.findFirst({
            where: {
              accountId: req.user!.accountId,
              email: contactData.email
            }
          }) : await prisma.contact.findFirst({
            where: {
              accountId: req.user!.accountId,
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              company: contactData.company
            }
          });

          if (existing) {
            result.duplicates++;
            // Update existing contact with new information
            await prisma.contact.update({
              where: { id: existing.id },
              data: {
                ...contactData,
                tags: [...new Set([...(existing.tags || []), ...(contactData.tags || [])])],
                updatedById: req.user!.id,
                source: `${existing.source}; ${source}` // Append new source
              }
            });
          } else {
            // Create new contact
            await prisma.contact.create({
              data: {
                ...contactData,
                accountId: req.user!.accountId,
                createdById: req.user!.id,
                updatedById: req.user!.id
              }
            });
            result.successful++;
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to import ${contactData.firstName} ${contactData.lastName}: ${error}`);
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

// Import from LinkedIn CSV format
router.post('/linkedin', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filePath = '/Users/myles/Lists/LinkedIn Connections 7.25 - Connections.csv';
    
    const mapping = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email Address',
      company: 'Company',
      position: 'Position',
      linkedinUrl: 'URL',
      connectionDate: 'Connected On'
    };

    const result = await importContactsFromFile(
      filePath, 
      mapping, 
      'LinkedIn Export',
      'MW',
      req.user!.accountId,
      req.user!.id
    );

    res.json(result);
  } catch (error) {
    console.error('LinkedIn import error:', error);
    res.status(500).json({ error: 'Failed to import LinkedIn contacts' });
  }
});

// Import from event attendee lists
router.post('/event/:eventFile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { eventFile } = req.params;
    const { owner = 'MW' } = req.body;
    
    let filePath: string;
    let mapping: any;
    let source: string;

    switch (eventFile) {
      case 'sfnt':
        filePath = '/Users/myles/Lists/LI who Attended SFNT - reconciled_data_with_job_titles.csv';
        mapping = {
          firstName: 'First Name',
          lastName: 'Last Name',
          email: 'Email',
          company: 'Company',
          position: 'Job Title'
        };
        source = 'SFNT Event';
        break;
        
      case 'community-managers':
        filePath = '/Users/myles/Lists/HEAD OF COMMUNITY USA.xlsx - MylesListCommunityManagers.csv';
        mapping = {
          firstName: 'First Name',
          lastName: 'Last Name',
          email: 'Email',
          company: 'Company',
          position: 'Title'
        };
        source = 'Community Managers List';
        break;
        
      default:
        return res.status(400).json({ error: 'Unknown event file' });
    }

    const result = await importContactsFromFile(
      filePath, 
      mapping, 
      source,
      owner,
      req.user!.accountId,
      req.user!.id
    );

    res.json(result);
  } catch (error) {
    console.error('Event import error:', error);
    res.status(500).json({ error: 'Failed to import event attendees' });
  }
});

// Import Higher Tide outreach list
router.post('/higher-tide', authenticateToken, async (req: Request, res: Response) => {
  try {
    const filePath = '/Users/myles/Lists/The_Higher_Tide_MASTER_Outreach_List.csv';
    
    const mapping = {
      name: 'Name',
      position: 'Title',
      company: 'Company',
      linkedinUrl: 'LinkedIn',
      email: 'Email',
      tier: 'Tier',
      reasonWhy: 'Reason_Why',
      personalizedMessage: 'Personalized_Message',
      connectionDate: 'Connection_Date',
      source: 'Source',
      status: 'Status',
      notes: 'Notes'
    };

    const result = await importContactsFromFile(
      filePath, 
      mapping, 
      'Higher Tide Outreach',
      'MW',
      req.user!.accountId,
      req.user!.id,
      true // Special handling for Higher Tide format
    );

    res.json(result);
  } catch (error) {
    console.error('Higher Tide import error:', error);
    res.status(500).json({ error: 'Failed to import Higher Tide outreach list' });
  }
});

// Get import status and history
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get recent imports by looking at contacts with different sources
    const sourceCounts = await prisma.contact.groupBy({
      by: ['source'],
      where: { accountId: req.user!.accountId },
      _count: true,
      orderBy: { _count: { source: 'desc' } }
    });

    const recentImports = await prisma.contact.findMany({
      where: { 
        accountId: req.user!.accountId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        source: true,
        createdAt: true,
        createdBy: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      sourceCounts,
      recentImports
    });
  } catch (error) {
    console.error('Import history error:', error);
    res.status(500).json({ error: 'Failed to fetch import history' });
  }
});

// Helper function to import contacts from file
async function importContactsFromFile(
  filePath: string,
  mapping: any,
  source: string,
  owner: string,
  accountId: string,
  userId: string,
  isSpecialFormat = false
): Promise<ImportResult> {
  const result: ImportResult = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: [],
    duplicates: 0
  };

  const contacts: any[] = [];

  // Read CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        result.total++;
        
        try {
          const contact = isSpecialFormat 
            ? mapSpecialRowToContact(row, mapping, source, owner)
            : mapCsvRowToContact(row, mapping, source, owner);
            
          if (contact.firstName && contact.lastName) {
            contacts.push(contact);
          } else {
            result.failed++;
            result.errors.push(`Row ${result.total}: Missing required fields`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Row ${result.total}: ${error}`);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // Process contacts
  for (const contactData of contacts) {
    try {
      const existing = await prisma.contact.findFirst({
        where: {
          accountId,
          OR: [
            ...(contactData.email ? [{ email: contactData.email }] : []),
            { 
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              company: contactData.company
            }
          ]
        }
      });

      if (existing) {
        result.duplicates++;
        // Mark as shared if different owner
        const isShared = existing.tags?.includes('shared') || owner !== 'MW';
        const updatedTags = [...new Set([
          ...(existing.tags || []),
          ...(contactData.tags || []),
          ...(isShared ? ['shared'] : [])
        ])];

        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            ...contactData,
            tags: updatedTags,
            updatedById: userId,
            source: `${existing.source}; ${source}`
          }
        });
      } else {
        await prisma.contact.create({
          data: {
            ...contactData,
            accountId,
            createdById: userId,
            updatedById: userId,
            tags: [...(contactData.tags || []), ...(owner !== 'MW' ? ['shared'] : [])]
          }
        });
        result.successful++;
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed to import ${contactData.firstName} ${contactData.lastName}: ${error}`);
    }
  }

  return result;
}

// Map CSV row to contact object
function mapCsvRowToContact(row: any, mapping: any, source: string, owner: string): any {
  const contact: any = {
    source: `${source} (${owner})`,
    tags: [source.toLowerCase().replace(/\s+/g, '-'), owner.toLowerCase()]
  };

  for (const [field, csvColumn] of Object.entries(mapping)) {
    if (csvColumn && row[csvColumn as string]) {
      if (field === 'name' && row[csvColumn as string]) {
        const nameParts = row[csvColumn as string].split(' ');
        contact.firstName = nameParts[0];
        contact.lastName = nameParts.slice(1).join(' ');
      } else if (field === 'connectionDate') {
        contact[field] = new Date(row[csvColumn as string]);
      } else {
        contact[field] = row[csvColumn as string];
      }
    }
  }

  return contact;
}

// Map special format row (Higher Tide) to contact object
function mapSpecialRowToContact(row: any, mapping: any, source: string, owner: string): any {
  const contact = mapCsvRowToContact(row, mapping, source, owner);
  
  // Handle tier mapping
  if (row.Tier) {
    const tierMap: { [key: string]: ContactTier } = {
      'TIER 1': ContactTier.TIER_1,
      'TIER_1': ContactTier.TIER_1,
      'TIER 2': ContactTier.TIER_2,
      'TIER_2': ContactTier.TIER_2,
      'TIER 3': ContactTier.TIER_3,
      'TIER_3': ContactTier.TIER_3
    };
    contact.tier = tierMap[row.Tier] || ContactTier.TIER_3;
  }

  // Add special tags for Higher Tide
  contact.tags = [...(contact.tags || []), 'higher-tide', 'outreach-ready'];
  
  // Add notes from reason and personalized message
  if (row.Reason_Why || row.Personalized_Message) {
    contact.relationshipNotes = [
      row.Reason_Why ? `Reason: ${row.Reason_Why}` : '',
      row.Personalized_Message ? `Message: ${row.Personalized_Message}` : ''
    ].filter(Boolean).join('\n\n');
  }

  return contact;
}

export default router;