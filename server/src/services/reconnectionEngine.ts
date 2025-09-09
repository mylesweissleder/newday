
import { OpportunityCategory, OpportunityType, OpportunityPriority, RelationshipType } from '@prisma/client';

import prisma from "../utils/prisma";

export interface ReconnectionOpportunity {
  contact: {
    id: string;
    name: string;
    company?: string;
    position?: string;
    relationshipType?: RelationshipType;
    lastContactDate?: Date;
    daysSinceLastContact: number;
    connectionDate?: Date;
    totalOutreachCount: number;
    responseRate: number;
  };
  reconnection: {
    confidenceScore: number;
    impactScore: number;
    effortScore: number;
    urgencyScore: number;
    optimalTiming: Date;
    reasoningFactors: string[];
    suggestedApproach: ReconnectionApproach;
    suggestedMessage: string;
    category: OpportunityCategory;
    type: OpportunityType;
    priority: OpportunityPriority;
  };
}

export interface ReconnectionApproach {
  method: 'EMAIL' | 'LINKEDIN' | 'PHONE' | 'MEETING';
  tone: 'CASUAL' | 'PROFESSIONAL' | 'PERSONAL';
  context: string;
  reason: string;
}

export interface ReconnectionFilters {
  minDaysSinceContact?: number;
  maxDaysSinceContact?: number;
  relationshipTypes?: RelationshipType[];
  minPriorityScore?: number;
  industries?: string[];
  hasResponseHistory?: boolean;
}

export class ReconnectionTimingEngine {

  /**
   * Detect reconnection opportunities for an account
   */
  async detectReconnectionOpportunities(
    accountId: string, 
    filters: ReconnectionFilters = {},
    limit: number = 30
  ): Promise<ReconnectionOpportunity[]> {
    
    const baseWhere: any = {
      accountId,
      status: 'ACTIVE',
      lastContactDate: { not: null }
    };

    // Apply filters
    if (filters.minDaysSinceContact || filters.maxDaysSinceContact) {
      const now = new Date();
      if (filters.maxDaysSinceContact) {
        const maxDate = new Date(now.getTime() - (filters.maxDaysSinceContact * 24 * 60 * 60 * 1000));
        baseWhere.lastContactDate = { ...baseWhere.lastContactDate, lte: maxDate };
      }
      if (filters.minDaysSinceContact) {
        const minDate = new Date(now.getTime() - (filters.minDaysSinceContact * 24 * 60 * 60 * 1000));
        baseWhere.lastContactDate = { ...baseWhere.lastContactDate, gte: minDate };
      }
    }

    if (filters.relationshipTypes && filters.relationshipTypes.length > 0) {
      baseWhere.relationshipType = { in: filters.relationshipTypes };
    }

    if (filters.minPriorityScore) {
      baseWhere.priorityScore = { gte: filters.minPriorityScore };
    }

    // Get dormant contacts with outreach history
    const dormantContacts = await prisma.contact.findMany({
      where: baseWhere,
      include: {
        outreach: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        campaignContacts: {
          include: {
            campaign: {
              select: {
                name: true,
                status: true
              }
            }
          }
        },
        networkAnalytics: true
      }
    });

    const opportunities: ReconnectionOpportunity[] = [];

    for (const contact of dormantContacts) {
      const opportunity = await this.analyzeReconnectionOpportunity(contact, accountId);
      
      if (opportunity && opportunity.reconnection.confidenceScore >= 0.3) {
        opportunities.push(opportunity);
      }
    }

    // Sort by urgency and potential impact
    return opportunities
      .sort((a, b) => {
        const scoreA = a.reconnection.urgencyScore * a.reconnection.impactScore * a.reconnection.confidenceScore;
        const scoreB = b.reconnection.urgencyScore * b.reconnection.impactScore * b.reconnection.confidenceScore;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Analyze a specific contact for reconnection opportunity
   */
  private async analyzeReconnectionOpportunity(
    contact: any,
    accountId: string
  ): Promise<ReconnectionOpportunity | null> {
    
    const daysSinceLastContact = this.calculateDaysSinceLastContact(contact.lastContactDate);
    
    // Skip if contacted too recently or too long ago
    if (daysSinceLastContact < 30 || daysSinceLastContact > 730) {
      return null;
    }

    const outreachAnalysis = this.analyzeOutreachHistory(contact.outreach || []);
    const timingAnalysis = this.analyzeOptimalTiming(contact, daysSinceLastContact);
    const impactAnalysis = this.calculateReconnectionImpact(contact, daysSinceLastContact);
    const effortAnalysis = this.calculateReconnectionEffort(contact, outreachAnalysis);
    const urgencyAnalysis = this.calculateReconnectionUrgency(contact, daysSinceLastContact);
    
    const confidenceScore = this.calculateReconnectionConfidence({
      contact,
      outreachAnalysis,
      timingAnalysis,
      impactAnalysis,
      daysSinceLastContact
    });

    const approach = this.suggestReconnectionApproach(contact, outreachAnalysis, daysSinceLastContact);
    
    return {
      contact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        relationshipType: contact.relationshipType,
        lastContactDate: contact.lastContactDate,
        daysSinceLastContact,
        connectionDate: contact.connectionDate,
        totalOutreachCount: outreachAnalysis.totalCount,
        responseRate: outreachAnalysis.responseRate
      },
      reconnection: {
        confidenceScore,
        impactScore: impactAnalysis.score,
        effortScore: effortAnalysis.score,
        urgencyScore: urgencyAnalysis.score,
        optimalTiming: timingAnalysis.optimalDate,
        reasoningFactors: this.generateReconnectionReasoning(
          contact,
          daysSinceLastContact,
          outreachAnalysis,
          impactAnalysis,
          urgencyAnalysis
        ),
        suggestedApproach: approach,
        suggestedMessage: this.generateReconnectionMessage(contact, approach, daysSinceLastContact),
        category: 'RECONNECTION',
        type: 'RECONNECT',
        priority: this.determineReconnectionPriority(confidenceScore, impactAnalysis.score, urgencyAnalysis.score)
      }
    };
  }

  /**
   * Calculate days since last contact
   */
  private calculateDaysSinceLastContact(lastContactDate: Date | null): number {
    if (!lastContactDate) return 9999;
    return Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Analyze outreach history patterns
   */
  private analyzeOutreachHistory(outreach: any[]): {
    totalCount: number;
    responseRate: number;
    avgResponseTime: number;
    lastResponseDate?: Date;
    preferredChannel: string;
    engagementScore: number;
  } {
    if (outreach.length === 0) {
      return {
        totalCount: 0,
        responseRate: 0,
        avgResponseTime: 0,
        preferredChannel: 'EMAIL',
        engagementScore: 0
      };
    }

    const responses = outreach.filter(o => o.status === 'RESPONDED');
    const responseRate = (responses.length / outreach.length) * 100;
    
    // Calculate average response time
    const responseTimes = responses
      .filter(r => r.sentAt && r.respondedAt)
      .map(r => (r.respondedAt.getTime() - r.sentAt.getTime()) / (1000 * 60 * 60 * 24));
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Find preferred channel
    const channelCounts = outreach.reduce((acc, o) => {
      acc[o.type] = (acc[o.type] || 0) + 1;
      return acc;
    }, {});
    const preferredChannel = Object.keys(channelCounts)
      .reduce((a, b) => channelCounts[a] > channelCounts[b] ? a : b, 'EMAIL');

    // Calculate engagement score based on response rate and consistency
    const engagementScore = Math.min(100, responseRate + (responses.length > 0 ? 20 : 0));

    return {
      totalCount: outreach.length,
      responseRate,
      avgResponseTime,
      lastResponseDate: responses.length > 0 ? responses[0].respondedAt : undefined,
      preferredChannel,
      engagementScore
    };
  }

  /**
   * Analyze optimal timing for reconnection
   */
  private analyzeOptimalTiming(contact: any, daysSinceLastContact: number): {
    optimalDate: Date;
    reasoning: string;
  } {
    const now = new Date();
    let optimalDate = new Date(now);
    
    // Default to immediate contact for most cases
    const reasons: string[] = [];

    // Sweet spot timing based on relationship type and history
    if (daysSinceLastContact >= 90 && daysSinceLastContact <= 180) {
      reasons.push('Optimal reconnection window (3-6 months)');
    } else if (daysSinceLastContact > 180 && daysSinceLastContact <= 365) {
      reasons.push('Good timing for annual catch-up');
    } else if (daysSinceLastContact > 365) {
      reasons.push('Long overdue reconnection');
    }

    // Consider industry events, holidays, etc.
    // This could be enhanced with calendar integration
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // If it's weekend, suggest Monday
      optimalDate.setDate(now.getDate() + (8 - dayOfWeek));
      reasons.push('Scheduled for weekday contact');
    }

    // Avoid end of quarter if in business setting
    const month = now.getMonth();
    if ([2, 5, 8, 11].includes(month)) {
      const daysUntilNextMonth = new Date(now.getFullYear(), month + 1, 1).getTime() - now.getTime();
      if (daysUntilNextMonth < 7 * 24 * 60 * 60 * 1000) {
        optimalDate.setMonth(month + 1, 5); // First week of next month
        reasons.push('Avoiding end-of-quarter timing');
      }
    }

    return {
      optimalDate,
      reasoning: reasons.join(', ') || 'Standard timing'
    };
  }

  /**
   * Calculate potential impact of reconnection
   */
  private calculateReconnectionImpact(contact: any, daysSinceLastContact: number): {
    score: number;
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    // Base score from contact's strategic value
    if (contact.strategicValue) {
      score += contact.strategicValue * 0.5;
      if (contact.strategicValue > 70) factors.push('High strategic value contact');
    }

    // Priority score contribution
    if (contact.priorityScore) {
      score += contact.priorityScore * 0.3;
      if (contact.priorityScore > 80) factors.push('High priority contact');
    }

    // Relationship type bonus
    const relationshipBonus = this.getRelationshipReconnectionValue(contact.relationshipType);
    score += relationshipBonus;
    if (relationshipBonus > 15) factors.push('Valuable relationship type');

    // Time since contact factor (sweet spot around 3-6 months)
    let timingBonus = 0;
    if (daysSinceLastContact >= 90 && daysSinceLastContact <= 180) {
      timingBonus = 20;
      factors.push('Optimal reconnection timing');
    } else if (daysSinceLastContact <= 365) {
      timingBonus = 10;
    }
    score += timingBonus;

    // Network position bonus
    if (contact.networkAnalytics?.influenceScore > 0.7) {
      score += 15;
      factors.push('High network influence');
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      factors
    };
  }

  /**
   * Calculate effort required for reconnection
   */
  private calculateReconnectionEffort(contact: any, outreachAnalysis: any): {
    score: number;
    factors: string[];
  } {
    let effort = 50; // Base effort
    const factors: string[] = [];

    // Response history reduces effort
    if (outreachAnalysis.responseRate > 50) {
      effort -= 20;
      factors.push('Good response history');
    } else if (outreachAnalysis.responseRate > 20) {
      effort -= 10;
      factors.push('Some response history');
    } else if (outreachAnalysis.totalCount > 5 && outreachAnalysis.responseRate === 0) {
      effort += 20;
      factors.push('No previous responses');
    }

    // Relationship type affects effort
    const relationshipEffort = this.getRelationshipEffortScore(contact.relationshipType);
    effort += relationshipEffort;

    // Quick response time is good indicator
    if (outreachAnalysis.avgResponseTime < 2 && outreachAnalysis.avgResponseTime > 0) {
      effort -= 10;
      factors.push('Fast responder');
    }

    return {
      score: Math.max(10, Math.min(100, effort)),
      factors
    };
  }

  /**
   * Calculate urgency of reconnection
   */
  private calculateReconnectionUrgency(contact: any, daysSinceLastContact: number): {
    score: number;
    factors: string[];
  } {
    let urgency = 0;
    const factors: string[] = [];

    // Time-based urgency
    if (daysSinceLastContact > 365) {
      urgency += 40;
      factors.push('Over 1 year since contact');
    } else if (daysSinceLastContact > 180) {
      urgency += 30;
      factors.push('Over 6 months since contact');
    } else if (daysSinceLastContact > 90) {
      urgency += 20;
      factors.push('Over 3 months since contact');
    }

    // Opportunity score adds urgency
    if (contact.opportunityScore > 80) {
      urgency += 25;
      factors.push('High opportunity score');
    } else if (contact.opportunityScore > 60) {
      urgency += 15;
    }

    // Strategic value adds urgency
    if (contact.strategicValue > 80) {
      urgency += 20;
      factors.push('High strategic value');
    }

    // Recent job changes or company updates increase urgency
    const recentUpdate = contact.updatedAt && 
      (Date.now() - contact.updatedAt.getTime()) < (60 * 24 * 60 * 60 * 1000); // 60 days
    if (recentUpdate) {
      urgency += 15;
      factors.push('Recent profile updates');
    }

    return {
      score: Math.min(100, urgency),
      factors
    };
  }

  /**
   * Calculate overall confidence in reconnection success
   */
  private calculateReconnectionConfidence(factors: {
    contact: any;
    outreachAnalysis: any;
    timingAnalysis: any;
    impactAnalysis: any;
    daysSinceLastContact: number;
  }): number {
    let confidence = 0.3; // Base confidence

    // Response rate is key indicator
    if (factors.outreachAnalysis.responseRate > 50) {
      confidence += 0.4;
    } else if (factors.outreachAnalysis.responseRate > 20) {
      confidence += 0.2;
    } else if (factors.outreachAnalysis.totalCount === 0) {
      confidence += 0.1; // No history is neutral
    }

    // Relationship strength
    const relationshipStrength = this.getRelationshipStrength(factors.contact.relationshipType);
    confidence += relationshipStrength * 0.3;

    // Timing factor
    if (factors.daysSinceLastContact >= 90 && factors.daysSinceLastContact <= 365) {
      confidence += 0.2;
    } else if (factors.daysSinceLastContact <= 90) {
      confidence -= 0.1; // Too soon
    }

    // Strategic value factor
    if (factors.contact.strategicValue > 70) {
      confidence += 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Suggest approach for reconnection
   */
  private suggestReconnectionApproach(
    contact: any, 
    outreachAnalysis: any, 
    daysSinceLastContact: number
  ): ReconnectionApproach {
    
    let method: 'EMAIL' | 'LINKEDIN' | 'PHONE' | 'MEETING' = 'EMAIL';
    let tone: 'CASUAL' | 'PROFESSIONAL' | 'PERSONAL' = 'PROFESSIONAL';
    let context = '';
    let reason = '';

    // Choose method based on previous preferences and relationship
    if (outreachAnalysis.preferredChannel === 'LINKEDIN') {
      method = 'LINKEDIN';
    } else if (contact.relationshipType === 'FRIEND') {
      method = 'PHONE';
      tone = 'PERSONAL';
    } else if (contact.relationshipType === 'COLLEAGUE' && daysSinceLastContact < 180) {
      tone = 'CASUAL';
    }

    // Determine context and reason
    if (daysSinceLastContact > 365) {
      context = 'Long-term reconnection';
      reason = 'Annual catch-up and relationship maintenance';
    } else if (daysSinceLastContact > 180) {
      context = 'Periodic check-in';
      reason = 'Quarterly relationship maintenance';
    } else {
      context = 'Timely follow-up';
      reason = 'Natural conversation continuation';
    }

    // Industry or role-specific context
    if (contact.position?.toLowerCase().includes('sales')) {
      context += ' with business focus';
    } else if (contact.relationshipType === 'MENTOR' || contact.relationshipType === 'MENTEE') {
      context += ' with guidance/advice angle';
      tone = 'PERSONAL';
    }

    return { method, tone, context, reason };
  }

  /**
   * Generate personalized reconnection message
   */
  private generateReconnectionMessage(
    contact: any, 
    approach: ReconnectionApproach, 
    daysSinceLastContact: number
  ): string {
    const name = contact.firstName;
    const timeframe = daysSinceLastContact > 365 ? 'over a year' : 
                     daysSinceLastContact > 180 ? 'several months' : 'a while';

    let message = '';

    if (approach.tone === 'PERSONAL') {
      message = `Hi ${name}, I was thinking about you and realized it's been ${timeframe} since we last connected. `;
    } else if (approach.tone === 'CASUAL') {
      message = `Hi ${name}, Hope you're doing well! It's been ${timeframe} since we last caught up. `;
    } else {
      message = `Dear ${name}, I hope this message finds you well. It's been ${timeframe} since our last conversation. `;
    }

    // Add context-specific content
    if (contact.company) {
      message += `I'd love to hear how things are going at ${contact.company} `;
    }

    if (contact.relationshipType === 'MENTOR') {
      message += `and would appreciate any insights you might have on my current projects. `;
    } else if (contact.relationshipType === 'MENTEE') {
      message += `and see how I might be able to support your current initiatives. `;
    } else {
      message += `and explore opportunities for collaboration. `;
    }

    // Closing
    if (approach.method === 'EMAIL') {
      message += `Would you be open to a brief call or coffee in the coming weeks?`;
    } else if (approach.method === 'LINKEDIN') {
      message += `Would love to reconnect and hear about your latest projects.`;
    } else {
      message += `Let me know if you'd like to catch up soon.`;
    }

    return message;
  }

  /**
   * Generate reasoning factors for the reconnection
   */
  private generateReconnectionReasoning(
    contact: any,
    daysSinceLastContact: number,
    outreachAnalysis: any,
    impactAnalysis: any,
    urgencyAnalysis: any
  ): string[] {
    const factors: string[] = [];

    factors.push(`${daysSinceLastContact} days since last contact`);
    
    if (outreachAnalysis.responseRate > 0) {
      factors.push(`${Math.round(outreachAnalysis.responseRate)}% historical response rate`);
    }

    factors.push(...impactAnalysis.factors);
    factors.push(...urgencyAnalysis.factors);

    if (contact.relationshipType) {
      factors.push(`${contact.relationshipType.toLowerCase().replace('_', ' ')} relationship`);
    }

    return factors.slice(0, 5); // Top 5 factors
  }

  /**
   * Helper methods
   */
  private getRelationshipReconnectionValue(relationshipType?: RelationshipType): number {
    const values = {
      'CLIENT': 25,
      'PARTNER': 25,
      'COLLEAGUE': 20,
      'MENTOR': 30,
      'INVESTOR': 25,
      'FRIEND': 20,
      'ACQUAINTANCE': 10,
      'PROSPECT': 15,
      'VENDOR': 10,
      'MENTEE': 20,
      'COMPETITOR': 5,
      'FAMILY': 15
    };
    return values[relationshipType as keyof typeof values] || 10;
  }

  private getRelationshipEffortScore(relationshipType?: RelationshipType): number {
    const efforts = {
      'CLIENT': -10,
      'PARTNER': -10,
      'COLLEAGUE': -15,
      'MENTOR': -20,
      'INVESTOR': 5,
      'FRIEND': -20,
      'ACQUAINTANCE': 10,
      'PROSPECT': 15,
      'VENDOR': 0,
      'MENTEE': -10,
      'COMPETITOR': 20,
      'FAMILY': -25
    };
    return efforts[relationshipType as keyof typeof efforts] || 0;
  }

  private getRelationshipStrength(relationshipType?: RelationshipType): number {
    const strengths = {
      'CLIENT': 0.8,
      'PARTNER': 0.8,
      'COLLEAGUE': 0.7,
      'MENTOR': 0.9,
      'INVESTOR': 0.7,
      'FRIEND': 0.9,
      'ACQUAINTANCE': 0.4,
      'PROSPECT': 0.3,
      'VENDOR': 0.5,
      'MENTEE': 0.8,
      'COMPETITOR': 0.2,
      'FAMILY': 1.0
    };
    return strengths[relationshipType as keyof typeof strengths] || 0.5;
  }

  private determineReconnectionPriority(
    confidence: number, 
    impact: number, 
    urgency: number
  ): OpportunityPriority {
    const score = (confidence * impact * urgency) / 100;
    
    if (score > 60 || urgency > 80) return 'HIGH';
    if (score > 30 || urgency > 60) return 'MEDIUM';
    return 'LOW';
  }
}

export const reconnectionEngine = new ReconnectionTimingEngine();