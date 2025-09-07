import express from 'express';
import { emailService } from '../services/email';

const router = express.Router();

// Test email endpoint
router.post('/test', async (req, res) => {
  try {
    const { email, type = 'referral' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    const validTypes = ['referral', 'confirmation', 'success'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid email type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    console.log(`Sending ${type} test email to ${email}...`);
    const result = await emailService.sendTestEmail(email, type as 'referral' | 'confirmation' | 'success');
    
    res.json({ 
      success: true, 
      message: `${type} test email sent successfully to ${email}`,
      result 
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send all test emails
router.post('/test/all', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    console.log(`Sending all test emails to ${email}...`);
    
    const results = [];
    const types: Array<'referral' | 'confirmation' | 'success'> = ['referral', 'confirmation', 'success'];
    
    for (const type of types) {
      try {
        const result = await emailService.sendTestEmail(email, type);
        results.push({ type, success: true, result });
        console.log(`✅ ${type} email sent successfully`);
        
        // Add delay between emails to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to send ${type} email:`, error);
        results.push({ 
          type, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    res.json({ 
      success: successful > 0,
      message: `Sent ${successful}/${total} test emails to ${email}`,
      results 
    });
  } catch (error) {
    console.error('Test email batch error:', error);
    res.status(500).json({ 
      error: 'Failed to send test emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;