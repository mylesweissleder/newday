import { Resend } from 'resend';

// Initialize Resend with API key check
const resendApiKey = process.env.RESEND_API_KEY;
let resend: Resend | null = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn('⚠️ RESEND_API_KEY not found in environment variables - email functionality disabled');
}

interface EmailTemplate {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;
  private fromAddress = 'TrueCrew <onboarding@resend.dev>';

  static getInstance() {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(template: EmailTemplate) {
    if (!resend) {
      throw new Error('Email service not initialized - RESEND_API_KEY missing');
    }

    try {
      const { data, error } = await resend.emails.send({
        from: this.fromAddress,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      if (error) {
        console.error('Email sending error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log('Email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  // Referral Request Email Template
  generateReferralRequestEmail(data: {
    facilitatorName: string;
    requesterName: string;
    contactName: string;
    contactCompany: string;
    purpose: string;
    message: string;
    connectionStrength?: string;
    talkingPoints?: string[];
    acceptUrl: string;
    declineUrl: string;
    questionsUrl: string;
  }): EmailTemplate {
    const { 
      facilitatorName, 
      requesterName, 
      contactName, 
      contactCompany, 
      purpose, 
      message,
      connectionStrength,
      talkingPoints = [],
      acceptUrl,
      declineUrl,
      questionsUrl
    } = data;

    const subject = `${requesterName} needs an intro to ${contactName} at ${contactCompany}`;
    
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px;">🤝 TrueCrew</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Referral Request</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Hi ${facilitatorName},</h2>
          <p style="margin: 0 0 15px 0; color: #374151;">
            <strong>${requesterName}</strong> is looking for an introduction to <strong>${contactName}</strong> ${contactCompany ? `(${contactCompany})` : ''} from your network.
          </p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">📋 Request Details</h3>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px;">
            <p style="margin: 0 0 10px 0;"><strong>Purpose:</strong> ${purpose}</p>
            ${connectionStrength ? `<p style="margin: 0 0 10px 0;"><strong>Your Connection:</strong> ${connectionStrength}</p>` : ''}
            <p style="margin: 0; color: #6b7280;"><em>"${message}"</em></p>
          </div>
        </div>

        ${talkingPoints.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">💬 Talking Points</h3>
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px;">
            <ul style="margin: 0; padding-left: 20px;">
              ${talkingPoints.map(point => `<li style="margin-bottom: 5px;">${point}</li>`).join('')}
            </ul>
          </div>
        </div>
        ` : ''}

        <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; margin-bottom: 25px;">
          <div style="text-align: center; background: #f3f4f6; padding: 20px; border-radius: 6px;">
            <p style="margin: 0; color: #374151; font-size: 14px;"><strong>📧 Reply to this email to respond</strong></p>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Or log into TrueCrew to manage all referrals</p>
          </div>
        </div>

        <div style="background: #fef3c7; border: 1px solid #d97706; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            ⏰ This intro request will expire in 7 days.<br>
            📱 Reply to this email or log into TrueCrew to manage requests
          </p>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">Thanks for being an awesome crew member! 🤝</p>
          <p style="margin: 5px 0 0 0;">The TrueCrew Team</p>
        </div>
      </div>
    `;

    const text = `
Hi ${facilitatorName},

${requesterName} is looking for an introduction to ${contactName} ${contactCompany ? `(${contactCompany})` : ''} from your network.

PURPOSE: ${purpose}
${connectionStrength ? `YOUR CONNECTION: ${connectionStrength}` : ''}
CONTEXT: "${message}"

${talkingPoints.length > 0 ? `TALKING POINTS:\n${talkingPoints.map(point => `• ${point}`).join('\n')}\n` : ''}

QUICK ACTIONS:
- Make Introduction: ${acceptUrl}
- Ask Questions: ${questionsUrl}  
- Decline: ${declineUrl}

This intro request will expire in 7 days.
Reply to this email or log into TrueCrew to manage requests

Best,
The TrueCrew Team
    `;

    return {
      to: [],
      subject,
      html,
      text
    };
  }

  // Introduction Sent Confirmation
  generateIntroSentConfirmation(data: {
    facilitatorName: string;
    requesterName: string;
    contactName: string;
    introPreview: string;
  }): EmailTemplate {
    const { facilitatorName, requesterName, contactName, introPreview } = data;
    
    const subject = `✅ Introduction sent: ${requesterName} → ${contactName}`;
    
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px;">🤝 TrueCrew</h1>
          <p style="color: #10b981; margin: 5px 0 0 0; font-weight: 500;">Introduction Sent!</p>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h2 style="margin: 0 0 10px 0; color: #065f46; font-size: 18px;">Great work, ${facilitatorName}! 🎉</h2>
          <p style="margin: 0; color: #047857;">Your introduction between <strong>${requesterName}</strong> and <strong>${contactName}</strong> has been sent.</p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">🔄 What Happens Next:</h3>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">We'll track if they schedule a meeting</li>
            <li style="margin-bottom: 8px;">You'll get updates on any positive outcomes</li>
            <li style="margin-bottom: 8px;">No further action needed from you</li>
          </ul>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-bottom: 25px;">
          <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 14px;">📧 INTRO PREVIEW:</h3>
          <p style="margin: 0; color: #6b7280; font-style: italic;">"${introPreview}..."</p>
        </div>

        <div style="text-align: center; margin-bottom: 25px; background: #f3f4f6; padding: 15px; border-radius: 6px;">
          <p style="margin: 0; color: #374151; font-size: 14px;">📧 Manage your introductions by logging into TrueCrew</p>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">Thanks for being an awesome crew member! 🤝</p>
        </div>
      </div>
    `;

    const text = `
Great work, ${facilitatorName}!

Your introduction between ${requesterName} and ${contactName} has been sent.

WHAT HAPPENS NEXT:
• We'll track if they schedule a meeting
• You'll get updates on any positive outcomes  
• No further action needed from you

INTRO PREVIEW:
"${introPreview}..."

Log into TrueCrew to view and track your introductions

Thanks for being an awesome crew member! 🤝
    `;

    return {
      to: [],
      subject,
      html,
      text
    };
  }

  // Success Celebration Email
  generateSuccessEmail(data: {
    facilitatorName: string;
    requesterName: string;
    contactName: string;
    outcome: string;
  }): EmailTemplate {
    const { facilitatorName, requesterName, contactName, outcome } = data;
    
    const subject = `🚀 Your intro worked! ${requesterName} connected with ${contactName}`;
    
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 24px;">🤝 TrueCrew</h1>
          <div style="font-size: 48px; margin: 10px 0;">🎉</div>
          <p style="color: #10b981; margin: 5px 0 0 0; font-weight: 500; font-size: 18px;">Success Story!</p>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 25px;">
          <h2 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px;">Amazing work, ${facilitatorName}! 🚀</h2>
          <p style="margin: 0; color: #047857; font-size: 16px;">Your intro worked! <strong>${requesterName}</strong> just ${outcome} with <strong>${contactName}</strong></p>
        </div>

        <div style="background: #fef3c7; border: 1px solid #d97706; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 25px;">
          <p style="margin: 0; color: #92400e; font-size: 16px;">
            <strong>This is what TrueCrew is all about</strong><br>
            <span style="font-size: 14px;">Making meaningful connections that create real opportunities</span>
          </p>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">Keep up the great work! Your network is making a difference 🌟</p>
          <p style="margin: 5px 0 0 0;">The TrueCrew Team</p>
        </div>
      </div>
    `;

    const text = `
Amazing work, ${facilitatorName}! 🚀

Your intro worked! ${requesterName} just ${outcome} with ${contactName}

This is what TrueCrew is all about - making meaningful connections that create real opportunities.

Keep up the great work! Your network is making a difference 🌟

The TrueCrew Team
    `;

    return {
      to: [],
      subject,
      html,
      text
    };
  }

  // Test Email
  async sendTestEmail(recipientEmail: string, type: 'referral' | 'confirmation' | 'success' = 'referral') {
    let template: EmailTemplate;

    switch (type) {
      case 'referral':
        template = this.generateReferralRequestEmail({
          facilitatorName: 'Myles',
          requesterName: 'Alex Johnson',
          contactName: 'Sarah Chen',
          contactCompany: 'Sequoia Capital',
          purpose: 'Series A funding for AI startup',
          message: 'We\'re raising $3M Series A and Sarah\'s portfolio aligns perfectly with our AI/fintech focus',
          connectionStrength: 'Strong connection - both attended Stanford GSB',
          talkingPoints: [
            'Both attended Stanford GSB',
            'Shared interest in AI infrastructure',
            'Connected through fintech meetup network'
          ],
          acceptUrl: 'https://truecrew.app/referrals/accept/123',
          declineUrl: 'https://truecrew.app/referrals/decline/123',
          questionsUrl: 'https://truecrew.app/referrals/questions/123'
        });
        break;

      case 'confirmation':
        template = this.generateIntroSentConfirmation({
          facilitatorName: 'Myles',
          requesterName: 'Alex Johnson',
          contactName: 'Sarah Chen',
          introPreview: 'Hi Sarah, I\'d like to introduce you to Alex Johnson. He\'s building an impressive AI startup that\'s right in your investment wheelhouse'
        });
        break;

      case 'success':
        template = this.generateSuccessEmail({
          facilitatorName: 'Myles',
          requesterName: 'Alex Johnson',
          contactName: 'Sarah Chen',
          outcome: 'scheduled a meeting'
        });
        break;
    }

    template.to = [recipientEmail];
    return await this.sendEmail(template);
  }
}

export const emailService = EmailService.getInstance();