import express, { Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { ContactTier } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

interface BulkImportResult {
  total: number;
  successful: number;
  failed: number;
  duplicates: number;
  errors: string[];
  summary: {
    byTier: { [key: string]: number };
    byCompany: { [key: string]: number };
    bySource: { [key: string]: number };
  };
}

// Bulk upload CSV file
router.post('/bulk-csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { 
      source = 'Bulk Upload', 
      owner = 'MW',
      fieldMapping,
      defaultTier = 'TIER_3',
      skipDuplicates = true
    } = req.body;

    let mapping: any = {};
    
    // Parse field mapping if provided
    if (fieldMapping) {
      try {
        mapping = JSON.parse(fieldMapping);
      } catch (e) {
        // Use default mapping
        mapping = {
          firstName: 'First Name',
          lastName: 'Last Name',
          email: 'Email',
          company: 'Company',
          position: 'Position',
          linkedinUrl: 'LinkedIn',
          phone: 'Phone'
        };
      }
    } else {
      // Auto-detect common column names
      mapping = await detectColumnMapping(req.file.path);
    }

    const result = await processBulkCSV(
      req.file.path, 
      mapping, 
      source, 
      owner,
      req.user!.accountId,
      req.user!.id,
      { skipDuplicates, defaultTier }
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(result);
  } catch (error) {
    console.error('Bulk upload error:', error);
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

// Preview CSV file structure
router.post('/preview-csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const preview = await previewCSV(req.file.path);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(preview);
  } catch (error) {
    console.error('CSV preview error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to preview CSV' });
  }
});

// Bulk import from multiple predefined lists
router.post('/bulk-predefined', async (req: Request, res: Response) => {
  try {
    const { lists, owner = 'MW' } = req.body;

    if (!Array.isArray(lists) || lists.length === 0) {
      return res.status(400).json({ error: 'Please select at least one list to import' });
    }

    const results: any[] = [];
    let totalContacts = 0;
    let totalSuccessful = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;

    // Process each selected list
    for (const listType of lists) {
      let filePath: string;
      let mapping: any;
      let source: string;

      switch (listType) {
        case 'linkedin':
          filePath = '/Users/myles/Lists/LinkedIn Connections 7.25 - Connections.csv';
          mapping = {
            firstName: 'First Name',
            lastName: 'Last Name',
            email: 'Email Address',
            company: 'Company',
            position: 'Position',
            linkedinUrl: 'URL',
            connectionDate: 'Connected On'
          };
          source = 'LinkedIn Connections';
          break;

        case 'sfnt':
          filePath = '/Users/myles/Lists/LI who Attended SFNT - reconciled_data_with_job_titles.csv';
          mapping = {
            firstName: 'First Name',
            lastName: 'Last Name',
            email: 'Email',
            company: 'Company',
            position: 'Job Title'
          };
          source = 'SFNT Event Attendees';
          break;

        case 'higher-tide':
          filePath = '/Users/myles/Lists/The_Higher_Tide_MASTER_Outreach_List.csv';
          mapping = {
            name: 'Name',
            position: 'Title',
            company: 'Company',
            linkedinUrl: 'LinkedIn',
            email: 'Email',
            tier: 'Tier'
          };
          source = 'Higher Tide Outreach';
          break;

        case 'vcs':
          filePath = '/Users/myles/Lists/US Seed VCs + Sample lists - US seed VCs.csv';
          mapping = {
            firstName: 'First Name',
            lastName: 'Last Name',
            email: 'Email',
            company: 'Firm',
            position: 'Title'
          };
          source = 'US Seed VCs';
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
          source = 'Community Managers';
          break;

        default:
          continue;
      }

      if (fs.existsSync(filePath)) {
        const result = await processBulkCSV(
          filePath,
          mapping,
          source,
          owner,
          req.user!.accountId,
          req.user!.id,
          { skipDuplicates: true, defaultTier: 'TIER_3', isSpecialFormat: listType === 'higher-tide' }
        );

        results.push({
          list: listType,
          source,
          ...result
        });

        totalContacts += result.total;
        totalSuccessful += result.successful;
        totalDuplicates += result.duplicates;
        totalFailed += result.failed;
      }
    }

    res.json({
      summary: {
        totalLists: results.length,
        totalContacts,
        totalSuccessful,
        totalDuplicates,
        totalFailed
      },
      results
    });
  } catch (error) {
    console.error('Bulk predefined import error:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// Helper function to process bulk CSV
async function processBulkCSV(
  filePath: string,
  mapping: any,
  source: string,
  owner: string,
  accountId: string,
  userId: string,
  options: {
    skipDuplicates?: boolean;
    defaultTier?: string;
    isSpecialFormat?: boolean;
  } = {}
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    total: 0,
    successful: 0,
    failed: 0,
    duplicates: 0,
    errors: [],
    summary: {
      byTier: {},
      byCompany: {},
      bySource: {}
    }
  };

  const contacts: any[] = [];

  // Read CSV file
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        result.total++;
        
        try {
          const contact = options.isSpecialFormat
            ? mapSpecialRowToContact(row, mapping, source, owner)
            : mapCsvRowToContact(row, mapping, source, owner);
            
          if (contact.firstName && contact.lastName) {
            // Set default tier if not specified
            if (!contact.tier && options.defaultTier) {
              contact.tier = options.defaultTier;
            }
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

  // Process contacts in batches
  const batchSize = 50;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    for (const contactData of batch) {
      try {
        // Check for existing contact
        const existing = await prisma.contact.findFirst({
          where: {
            accountId,
            OR: [
              { email: contactData.email },
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
          
          if (!options.skipDuplicates) {
            // Update existing contact
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
          }
        } else {
          // Create new contact
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

          // Update summary stats
          const tier = contactData.tier || 'UNASSIGNED';
          const company = contactData.company || 'Unknown';
          
          result.summary.byTier[tier] = (result.summary.byTier[tier] || 0) + 1;
          result.summary.byCompany[company] = (result.summary.byCompany[company] || 0) + 1;
          result.summary.bySource[source] = (result.summary.bySource[source] || 0) + 1;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to import ${contactData.firstName} ${contactData.lastName}: ${error}`);
      }
    }
  }

  return result;
}

// Helper function to preview CSV structure
async function previewCSV(filePath: string): Promise<any> {
  const preview: any = {
    columns: [],
    sampleRows: [],
    totalRows: 0,
    detectedMapping: {}
  };

  let rowCount = 0;
  const sampleRows: any[] = [];

  await new Promise<void>((resolve) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        preview.columns = headers;
        preview.detectedMapping = detectMappingFromHeaders(headers);
      })
      .on('data', (row) => {
        rowCount++;
        if (sampleRows.length < 5) {
          sampleRows.push(row);
        }
      })
      .on('end', () => {
        preview.totalRows = rowCount;
        preview.sampleRows = sampleRows;
        resolve();
      });
  });

  return preview;
}

// Helper functions for mapping
function detectColumnMapping(filePath: string): Promise<any> {
  return new Promise((resolve) => {
    const mapping: any = {};
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        resolve(detectMappingFromHeaders(headers));
      })
      .on('error', () => {
        resolve({});
      });
  });
}

function detectMappingFromHeaders(headers: string[]): any {
  const mapping: any = {};
  const headerLower = headers.map(h => h.toLowerCase().trim());

  // Common field mappings
  const fieldMappings: { [key: string]: string[] } = {
    firstName: ['first name', 'firstname', 'first_name', 'given name'],
    lastName: ['last name', 'lastname', 'last_name', 'surname', 'family name'],
    email: ['email', 'email address', 'e-mail', 'mail'],
    company: ['company', 'organization', 'org', 'employer', 'firm'],
    position: ['position', 'title', 'job title', 'role', 'job'],
    phone: ['phone', 'telephone', 'mobile', 'cell'],
    linkedinUrl: ['linkedin', 'linkedin url', 'linkedin profile', 'url'],
    city: ['city', 'location', 'loc'],
    state: ['state', 'region', 'province'],
    country: ['country', 'nation']
  };

  for (const [field, variations] of Object.entries(fieldMappings)) {
    for (const variation of variations) {
      const index = headerLower.indexOf(variation);
      if (index !== -1) {
        mapping[field] = headers[index];
        break;
      }
    }
  }

  return mapping;
}

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

function mapSpecialRowToContact(row: any, mapping: any, source: string, owner: string): any {
  const contact = mapCsvRowToContact(row, mapping, source, owner);
  
  // Handle tier mapping for Higher Tide format
  if (row.Tier) {
    const tierMap: { [key: string]: any } = {
      'TIER 1': 'TIER_1',
      'TIER_1': 'TIER_1',
      'TIER 2': 'TIER_2',
      'TIER_2': 'TIER_2',
      'TIER 3': 'TIER_3',
      'TIER_3': 'TIER_3'
    };
    contact.tier = tierMap[row.Tier] || 'TIER_3';
  }

  // Add special tags
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