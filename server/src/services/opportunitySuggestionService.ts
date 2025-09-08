import { PrismaClient } from '@prisma/client';
import { OpportunityCategory, OpportunityType, OpportunityPriority, OpportunityStatus } from '@prisma/client';
import { introductionEngine, IntroductionOpportunity } from './introductionEngine';
import { reconnectionEngine, ReconnectionOpportunity } from './reconnectionEngine';
import { networkGapAnalysis, NetworkAnalysisResult } from './networkGapAnalysis';
import { businessOpportunityMatcher, BusinessOpportunity } from './businessOpportunityMatcher';

const prisma = new PrismaClient();

export interface UnifiedOpportunitySuggestion {
  id?: string;
  title: string;
  description: string;
  category: OpportunityCategory;
  type: OpportunityType;
  priority: OpportunityPriority;
  
  // Scoring and confidence
  confidenceScore: number; // 0-1
  impactScore: number; // 0-100
  effortScore: number; // 0-100
  urgencyScore: number; // 0-100
  
  // Timing
  suggestedAt: Date;
  bestTiming?: Date;
  expiresAt?: Date;
  
  // AI reasoning and data
  aiReasoning: {
    summary: string;
    keyFactors: string[];
    evidencePoints: string[];
    riskFactors?: string[];
    successIndicators: string[];
  };
  
  // Related contacts
  primaryContact?: {
    id: string;
    name: string;
    company?: string;
    position?: string;
  };
  secondaryContact?: {
    id: string;
    name: string;
    company?: string;
    position?: string;
  };
  relatedContacts?: Array<{
    id: string;
    name: string;
    role: string;
    importance: number;
  }>;
  
  // Actionable suggestions
  suggestedActions: OpportunityAction[];
  
  // Metadata
  sourceEngine: 'introduction' | 'reconnection' | 'business_match' | 'network_gap';
  metadata: any;
}

export interface OpportunityAction {
  action: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  effort: number; // 1-10
  timeline: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  requirements: string[];
  estimatedOutcome?: string;
}

export interface OpportunityDashboard {
  summary: {
    totalOpportunities: number;
    highPriorityCount: number;
    urgentCount: number;
    completedThisMonth: number;
    averageConfidenceScore: number;
  };
  categories: {
    introductions: number;
    reconnections: number;
    businessMatches: number;
    networkGaps: number;
    strategicMoves: number;
  };
  trends: {
    newThisWeek: number;
    trendDirection: 'up' | 'down' | 'stable';
    successRate: number;
  };
  topOpportunities: UnifiedOpportunitySuggestion[];
  networkHealth: {
    overallScore: number;
    diversityScore: number;
    activityScore: number;
    influenceScore: number;
  };
}

export interface OpportunityFilters {
  categories?: OpportunityCategory[];
  types?: OpportunityType[];
  priorities?: OpportunityPriority[];
  minConfidence?: number;
  minImpact?: number;
  timeHorizon?: 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'any';
  contactIds?: string[];
  status?: OpportunityStatus[];
  limit?: number;
  sortBy?: 'confidence' | 'impact' | 'urgency' | 'composite' | 'date';
}

export class OpportunitySuggestionService {

  /**
   * Generate comprehensive opportunity suggestions for an account
   */
  async generateOpportunitySuggestions(
    accountId: string, 
    filters: OpportunityFilters = {}
  ): Promise<UnifiedOpportunitySuggestion[]> {
    
    // Run all opportunity detection engines in parallel
    const [
      introductionOpportunities,
      reconnectionOpportunities,
      businessOpportunities,
      networkAnalysis
    ] = await Promise.all([
      this.getIntroductionOpportunities(accountId),
      this.getReconnectionOpportunities(accountId),
      this.getBusinessOpportunities(accountId),
      this.getNetworkGapOpportunities(accountId)
    ]);

    // Convert all opportunities to unified format
    const unifiedOpportunities: UnifiedOpportunitySuggestion[] = [
      ...this.convertIntroductionOpportunities(introductionOpportunities),
      ...this.convertReconnectionOpportunities(reconnectionOpportunities),
      ...this.convertBusinessOpportunities(businessOpportunities),
      ...this.convertNetworkGapOpportunities(networkAnalysis.gaps)
    ];

    // Apply filters
    const filteredOpportunities = this.applyFilters(unifiedOpportunities, filters);

    // Sort by composite score or specified criteria
    const sortedOpportunities = this.sortOpportunities(filteredOpportunities, filters.sortBy || 'composite');

    // Limit results
    const limit = filters.limit || 50;
    const limitedOpportunities = sortedOpportunities.slice(0, limit);

    // Save to database for tracking
    await this.saveOpportunitiesToDatabase(accountId, limitedOpportunities);

    return limitedOpportunities;
  }

  /**
   * Get opportunity dashboard data
   */
  async getOpportunityDashboard(accountId: string): Promise<OpportunityDashboard> {
    // Get recent opportunities from database
    const recentOpportunities = await prisma.opportunitySuggestion.findMany({
      where: {
        accountId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      include: {
        primaryContact: {
          select: { id: true, firstName: true, lastName: true, company: true, position: true }
        },
        secondaryContact: {
          select: { id: true, firstName: true, lastName: true, company: true, position: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get network analysis for health metrics
    const networkAnalysis = await networkGapAnalysis.analyzeNetworkGaps(accountId);

    // Calculate summary statistics
    const summary = {
      totalOpportunities: recentOpportunities.length,
      highPriorityCount: recentOpportunities.filter(op => op.priority === 'HIGH' || op.priority === 'URGENT').length,
      urgentCount: recentOpportunities.filter(op => op.priority === 'URGENT').length,
      completedThisMonth: recentOpportunities.filter(op => op.status === 'COMPLETED').length,
      averageConfidenceScore: this.calculateAverageConfidence(recentOpportunities)
    };

    // Categorize opportunities
    const categories = {
      introductions: recentOpportunities.filter(op => op.category === 'INTRODUCTION').length,
      reconnections: recentOpportunities.filter(op => op.category === 'RECONNECTION').length,
      businessMatches: recentOpportunities.filter(op => op.category === 'BUSINESS_MATCH').length,
      networkGaps: recentOpportunities.filter(op => op.category === 'NETWORK_EXPANSION').length,
      strategicMoves: recentOpportunities.filter(op => op.category === 'STRATEGIC_MOVE').length
    };

    // Calculate trends
    const lastWeekOpportunities = recentOpportunities.filter(op => 
      op.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const trends = {
      newThisWeek: lastWeekOpportunities.length,
      trendDirection: this.calculateTrendDirection(recentOpportunities),
      successRate: this.calculateSuccessRate(recentOpportunities)
    };

    // Get top opportunities
    const topOpportunities = await this.generateOpportunitySuggestions(accountId, { 
      limit: 10, 
      sortBy: 'composite' 
    });

    return {
      summary,
      categories,
      trends,
      topOpportunities,
      networkHealth: {
        overallScore: networkAnalysis.overallScore,
        diversityScore: Math.round(networkAnalysis.networkHealth.diversity * 100),
        activityScore: Math.round(networkAnalysis.networkHealth.activity * 100),
        influenceScore: Math.round(networkAnalysis.networkHealth.influence * 100)
      }
    };
  }

  /**
   * Update opportunity status and track actions
   */
  async updateOpportunityStatus(
    opportunityId: string,
    status: OpportunityStatus,
    actionType?: string,
    actionData?: any,
    notes?: string,
    userId?: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update opportunity status
      await tx.opportunitySuggestion.update({
        where: { id: opportunityId },
        data: {
          status,
          actedBy: userId,
          actedAt: status !== 'PENDING' ? new Date() : undefined,
          updatedAt: new Date()
        }
      });

      // Record action if provided
      if (actionType && userId) {
        await tx.opportunityAction.create({
          data: {
            opportunityId,
            actionType: actionType as any,
            actionData,
            notes,
            takenBy: userId
          }
        });
      }
    });
  }

  /**
   * Get opportunity analytics and performance metrics
   */
  async getOpportunityAnalytics(accountId: string, timeRange: number = 90): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    const opportunities = await prisma.opportunitySuggestion.findMany({
      where: {
        accountId,
        createdAt: { gte: startDate }
      },
      include: {
        actions: true
      }
    });

    return {
      totalGenerated: opportunities.length,
      byCategory: this.groupByCategory(opportunities),
      byStatus: this.groupByStatus(opportunities),
      conversionRates: this.calculateConversionRates(opportunities),
      averageTimeToAction: this.calculateAverageTimeToAction(opportunities),
      topPerformingTypes: this.getTopPerformingTypes(opportunities),
      userEngagement: this.calculateUserEngagement(opportunities)
    };
  }

  /**
   * Get individual opportunity engines results
   */
  private async getIntroductionOpportunities(accountId: string): Promise<IntroductionOpportunity[]> {
    try {
      return await introductionEngine.detectIntroductionOpportunities(accountId, 20);
    } catch (error) {
      console.error('Error getting introduction opportunities:', error);
      return [];
    }
  }

  private async getReconnectionOpportunities(accountId: string): Promise<ReconnectionOpportunity[]> {
    try {
      return await reconnectionEngine.detectReconnectionOpportunities(accountId, {}, 20);
    } catch (error) {
      console.error('Error getting reconnection opportunities:', error);
      return [];
    }
  }

  private async getBusinessOpportunities(accountId: string): Promise<BusinessOpportunity[]> {
    try {
      return await businessOpportunityMatcher.findBusinessOpportunities(accountId, {}, 20);
    } catch (error) {
      console.error('Error getting business opportunities:', error);
      return [];
    }
  }

  private async getNetworkGapOpportunities(accountId: string): Promise<NetworkAnalysisResult> {
    try {
      return await networkGapAnalysis.analyzeNetworkGaps(accountId);
    } catch (error) {
      console.error('Error getting network gap opportunities:', error);
      return {
        overallScore: 0,
        totalGaps: 0,
        criticalGaps: 0,
        networkHealth: { diversity: 0, reach: 0, influence: 0, activity: 0 },
        gaps: [],
        recommendations: []
      };
    }
  }

  /**
   * Convert opportunities from different engines to unified format
   */
  private convertIntroductionOpportunities(opportunities: IntroductionOpportunity[]): UnifiedOpportunitySuggestion[] {
    return opportunities.map(opp => ({
      title: `Introduction: Connect ${opp.targetContact.name} with ${opp.mutualContact.name}`,
      description: `Facilitate introduction between ${opp.targetContact.name} (${opp.targetContact.company}) and ${opp.mutualContact.name} (${opp.mutualContact.company}) through ${opp.introducerContact.name}`,
      category: opp.opportunity.category,
      type: opp.opportunity.type,
      priority: opp.opportunity.priority,
      confidenceScore: opp.opportunity.confidenceScore,
      impactScore: opp.opportunity.impactScore,
      effortScore: opp.opportunity.effortScore,
      urgencyScore: 70, // Default urgency for introductions
      suggestedAt: new Date(),
      bestTiming: opp.opportunity.bestTiming,
      aiReasoning: {
        summary: opp.opportunity.reasoning,
        keyFactors: opp.opportunity.evidenceFactors,
        evidenceFactors: opp.opportunity.evidenceFactors,
        successIndicators: ['Mutual interest expressed', 'Follow-up meeting scheduled', 'Ongoing relationship developed']
      },
      primaryContact: {
        id: opp.targetContact.id,
        name: opp.targetContact.name,
        company: opp.targetContact.company,
        position: opp.targetContact.position
      },
      secondaryContact: {
        id: opp.mutualContact.id,
        name: opp.mutualContact.name,
        company: opp.mutualContact.company,
        position: opp.mutualContact.position
      },
      relatedContacts: [{
        id: opp.introducerContact.id,
        name: opp.introducerContact.name,
        role: 'Introducer',
        importance: 1.0
      }],
      suggestedActions: [{
        action: 'Request introduction',
        description: `Ask ${opp.introducerContact.name} to introduce you to both parties`,
        priority: 'HIGH',
        effort: 3,
        timeline: 'immediate',
        requirements: ['Context for introduction', 'Value proposition prepared'],
        estimatedOutcome: 'Successful introduction leading to mutual connection'
      }],
      sourceEngine: 'introduction',
      metadata: { originalData: opp }
    }));
  }

  private convertReconnectionOpportunities(opportunities: ReconnectionOpportunity[]): UnifiedOpportunitySuggestion[] {
    return opportunities.map(opp => ({
      title: `Reconnect with ${opp.contact.name}`,
      description: `Reestablish connection with ${opp.contact.name} at ${opp.contact.company}. Last contact: ${opp.contact.daysSinceLastContact} days ago.`,
      category: opp.reconnection.category,
      type: opp.reconnection.type,
      priority: opp.reconnection.priority,
      confidenceScore: opp.reconnection.confidenceScore,
      impactScore: opp.reconnection.impactScore,
      effortScore: opp.reconnection.effortScore,
      urgencyScore: opp.reconnection.urgencyScore,
      suggestedAt: new Date(),
      bestTiming: opp.reconnection.optimalTiming,
      aiReasoning: {
        summary: opp.reconnection.reasoningFactors.join('; '),
        keyFactors: opp.reconnection.reasoningFactors,
        evidenceFactors: opp.reconnection.reasoningFactors,
        successIndicators: ['Response received', 'Meeting scheduled', 'Ongoing conversation reestablished']
      },
      primaryContact: {
        id: opp.contact.id,
        name: opp.contact.name,
        company: opp.contact.company,
        position: opp.contact.position
      },
      suggestedActions: [{
        action: `Send ${opp.reconnection.suggestedApproach.method.toLowerCase()} message`,
        description: `${opp.reconnection.suggestedApproach.context}: ${opp.reconnection.suggestedMessage}`,
        priority: opp.reconnection.urgencyScore > 70 ? 'HIGH' : 'MEDIUM',
        effort: Math.round(opp.reconnection.effortScore / 20),
        timeline: opp.reconnection.urgencyScore > 80 ? 'immediate' : 'short_term',
        requirements: ['Personalized message prepared', 'Context for outreach'],
        estimatedOutcome: 'Renewed connection and ongoing relationship'
      }],
      sourceEngine: 'reconnection',
      metadata: { originalData: opp }
    }));
  }

  private convertBusinessOpportunities(opportunities: BusinessOpportunity[]): UnifiedOpportunitySuggestion[] {
    return opportunities.map(opp => ({
      title: `${opp.opportunity.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}: ${opp.contact.name}`,
      description: `${opp.opportunity.reasoning}`,
      category: opp.opportunity.category,
      type: opp.opportunity.type as OpportunityType,
      priority: this.convertBusinessPriorityToOpportunityPriority(opp.opportunity.impactScore, opp.opportunity.confidenceScore),
      confidenceScore: opp.opportunity.confidenceScore,
      impactScore: opp.opportunity.impactScore,
      effortScore: opp.opportunity.effortScore,
      urgencyScore: opp.opportunity.timelineScore,
      suggestedAt: new Date(),
      bestTiming: opp.opportunity.timing.bestApproach,
      expiresAt: opp.opportunity.timing.deadline,
      aiReasoning: {
        summary: opp.opportunity.reasoning,
        keyFactors: opp.opportunity.evidenceFactors,
        evidenceFactors: opp.opportunity.evidenceFactors,
        successIndicators: ['Initial interest expressed', 'Follow-up meeting scheduled', 'Deal/collaboration initiated']
      },
      primaryContact: {
        id: opp.contact.id,
        name: opp.contact.name,
        company: opp.contact.company,
        position: opp.contact.position
      },
      suggestedActions: opp.opportunity.suggestedActions.map(action => ({
        action: action.action,
        description: action.description,
        priority: action.priority,
        effort: action.effort,
        timeline: action.timeline,
        requirements: action.requirements,
        estimatedOutcome: 'Business opportunity advancement'
      })),
      sourceEngine: 'business_match',
      metadata: { originalData: opp }
    }));
  }

  private convertNetworkGapOpportunities(gaps: any[]): UnifiedOpportunitySuggestion[] {
    return gaps.slice(0, 5).map(gap => ({ // Top 5 gaps only
      title: `Address ${gap.title}`,
      description: gap.description,
      category: 'NETWORK_EXPANSION' as OpportunityCategory,
      type: 'COLD_OUTREACH' as OpportunityType,
      priority: gap.importance > 0.8 ? 'HIGH' : (gap.importance > 0.6 ? 'MEDIUM' : 'LOW'),
      confidenceScore: gap.currentCoverage < 0.3 ? 0.8 : 0.6,
      impactScore: Math.round(gap.importance * 100),
      effortScore: 70, // Network expansion generally requires significant effort
      urgencyScore: gap.importance > 0.7 ? 80 : 50,
      suggestedAt: new Date(),
      aiReasoning: {
        summary: `Network gap identified: ${gap.description}`,
        keyFactors: gap.suggestions?.[0]?.actionableSteps || [],
        evidenceFactors: [`Current coverage: ${Math.round(gap.currentCoverage * 100)}%`, `Gap size: ${gap.analysisData.gapSize}`],
        successIndicators: ['New connections made', 'Gap coverage improved', 'Network diversity increased']
      },
      suggestedActions: gap.suggestions?.map((suggestion: any) => ({
        action: suggestion.title,
        description: suggestion.description,
        priority: suggestion.potentialImpact > 7 ? 'HIGH' : 'MEDIUM',
        effort: suggestion.estimatedEffort,
        timeline: suggestion.estimatedEffort > 7 ? 'long_term' : 'medium_term',
        requirements: suggestion.actionableSteps,
        estimatedOutcome: 'Improved network coverage and diversity'
      })) || [],
      sourceEngine: 'network_gap',
      metadata: { originalData: gap }
    }));
  }

  private convertBusinessPriorityToOpportunityPriority(impact: number, confidence: number): OpportunityPriority {
    const score = impact * confidence;
    if (score > 80) return 'URGENT';
    if (score > 60) return 'HIGH';
    if (score > 40) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Apply filters to opportunities
   */
  private applyFilters(opportunities: UnifiedOpportunitySuggestion[], filters: OpportunityFilters): UnifiedOpportunitySuggestion[] {
    return opportunities.filter(opp => {
      if (filters.categories && !filters.categories.includes(opp.category)) return false;
      if (filters.types && !filters.types.includes(opp.type)) return false;
      if (filters.priorities && !filters.priorities.includes(opp.priority)) return false;
      if (filters.minConfidence && opp.confidenceScore < filters.minConfidence) return false;
      if (filters.minImpact && opp.impactScore < filters.minImpact) return false;
      if (filters.contactIds && opp.primaryContact && !filters.contactIds.includes(opp.primaryContact.id)) return false;
      
      return true;
    });
  }

  /**
   * Sort opportunities by specified criteria
   */
  private sortOpportunities(opportunities: UnifiedOpportunitySuggestion[], sortBy: string): UnifiedOpportunitySuggestion[] {
    return opportunities.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidenceScore - a.confidenceScore;
        case 'impact':
          return b.impactScore - a.impactScore;
        case 'urgency':
          return b.urgencyScore - a.urgencyScore;
        case 'date':
          return b.suggestedAt.getTime() - a.suggestedAt.getTime();
        case 'composite':
        default:
          const scoreA = a.confidenceScore * a.impactScore * (a.urgencyScore / 100);
          const scoreB = b.confidenceScore * b.impactScore * (b.urgencyScore / 100);
          return scoreB - scoreA;
      }
    });
  }

  /**
   * Save opportunities to database for tracking
   */
  private async saveOpportunitiesToDatabase(accountId: string, opportunities: UnifiedOpportunitySuggestion[]): Promise<void> {
    for (const opp of opportunities) {
      try {
        // Check if similar opportunity already exists (avoid duplicates)
        const existing = await prisma.opportunitySuggestion.findFirst({
          where: {
            accountId,
            title: opp.title,
            category: opp.category,
            type: opp.type,
            status: { notIn: ['COMPLETED', 'DISMISSED'] },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Within last 7 days
          }
        });

        if (existing) continue; // Skip if similar opportunity exists

        await prisma.opportunitySuggestion.create({
          data: {
            title: opp.title,
            description: opp.description,
            category: opp.category,
            type: opp.type,
            priority: opp.priority,
            confidenceScore: opp.confidenceScore,
            impactScore: opp.impactScore,
            effortScore: opp.effortScore,
            bestTiming: opp.bestTiming,
            expiresAt: opp.expiresAt,
            aiReasoning: opp.aiReasoning,
            evidence: opp.aiReasoning.evidenceFactors,
            metadata: opp.metadata,
            accountId,
            primaryContactId: opp.primaryContact?.id,
            secondaryContactId: opp.secondaryContact?.id
          }
        });
      } catch (error) {
        console.error('Error saving opportunity to database:', error);
        // Continue with other opportunities
      }
    }
  }

  /**
   * Helper methods for analytics
   */
  private calculateAverageConfidence(opportunities: any[]): number {
    if (opportunities.length === 0) return 0;
    const sum = opportunities.reduce((acc, opp) => acc + opp.confidenceScore, 0);
    return Math.round((sum / opportunities.length) * 100) / 100;
  }

  private calculateTrendDirection(opportunities: any[]): 'up' | 'down' | 'stable' {
    const thisWeek = opportunities.filter(opp => 
      opp.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    
    const lastWeek = opportunities.filter(opp => 
      opp.createdAt >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
      opp.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    if (thisWeek > lastWeek * 1.1) return 'up';
    if (thisWeek < lastWeek * 0.9) return 'down';
    return 'stable';
  }

  private calculateSuccessRate(opportunities: any[]): number {
    const completed = opportunities.filter(opp => opp.status === 'COMPLETED').length;
    const total = opportunities.filter(opp => opp.status !== 'PENDING').length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  private groupByCategory(opportunities: any[]): any {
    return opportunities.reduce((acc, opp) => {
      acc[opp.category] = (acc[opp.category] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByStatus(opportunities: any[]): any {
    return opportunities.reduce((acc, opp) => {
      acc[opp.status] = (acc[opp.status] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateConversionRates(opportunities: any[]): any {
    const total = opportunities.length;
    const viewed = opportunities.filter(opp => ['VIEWED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(opp.status)).length;
    const accepted = opportunities.filter(opp => ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(opp.status)).length;
    const completed = opportunities.filter(opp => opp.status === 'COMPLETED').length;

    return {
      viewRate: total > 0 ? Math.round((viewed / total) * 100) : 0,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  private calculateAverageTimeToAction(opportunities: any[]): number {
    const actioned = opportunities.filter(opp => opp.actedAt && opp.suggestedAt);
    if (actioned.length === 0) return 0;
    
    const totalTime = actioned.reduce((sum, opp) => {
      return sum + (opp.actedAt.getTime() - opp.suggestedAt.getTime());
    }, 0);
    
    return Math.round(totalTime / actioned.length / (1000 * 60 * 60 * 24)); // Days
  }

  private getTopPerformingTypes(opportunities: any[]): any[] {
    const typePerformance = opportunities.reduce((acc, opp) => {
      if (!acc[opp.type]) {
        acc[opp.type] = { total: 0, completed: 0 };
      }
      acc[opp.type].total++;
      if (opp.status === 'COMPLETED') {
        acc[opp.type].completed++;
      }
      return acc;
    }, {});

    return Object.entries(typePerformance)
      .map(([type, stats]: [string, any]) => ({
        type,
        total: stats.total,
        completed: stats.completed,
        successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.successRate - a.successRate);
  }

  private calculateUserEngagement(opportunities: any[]): any {
    const totalOpportunities = opportunities.length;
    const engagedWith = opportunities.filter(opp => opp.status !== 'PENDING').length;
    
    return {
      engagementRate: totalOpportunities > 0 ? Math.round((engagedWith / totalOpportunities) * 100) : 0,
      averageEngagementTime: this.calculateAverageTimeToAction(opportunities)
    };
  }
}

export const opportunitySuggestionService = new OpportunitySuggestionService();