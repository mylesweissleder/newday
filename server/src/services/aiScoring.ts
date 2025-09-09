
import { RelationshipType, ContactTier } from '@prisma/client';

import prisma from "../utils/prisma";

interface ScoringFactors {
  networkPosition: {
    score: number;
    influenceScore: number;
    totalConnections: number;
    betweennessCentrality: number;
    reasoning: string;
  };
  relationshipStrength: {
    score: number;
    lastContactRecency: number; // days since last contact
    relationshipType: RelationshipType | null;
    contactFrequency: number;
    reasoning: string;
  };
  professionalRelevance: {
    score: number;
    industryAlignment: number;
    seniorityLevel: number;
    companySize: number;
    reasoning: string;
  };
  mutualConnections: {
    score: number;
    warmIntroPathLength: number;
    mutualConnectionsCount: number;
    sharedNetworkQuality: number;
    reasoning: string;
  };
  engagementPatterns: {
    score: number;
    responseRate: number;
    outreachHistory: number;
    campaignPerformance: number;
    reasoning: string;
  };
  opportunityIndicators: {
    score: number;
    recentJobChange: boolean;
    companyGrowth: boolean;
    industryTrends: number;
    roleExpansion: boolean;
    reasoning: string;
    flags: string[];
  };
}

interface ContactScoring {
  priorityScore: number;
  opportunityScore: number;
  strategicValue: number;
  scoringFactors: ScoringFactors;
  opportunityFlags: string[];
}

export class AIScoringService {
  
  /**
   * Calculate comprehensive AI scoring for a contact
   */
  async scoreContact(contactId: string, accountId: string, userGoals?: string[]): Promise<ContactScoring> {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, accountId },
      include: {
        networkAnalytics: true,
        relationships: {
          include: {
            relatedContact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                position: true,
                tier: true
              }
            }
          }
        },
        relatedTo: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                position: true,
                tier: true
              }
            }
          }
        },
        outreach: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        campaignContacts: {
          include: {
            campaign: {
              select: {
                status: true,
                totalSent: true,
                totalResponded: true
              }
            }
          }
        }
      }
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    const scoringFactors = await this.calculateScoringFactors(contact, userGoals);
    
    // Calculate composite scores
    const priorityScore = this.calculatePriorityScore(scoringFactors);
    const opportunityScore = this.calculateOpportunityScore(scoringFactors);
    const strategicValue = this.calculateStrategicValue(scoringFactors);
    
    // Extract opportunity flags
    const opportunityFlags = scoringFactors.opportunityIndicators.flags;

    return {
      priorityScore,
      opportunityScore,
      strategicValue,
      scoringFactors,
      opportunityFlags
    };
  }

  /**
   * Calculate detailed scoring factors
   */
  private async calculateScoringFactors(contact: any, userGoals?: string[]): Promise<ScoringFactors> {
    const networkPosition = await this.calculateNetworkPositionScore(contact);
    const relationshipStrength = await this.calculateRelationshipStrengthScore(contact);
    const professionalRelevance = await this.calculateProfessionalRelevanceScore(contact, userGoals);
    const mutualConnections = await this.calculateMutualConnectionsScore(contact);
    const engagementPatterns = await this.calculateEngagementPatternsScore(contact);
    const opportunityIndicators = await this.calculateOpportunityIndicatorsScore(contact);

    return {
      networkPosition,
      relationshipStrength,
      professionalRelevance,
      mutualConnections,
      engagementPatterns,
      opportunityIndicators
    };
  }

  /**
   * Network position and influence scoring
   */
  private async calculateNetworkPositionScore(contact: any): Promise<ScoringFactors['networkPosition']> {
    const analytics = contact.networkAnalytics;
    
    if (!analytics) {
      return {
        score: 20, // Default low score for contacts without network data
        influenceScore: 0,
        totalConnections: 0,
        betweennessCentrality: 0,
        reasoning: "No network analytics data available"
      };
    }

    // Score based on network metrics (0-100)
    const influenceScore = Math.min(100, analytics.influenceScore * 100);
    const connectionsScore = Math.min(100, Math.log10(analytics.totalConnections + 1) * 25);
    const centralityScore = Math.min(100, analytics.betweennessCentrality * 100);
    
    const score = (influenceScore * 0.4 + connectionsScore * 0.3 + centralityScore * 0.3);

    return {
      score: Math.round(score),
      influenceScore: analytics.influenceScore,
      totalConnections: analytics.totalConnections,
      betweennessCentrality: analytics.betweennessCentrality,
      reasoning: `Network influence: ${Math.round(influenceScore)}/100, Connections: ${analytics.totalConnections}, Centrality: ${Math.round(centralityScore)}/100`
    };
  }

  /**
   * Relationship strength and recency scoring
   */
  private async calculateRelationshipStrengthScore(contact: any): Promise<ScoringFactors['relationshipStrength']> {
    const lastContactDate = contact.lastContactDate;
    const connectionDate = contact.connectionDate;
    const relationshipType = contact.relationshipType;
    
    // Calculate recency score (0-100, higher = more recent)
    let lastContactRecency = 0;
    let daysSinceLastContact = 9999;
    if (lastContactDate) {
      daysSinceLastContact = Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
      lastContactRecency = Math.max(0, 100 - (daysSinceLastContact / 30) * 20); // Decay over months
    }

    // Calculate contact frequency from outreach history
    const outreachCount = contact.outreach?.length || 0;
    const daysSinceConnection = connectionDate 
      ? Math.floor((Date.now() - connectionDate.getTime()) / (1000 * 60 * 60 * 24))
      : 365; // Default to 1 year if no connection date

    const contactFrequency = daysSinceConnection > 0 ? (outreachCount / daysSinceConnection) * 30 : 0; // Contacts per month

    // Relationship type weighting
    const relationshipTypeScore = this.getRelationshipTypeScore(relationshipType);
    
    const score = Math.round(
      (lastContactRecency * 0.4) + 
      (Math.min(100, contactFrequency * 50) * 0.3) +
      (relationshipTypeScore * 0.3)
    );

    return {
      score,
      lastContactRecency: daysSinceLastContact || 9999,
      relationshipType,
      contactFrequency: Math.round(contactFrequency * 10) / 10,
      reasoning: `Last contact: ${daysSinceLastContact || 'Never'} days ago, Contact frequency: ${Math.round(contactFrequency * 10) / 10}/month, Relationship: ${relationshipType || 'Unknown'}`
    };
  }

  /**
   * Professional relevance and industry alignment
   */
  private async calculateProfessionalRelevanceScore(contact: any, userGoals?: string[]): Promise<ScoringFactors['professionalRelevance']> {
    const position = contact.position || '';
    const company = contact.company || '';
    const tier = contact.tier;

    // Industry alignment based on company and position keywords
    const industryAlignment = this.calculateIndustryAlignment(company, position, userGoals);
    
    // Seniority level based on position
    const seniorityLevel = this.calculateSeniorityLevel(position);
    
    // Company size estimation (this could be enhanced with external data)
    const companySize = this.estimateCompanySize(company);
    
    const score = Math.round(
      (industryAlignment * 0.4) +
      (seniorityLevel * 0.35) +
      (companySize * 0.25)
    );

    return {
      score,
      industryAlignment,
      seniorityLevel,
      companySize,
      reasoning: `Industry alignment: ${industryAlignment}/100, Seniority: ${seniorityLevel}/100, Company scale: ${companySize}/100`
    };
  }

  /**
   * Mutual connections and warm intro potential
   */
  private async calculateMutualConnectionsScore(contact: any): Promise<ScoringFactors['mutualConnections']> {
    const allRelationships = [...(contact.relationships || []), ...(contact.relatedTo || [])];
    const mutualConnectionsCount = allRelationships.length;
    
    // Calculate warm intro path quality
    const highValueConnections = allRelationships.filter(rel => {
      const relatedContact = rel.relatedContact || rel.contact;
      return relatedContact?.tier === 'TIER_1' || relatedContact?.tier === 'TIER_2';
    });

    const warmIntroPathLength = mutualConnectionsCount > 0 ? 1 : (mutualConnectionsCount > 5 ? 2 : 3);
    const sharedNetworkQuality = highValueConnections.length / Math.max(1, mutualConnectionsCount) * 100;
    
    const score = Math.min(100, 
      (Math.log10(mutualConnectionsCount + 1) * 40) + 
      (sharedNetworkQuality * 0.6)
    );

    return {
      score: Math.round(score),
      warmIntroPathLength,
      mutualConnectionsCount,
      sharedNetworkQuality: Math.round(sharedNetworkQuality),
      reasoning: `${mutualConnectionsCount} mutual connections, ${highValueConnections.length} high-value connections, intro path: ${warmIntroPathLength} step(s)`
    };
  }

  /**
   * Engagement patterns and responsiveness
   */
  private async calculateEngagementPatternsScore(contact: any): Promise<ScoringFactors['engagementPatterns']> {
    const outreachHistory = contact.outreach || [];
    const campaignContacts = contact.campaignContacts || [];
    
    // Calculate response rate
    const totalOutreach = outreachHistory.length;
    const responses = outreachHistory.filter((o: any) => o.status === 'RESPONDED').length;
    const responseRate = totalOutreach > 0 ? (responses / totalOutreach) * 100 : 0;
    
    // Outreach engagement (higher score for those we haven't over-contacted)
    const outreachScore = totalOutreach === 0 ? 100 : Math.max(0, 100 - (totalOutreach * 5));
    
    // Campaign performance
    let campaignPerformance = 50; // Default neutral score
    if (campaignContacts.length > 0) {
      const campaignResponses = campaignContacts.filter((cc: any) => 
        cc.status === 'RESPONDED' || cc.status === 'INTERESTED' || cc.status === 'CONVERTED'
      ).length;
      campaignPerformance = (campaignResponses / campaignContacts.length) * 100;
    }
    
    const score = Math.round(
      (responseRate * 0.4) + 
      (outreachScore * 0.3) + 
      (campaignPerformance * 0.3)
    );

    return {
      score,
      responseRate: Math.round(responseRate * 10) / 10,
      outreachHistory: totalOutreach,
      campaignPerformance: Math.round(campaignPerformance),
      reasoning: `Response rate: ${Math.round(responseRate)}%, Outreach count: ${totalOutreach}, Campaign performance: ${Math.round(campaignPerformance)}%`
    };
  }

  /**
   * Opportunity indicators and timing
   */
  private async calculateOpportunityIndicatorsScore(contact: any): Promise<ScoringFactors['opportunityIndicators']> {
    const flags: string[] = [];
    let score = 0;
    
    // Check for recent job changes (if last update was recent and position/company info exists)
    const recentUpdate = contact.updatedAt && 
      (Date.now() - contact.updatedAt.getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 days
    
    let recentJobChange = false;
    if (recentUpdate && (contact.position || contact.company)) {
      recentJobChange = true;
      flags.push('recent_job_change');
      score += 25;
    }

    // Industry growth indicators (simplified - could be enhanced with external data)
    const industryTrends = this.getIndustryTrendScore(contact.company);
    score += industryTrends * 0.3;

    // Role expansion potential (based on seniority and company size)
    const roleExpansion = this.hasRoleExpansionPotential(contact.position, contact.company);
    if (roleExpansion) {
      flags.push('role_expansion_potential');
      score += 20;
    }

    // Company growth signals
    const companyGrowth = this.hasCompanyGrowthSignals(contact.company);
    if (companyGrowth) {
      flags.push('company_growth');
      score += 15;
    }

    // No recent contact = opportunity for reconnection
    const daysSinceLastContact = contact.lastContactDate 
      ? Math.floor((Date.now() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
      : 9999;
    
    if (daysSinceLastContact > 90 && daysSinceLastContact < 365) {
      flags.push('reconnection_opportunity');
      score += 10;
    }

    return {
      score: Math.min(100, Math.round(score)),
      recentJobChange,
      companyGrowth,
      industryTrends,
      roleExpansion,
      reasoning: `Opportunity flags: ${flags.join(', ') || 'none'}`,
      flags
    };
  }

  /**
   * Calculate overall priority score
   */
  private calculatePriorityScore(factors: ScoringFactors): number {
    const weights = {
      networkPosition: 0.25,
      relationshipStrength: 0.25,
      professionalRelevance: 0.20,
      mutualConnections: 0.15,
      engagementPatterns: 0.10,
      opportunityIndicators: 0.05
    };

    return Math.round(
      factors.networkPosition.score * weights.networkPosition +
      factors.relationshipStrength.score * weights.relationshipStrength +
      factors.professionalRelevance.score * weights.professionalRelevance +
      factors.mutualConnections.score * weights.mutualConnections +
      factors.engagementPatterns.score * weights.engagementPatterns +
      factors.opportunityIndicators.score * weights.opportunityIndicators
    );
  }

  /**
   * Calculate opportunity likelihood score
   */
  private calculateOpportunityScore(factors: ScoringFactors): number {
    const weights = {
      opportunityIndicators: 0.35,
      relationshipStrength: 0.25,
      engagementPatterns: 0.20,
      professionalRelevance: 0.20
    };

    return Math.round(
      factors.opportunityIndicators.score * weights.opportunityIndicators +
      factors.relationshipStrength.score * weights.relationshipStrength +
      factors.engagementPatterns.score * weights.engagementPatterns +
      factors.professionalRelevance.score * weights.professionalRelevance
    );
  }

  /**
   * Calculate strategic networking value
   */
  private calculateStrategicValue(factors: ScoringFactors): number {
    const weights = {
      networkPosition: 0.4,
      mutualConnections: 0.25,
      professionalRelevance: 0.25,
      opportunityIndicators: 0.10
    };

    return Math.round(
      factors.networkPosition.score * weights.networkPosition +
      factors.mutualConnections.score * weights.mutualConnections +
      factors.professionalRelevance.score * weights.professionalRelevance +
      factors.opportunityIndicators.score * weights.opportunityIndicators
    );
  }

  /**
   * Helper methods for scoring calculations
   */
  private getRelationshipTypeScore(relationshipType: RelationshipType | null): number {
    const scores = {
      'CLIENT': 90,
      'PARTNER': 85,
      'COLLEAGUE': 75,
      'MENTOR': 95,
      'INVESTOR': 90,
      'FRIEND': 70,
      'ACQUAINTANCE': 60,
      'PROSPECT': 80,
      'VENDOR': 65,
      'MENTEE': 70,
      'COMPETITOR': 40,
      'FAMILY': 30
    };
    return scores[relationshipType as keyof typeof scores] || 50;
  }

  private calculateIndustryAlignment(company: string, position: string, userGoals?: string[]): number {
    // This is a simplified implementation - could be enhanced with ML/NLP
    const relevantKeywords = [
      'technology', 'software', 'ai', 'data', 'digital', 'startup', 'venture',
      'marketing', 'sales', 'business development', 'strategy', 'consulting'
    ];

    const text = `${company} ${position}`.toLowerCase();
    const matches = relevantKeywords.filter(keyword => text.includes(keyword));
    
    // Additional alignment based on user goals
    let goalAlignment = 0;
    if (userGoals && userGoals.length > 0) {
      goalAlignment = userGoals.some(goal => text.includes(goal.toLowerCase())) ? 20 : 0;
    }

    return Math.min(100, (matches.length * 15) + goalAlignment);
  }

  private calculateSeniorityLevel(position: string): number {
    const pos = position.toLowerCase();
    const seniorityKeywords = {
      'ceo': 100, 'president': 95, 'founder': 95, 'owner': 90,
      'cto': 95, 'cfo': 95, 'cmo': 95, 'coo': 95,
      'vp': 85, 'vice president': 85, 'svp': 90,
      'director': 75, 'head': 75, 'chief': 80,
      'senior': 65, 'lead': 60, 'principal': 70,
      'manager': 55, 'supervisor': 50,
      'associate': 40, 'junior': 30, 'intern': 20
    };

    for (const [keyword, score] of Object.entries(seniorityKeywords)) {
      if (pos.includes(keyword)) {
        return score;
      }
    }
    return 45; // Default mid-level score
  }

  private estimateCompanySize(company: string): number {
    // This is a simplified implementation - in production, you'd use external APIs
    const company_lower = company.toLowerCase();
    const largeCompanyKeywords = ['microsoft', 'google', 'apple', 'amazon', 'facebook', 'meta', 'tesla'];
    const mediumCompanyIndicators = ['inc', 'corp', 'corporation', 'ltd', 'llc'];
    
    if (largeCompanyKeywords.some(keyword => company_lower.includes(keyword))) {
      return 90;
    }
    
    if (mediumCompanyIndicators.some(indicator => company_lower.includes(indicator))) {
      return 60;
    }
    
    return 40; // Default small company score
  }

  private getIndustryTrendScore(company: string): number {
    // Simplified industry trend scoring - could be enhanced with real market data
    const trendingIndustries = ['ai', 'artificial intelligence', 'machine learning', 'blockchain', 'crypto', 'fintech'];
    const company_lower = company.toLowerCase();
    
    return trendingIndustries.some(trend => company_lower.includes(trend)) ? 80 : 50;
  }

  private hasRoleExpansionPotential(position: string, company: string): boolean {
    const pos = position.toLowerCase();
    const expansionIndicators = ['manager', 'director', 'lead', 'senior', 'principal'];
    return expansionIndicators.some(indicator => pos.includes(indicator));
  }

  private hasCompanyGrowthSignals(company: string): boolean {
    // Simplified - in production, you'd check funding data, hiring trends, etc.
    const company_lower = company.toLowerCase();
    const growthKeywords = ['startup', 'venture', 'series', 'funding', 'ipo'];
    return growthKeywords.some(keyword => company_lower.includes(keyword));
  }

  /**
   * Batch scoring for multiple contacts
   */
  async batchScoreContacts(accountId: string, contactIds?: string[], userGoals?: string[]): Promise<void> {
    const where: any = { accountId, status: 'ACTIVE' };
    if (contactIds && contactIds.length > 0) {
      where.id = { in: contactIds };
    }

    const contacts = await prisma.contact.findMany({
      where,
      select: { id: true }
    });

    const batchSize = 5; // Process 5 contacts at a time to avoid overwhelming the system
    
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (contact) => {
          try {
            const scoring = await this.scoreContact(contact.id, accountId, userGoals);
            
            await prisma.contact.update({
              where: { id: contact.id },
              data: {
                priorityScore: scoring.priorityScore,
                opportunityScore: scoring.opportunityScore,
                strategicValue: scoring.strategicValue,
                scoringFactors: scoring.scoringFactors as any,
                opportunityFlags: scoring.opportunityFlags,
                lastScoringUpdate: new Date()
              }
            });
          } catch (error) {
            console.error(`Error scoring contact ${contact.id}:`, error);
          }
        })
      );

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Get top priority contacts for an account
   */
  async getTopPriorityContacts(accountId: string, limit: number = 20): Promise<any[]> {
    return prisma.contact.findMany({
      where: {
        accountId,
        status: 'ACTIVE',
        priorityScore: { not: null }
      },
      orderBy: [
        { priorityScore: 'desc' },
        { opportunityScore: 'desc' }
      ],
      take: limit,
      include: {
        networkAnalytics: true,
        _count: {
          select: {
            outreach: true,
            relationships: true,
            relatedTo: true
          }
        }
      }
    });
  }

  /**
   * Get contacts with high opportunity scores
   */
  async getHighOpportunityContacts(accountId: string, limit: number = 20): Promise<any[]> {
    return prisma.contact.findMany({
      where: {
        accountId,
        status: 'ACTIVE',
        opportunityScore: { gte: 70 }
      },
      orderBy: [
        { opportunityScore: 'desc' },
        { priorityScore: 'desc' }
      ],
      take: limit,
      include: {
        networkAnalytics: true,
        _count: {
          select: {
            outreach: true,
            relationships: true,
            relatedTo: true
          }
        }
      }
    });
  }

  /**
   * Get strategic networking recommendations
   */
  async getStrategicNetworkingRecommendations(accountId: string, limit: number = 20): Promise<any[]> {
    return prisma.contact.findMany({
      where: {
        accountId,
        status: 'ACTIVE',
        strategicValue: { gte: 60 }
      },
      orderBy: [
        { strategicValue: 'desc' },
        { priorityScore: 'desc' }
      ],
      take: limit,
      include: {
        networkAnalytics: true,
        relationships: {
          include: {
            relatedContact: {
              select: {
                firstName: true,
                lastName: true,
                company: true,
                position: true
              }
            }
          },
          take: 3
        },
        _count: {
          select: {
            outreach: true,
            relationships: true,
            relatedTo: true
          }
        }
      }
    });
  }
}

export const aiScoringService = new AIScoringService();