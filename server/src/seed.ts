
import bcrypt from 'bcryptjs';
import fs from 'fs';
import csv from 'csv-parser';

import prisma from "../utils/prisma";

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create demo account and admin user
    const hashedPassword = await bcrypt.hash('demo123456', 12);

    const account = await prisma.account.create({
      data: {
        name: 'Demo Network CRM',
        email: 'demo@networkcrm.com',
        password: hashedPassword
      }
    });

    const adminUser = await prisma.user.create({
      data: {
        email: 'demo@networkcrm.com',
        password: hashedPassword,
        firstName: 'Demo',
        lastName: 'Admin',
        role: 'ADMIN',
        accountId: account.id
      }
    });

    console.log('✅ Created demo account and admin user');

    // Import sample contacts from Higher Tide list (first 20 for demo)
    const contacts: any[] = [];
    let rowCount = 0;

    await new Promise<void>((resolve) => {
      fs.createReadStream('/Users/myles/Lists/The_Higher_Tide_MASTER_Outreach_List.csv')
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          if (rowCount <= 20) { // Limit to first 20 for demo
            const nameParts = (row.Name || '').split(' ');
            const firstName = nameParts[0] || 'Unknown';
            const lastName = nameParts.slice(1).join(' ') || 'Contact';

            contacts.push({
              firstName,
              lastName,
              email: row.Email || null,
              company: row.Company || null,
              position: row.Title || null,
              linkedinUrl: row.LinkedIn || null,
              tier: row.Tier === 'TIER 1' ? 'TIER_1' : row.Tier === 'TIER 2' ? 'TIER_2' : 'TIER_3',
              source: 'Higher Tide Demo',
              tags: ['higher-tide', 'demo', 'outreach-ready'],
              relationshipNotes: row.Reason_Why || null,
              accountId: account.id,
              createdById: adminUser.id,
              updatedById: adminUser.id
            });
          }
        })
        .on('end', resolve);
    });

    // Create contacts
    for (const contactData of contacts) {
      await prisma.contact.create({ data: contactData });
    }

    console.log(`✅ Created ${contacts.length} demo contacts`);

    // Create demo campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: 'Higher Tide Launch Campaign',
        description: 'Initial outreach for Higher Tide community launch',
        objective: 'Build awareness and generate interest in community-first business model',
        status: 'ACTIVE',
        emailTemplate: 'Hi {{firstName}}, I\'m launching The Higher Tide, a community focused on Go-to-Community strategies. Your experience at {{company}} would bring valuable insights. Interested in being part of our founding community?',
        accountId: account.id
      }
    });

    // Add top tier contacts to campaign
    const tier1Contacts = await prisma.contact.findMany({
      where: {
        accountId: account.id,
        tier: 'TIER_1'
      },
      take: 10
    });

    for (const contact of tier1Contacts) {
      await prisma.campaignContact.create({
        data: {
          campaignId: campaign.id,
          contactId: contact.id,
          status: 'PENDING'
        }
      });
    }

    console.log(`✅ Created demo campaign with ${tier1Contacts.length} contacts`);

    // Create some sample outreach records
    for (const contact of tier1Contacts.slice(0, 5)) {
      await prisma.outreach.create({
        data: {
          contactId: contact.id,
          type: 'LINKEDIN',
          message: `Hi ${contact.firstName}, I'm launching The Higher Tide, focusing on community-led growth strategies. Your work at ${contact.company} caught my attention. Would love to connect!`,
          status: 'SENT',
          sentAt: new Date(),
          sentById: adminUser.id
        }
      });
    }

    console.log('✅ Created sample outreach records');
    console.log('\n🎉 Seed completed successfully!');
    console.log('\nDemo credentials:');
    console.log('Email: demo@networkcrm.com');
    console.log('Password: demo123456');
    console.log('\nStart the application with: npm run dev');

  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();