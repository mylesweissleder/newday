import { PrismaClient } from '@prisma/client';
import { opportunitySuggestionService } from './opportunitySuggestionService';

const prisma = new PrismaClient();

export interface NotificationSettings {
  enabledCategories: string[];
  minConfidenceThreshold: number;
  minImpactThreshold: number;
  dailyDigest: boolean;
  realTimeAlerts: boolean;
  urgentOpportunitiesOnly: boolean;
}

export interface OpportunityNotification {
  id: string;
  type: 'NEW_OPPORTUNITY' | 'URGENT_OPPORTUNITY' | 'OPPORTUNITY_EXPIRING' | 'DAILY_DIGEST';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  opportunityIds: string[];
  userId: string;
  accountId: string;
  sentAt?: Date;
  readAt?: Date;
  dismissedAt?: Date;
  metadata: any;
}

export class OpportunityNotificationService {

  /**
   * Process new opportunities and send notifications
   */
  async processNewOpportunities(accountId: string): Promise<void> {
    try {
      // Get user notification settings
      const users = await prisma.user.findMany({
        where: { accountId }
      });

      if (users.length === 0) return;

      // Get recent opportunities (last 24 hours)
      const recentOpportunities = await prisma.opportunitySuggestion.findMany({
        where: {
          accountId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: 'PENDING'
        },
        include: {
          primaryContact: {
            select: { firstName: true, lastName: true, company: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { confidenceScore: 'desc' }
        ]
      });

      if (recentOpportunities.length === 0) return;

      // Process notifications for each user
      for (const user of users) {
        await this.createUserNotifications(user, recentOpportunities);
      }

    } catch (error) {
      console.error('Error processing new opportunities:', error);
    }
  }

  /**
   * Create notifications for a specific user based on their preferences
   */
  private async createUserNotifications(user: any, opportunities: any[]): Promise<void> {
    const settings = await this.getUserNotificationSettings(user.id);
    
    // Filter opportunities based on user preferences
    const relevantOpportunities = opportunities.filter(opp => {
      // Check category preferences
      if (settings.enabledCategories.length > 0 && 
          !settings.enabledCategories.includes(opp.category)) {
        return false;
      }

      // Check confidence threshold
      if (opp.confidenceScore < settings.minConfidenceThreshold) {
        return false;
      }

      // Check impact threshold
      if (opp.impactScore < settings.minImpactThreshold) {
        return false;
      }

      // Check if urgent only
      if (settings.urgentOpportunitiesOnly && opp.priority !== 'URGENT') {
        return false;
      }

      return true;
    });

    if (relevantOpportunities.length === 0) return;

    // Create different types of notifications
    await this.createUrgentOpportunityNotifications(user, relevantOpportunities);
    await this.createNewOpportunityNotifications(user, relevantOpportunities);
    await this.createExpiringOpportunityNotifications(user, relevantOpportunities);
  }

  /**
   * Create urgent opportunity notifications
   */
  private async createUrgentOpportunityNotifications(user: any, opportunities: any[]): Promise<void> {
    const urgentOpportunities = opportunities.filter(opp => opp.priority === 'URGENT');
    
    if (urgentOpportunities.length === 0) return;

    for (const opportunity of urgentOpportunities) {
      const notification: Omit<OpportunityNotification, 'id'> = {
        type: 'URGENT_OPPORTUNITY',
        title: 'Urgent Opportunity Detected!',
        message: `High-impact opportunity: ${opportunity.title}. Confidence: ${Math.round(opportunity.confidenceScore * 100)}%`,
        priority: 'URGENT',
        opportunityIds: [opportunity.id],
        userId: user.id,
        accountId: user.accountId,
        metadata: {
          opportunityTitle: opportunity.title,
          contactName: opportunity.primaryContact ? 
            `${opportunity.primaryContact.firstName} ${opportunity.primaryContact.lastName}` : null,
          company: opportunity.primaryContact?.company,
          confidenceScore: opportunity.confidenceScore,
          impactScore: opportunity.impactScore
        }
      };

      await this.saveNotification(notification);
      await this.sendRealTimeAlert(notification);
    }
  }

  /**
   * Create new opportunity notifications
   */
  private async createNewOpportunityNotifications(user: any, opportunities: any[]): Promise<void> {
    const newOpportunities = opportunities.filter(opp => opp.priority !== 'URGENT');
    
    if (newOpportunities.length === 0) return;

    // Group by priority
    const highPriorityOps = newOpportunities.filter(opp => opp.priority === 'HIGH');
    const mediumPriorityOps = newOpportunities.filter(opp => opp.priority === 'MEDIUM');

    if (highPriorityOps.length > 0) {
      const notification: Omit<OpportunityNotification, 'id'> = {
        type: 'NEW_OPPORTUNITY',
        title: `${highPriorityOps.length} New High-Priority Opportunities`,
        message: `New opportunities detected: ${highPriorityOps.map(op => op.title).slice(0, 2).join(', ')}${highPriorityOps.length > 2 ? ` and ${highPriorityOps.length - 2} more` : ''}`,
        priority: 'HIGH',
        opportunityIds: highPriorityOps.map(op => op.id),
        userId: user.id,
        accountId: user.accountId,
        metadata: {
          count: highPriorityOps.length,
          topOpportunities: highPriorityOps.slice(0, 3).map(op => ({
            title: op.title,
            confidence: op.confidenceScore,
            impact: op.impactScore
          }))
        }
      };

      await this.saveNotification(notification);
    }

    if (mediumPriorityOps.length > 0) {
      const notification: Omit<OpportunityNotification, 'id'> = {
        type: 'NEW_OPPORTUNITY',
        title: `${mediumPriorityOps.length} New Opportunities`,
        message: `Medium-priority opportunities ready for review`,
        priority: 'MEDIUM',
        opportunityIds: mediumPriorityOps.map(op => op.id),
        userId: user.id,
        accountId: user.accountId,
        metadata: {
          count: mediumPriorityOps.length
        }
      };

      await this.saveNotification(notification);
    }
  }

  /**
   * Create expiring opportunity notifications
   */
  private async createExpiringOpportunityNotifications(user: any, opportunities: any[]): Promise<void> {
    const expiringOpportunities = opportunities.filter(opp => {
      if (!opp.expiresAt) return false;
      const daysUntilExpiry = (opp.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry <= 3 && daysUntilExpiry > 0; // Expiring within 3 days
    });

    if (expiringOpportunities.length === 0) return;

    const notification: Omit<OpportunityNotification, 'id'> = {
      type: 'OPPORTUNITY_EXPIRING',
      title: 'Opportunities Expiring Soon',
      message: `${expiringOpportunities.length} opportunities expire within 3 days`,
      priority: 'HIGH',
      opportunityIds: expiringOpportunities.map(op => op.id),
      userId: user.id,
      accountId: user.accountId,
      metadata: {
        count: expiringOpportunities.length,
        opportunities: expiringOpportunities.map(op => ({
          title: op.title,
          expiresAt: op.expiresAt,
          daysRemaining: Math.ceil((op.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }))
      }
    };

    await this.saveNotification(notification);
    await this.sendRealTimeAlert(notification);
  }

  /**
   * Generate and send daily digest
   */
  async sendDailyDigest(accountId: string): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: { accountId }
      });

      for (const user of users) {
        const settings = await this.getUserNotificationSettings(user.id);
        
        if (!settings.dailyDigest) continue;

        // Get top opportunities for the day
        const topOpportunities = await opportunitySuggestionService.generateOpportunitySuggestions(
          accountId, 
          { 
            limit: 5, 
            sortBy: 'composite',
            minConfidence: settings.minConfidenceThreshold 
          }
        );

        if (topOpportunities.length === 0) continue;

        const notification: Omit<OpportunityNotification, 'id'> = {
          type: 'DAILY_DIGEST',
          title: 'Your Daily Opportunity Digest',
          message: `${topOpportunities.length} opportunities ready for your review`,
          priority: 'MEDIUM',
          opportunityIds: topOpportunities.slice(0, 5).map(op => op.id || '').filter(Boolean),
          userId: user.id,
          accountId: user.accountId,
          metadata: {
            count: topOpportunities.length,
            topOpportunities: topOpportunities.slice(0, 5).map(op => ({
              title: op.title,
              category: op.category,
              confidence: op.confidenceScore,
              impact: op.impactScore,
              priority: op.priority
            }))
          }
        };

        await this.saveNotification(notification);
      }

    } catch (error) {
      console.error('Error sending daily digest:', error);
    }
  }

  /**
   * Get user notification settings
   */
  private async getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
    // In a real implementation, this would fetch from user preferences
    // For now, return default settings
    return {
      enabledCategories: ['INTRODUCTION', 'RECONNECTION', 'BUSINESS_MATCH', 'STRATEGIC_MOVE'],
      minConfidenceThreshold: 0.4,
      minImpactThreshold: 60,
      dailyDigest: true,
      realTimeAlerts: true,
      urgentOpportunitiesOnly: false
    };
  }

  /**
   * Save notification to database
   */
  private async saveNotification(notification: Omit<OpportunityNotification, 'id'>): Promise<void> {
    try {
      // In a real implementation, you'd have a notifications table
      // For now, we'll log the notification
      console.log('Notification created:', {
        type: notification.type,
        title: notification.title,
        userId: notification.userId,
        priority: notification.priority
      });

      // TODO: Save to notifications table when implemented
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  /**
   * Send real-time alert (WebSocket, push notification, etc.)
   */
  private async sendRealTimeAlert(notification: Omit<OpportunityNotification, 'id'>): Promise<void> {
    try {
      // In a real implementation, this would send via WebSocket, push notifications, etc.
      console.log('Real-time alert sent:', notification.title);
      
      // TODO: Implement WebSocket or push notification delivery
    } catch (error) {
      console.error('Error sending real-time alert:', error);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<OpportunityNotification[]> {
    // In a real implementation, this would fetch from notifications table
    // For now, return empty array
    return [];
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      // TODO: Update notification read status in database
      console.log(`Notification ${notificationId} marked as read by ${userId}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(notificationId: string, userId: string): Promise<void> {
    try {
      // TODO: Update notification dismissed status in database
      console.log(`Notification ${notificationId} dismissed by ${userId}`);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }

  /**
   * Update user notification settings
   */
  async updateUserNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
    try {
      // TODO: Update user notification preferences in database
      console.log(`Notification settings updated for user ${userId}:`, settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  /**
   * Schedule periodic opportunity processing
   */
  startPeriodicProcessing(accountId: string): void {
    // Process new opportunities every hour
    setInterval(async () => {
      await this.processNewOpportunities(accountId);
    }, 60 * 60 * 1000); // 1 hour

    // Send daily digest at 9 AM
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        await this.sendDailyDigest(accountId);
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Manual trigger for opportunity processing (for testing)
   */
  async triggerOpportunityProcessing(accountId: string): Promise<{
    processed: number;
    notifications: number;
  }> {
    try {
      const before = await this.getUserNotifications('test-user', 100);
      await this.processNewOpportunities(accountId);
      const after = await this.getUserNotifications('test-user', 100);

      return {
        processed: 1,
        notifications: after.length - before.length
      };
    } catch (error) {
      console.error('Error triggering opportunity processing:', error);
      return { processed: 0, notifications: 0 };
    }
  }
}

export const opportunityNotificationService = new OpportunityNotificationService();