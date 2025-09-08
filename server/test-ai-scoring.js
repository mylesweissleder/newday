const { aiScoringService } = require('./src/services/aiScoring');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAIScoring() {
  console.log('🧪 Testing AI Scoring System...\n');

  try {
    // Get the first account for testing
    const account = await prisma.account.findFirst();
    if (!account) {
      console.log('❌ No accounts found in database');
      return;
    }

    console.log(`📊 Testing with account: ${account.name} (${account.id})\n`);

    // Get some contacts to test with
    const contacts = await prisma.contact.findMany({
      where: { accountId: account.id, status: 'ACTIVE' },
      take: 5,
      include: {
        networkAnalytics: true,
        outreach: true,
        relationships: true,
        relatedTo: true
      }
    });

    if (contacts.length === 0) {
      console.log('❌ No contacts found for testing');
      return;
    }

    console.log(`🎯 Found ${contacts.length} contacts to test scoring:\n`);

    // Test individual contact scoring
    for (const contact of contacts) {
      try {
        console.log(`📈 Scoring: ${contact.firstName} ${contact.lastName}`);
        console.log(`   Company: ${contact.company || 'N/A'}`);
        console.log(`   Position: ${contact.position || 'N/A'}`);
        console.log(`   Relationships: ${contact.relationships.length + contact.relatedTo.length}`);
        console.log(`   Outreach: ${contact.outreach.length}`);
        
        const scoring = await aiScoringService.scoreContact(contact.id, account.id);
        
        console.log(`   ✅ Priority Score: ${Math.round(scoring.priorityScore)}/100`);
        console.log(`   🎯 Opportunity Score: ${Math.round(scoring.opportunityScore)}/100`);
        console.log(`   ⭐ Strategic Value: ${Math.round(scoring.strategicValue)}/100`);
        
        if (scoring.opportunityFlags.length > 0) {
          console.log(`   🚀 Opportunity Flags: ${scoring.opportunityFlags.join(', ')}`);
        }
        
        console.log('');
      } catch (error) {
        console.log(`   ❌ Error scoring ${contact.firstName} ${contact.lastName}: ${error.message}\n`);
      }
    }

    // Test batch scoring
    console.log('🔄 Testing batch scoring...');
    const contactIds = contacts.slice(0, 3).map(c => c.id);
    
    await aiScoringService.batchScoreContacts(
      account.id, 
      contactIds, 
      ['technology', 'startup', 'venture']
    );
    
    console.log('✅ Batch scoring completed\n');

    // Test AI recommendations
    console.log('🤖 Testing AI recommendations...');
    
    const [topPriority, opportunities, strategic] = await Promise.all([
      aiScoringService.getTopPriorityContacts(account.id, 3),
      aiScoringService.getHighOpportunityContacts(account.id, 3),
      aiScoringService.getStrategicNetworkingRecommendations(account.id, 3)
    ]);

    console.log(`📊 Top Priority Contacts: ${topPriority.length}`);
    topPriority.forEach(contact => {
      console.log(`   • ${contact.firstName} ${contact.lastName} (Score: ${Math.round(contact.priorityScore || 0)})`);
    });

    console.log(`\n🎯 High Opportunity Contacts: ${opportunities.length}`);
    opportunities.forEach(contact => {
      console.log(`   • ${contact.firstName} ${contact.lastName} (Score: ${Math.round(contact.opportunityScore || 0)})`);
    });

    console.log(`\n⭐ Strategic Networking Recommendations: ${strategic.length}`);
    strategic.forEach(contact => {
      console.log(`   • ${contact.firstName} ${contact.lastName} (Score: ${Math.round(contact.strategicValue || 0)})`);
    });

    console.log('\n✅ All AI scoring tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAIScoring().catch(console.error);