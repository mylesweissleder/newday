import { PrismaClient } from '@prisma/client';
import { RelationshipType, OpportunityCategory, OpportunityType, OpportunityPriority } from '@prisma/client';

const prisma = new PrismaClient();

export interface IntroductionOpportunity {
  introducerContact: {
    id: string;
    name: string;
    company?: string;
    position?: string;
    relationshipType?: RelationshipType;
    relationshipStrength: number;
  };
  targetContact: {
    id: string;
    name: string;
    company?: string;
    position?: string;
    relationshipType?: RelationshipType;
    relationshipStrength: number;
  };
  mutualContact: {
    id: string;
    name: string;
    company?: string;
    position?: string;
    relationshipWithIntroducer: number;
    relationshipWithTarget: number;
  };
  opportunity: {
    confidenceScore: number;
    impactScore: number;
    effortScore: number;
    reasoning: string;
    evidenceFactors: string[];
    bestTiming?: Date;
    category: OpportunityCategory;
    type: OpportunityType;
    priority: OpportunityPriority;
  };
}

export interface BusinessMatchingCriteria {
  industryAlignment?: boolean;
  complementarySkills?: boolean;
  seniorityBalance?: boolean;
  geographicRelevance?: boolean;
  mutualBenefit?: boolean;
}

export class IntroductionOpportunityEngine {

  /**
   * Detect introduction opportunities for an account
   */
  async detectIntroductionOpportunities(accountId: string, limit: number = 50): Promise<IntroductionOpportunity[]> {
    // Get all contacts with their relationships and network data
    const contacts = await prisma.contact.findMany({
      where: {
        accountId,
        status: 'ACTIVE',
        // Focus on contacts we have good relationships with
        relationshipType: {
          in: ['COLLEAGUE', 'CLIENT', 'PARTNER', 'FRIEND', 'MENTOR', 'MENTEE']
        }
      },
      include: {
        relationships: {
          include: {
            relatedContact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                position: true,
                relationshipType: true,
                priorityScore: true,
                opportunityScore: true,
                strategicValue: true,
                lastContactDate: true
              }
            }
          },
          where: {
            strength: { gte: 0.6 }, // Only strong relationships
            isVerified: true
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
                relationshipType: true,
                priorityScore: true,
                opportunityScore: true,
                strategicValue: true,
                lastContactDate: true
              }
            }
          },
          where: {
            strength: { gte: 0.6 },
            isVerified: true
          }
        },
        networkAnalytics: true
      }
    });

    const opportunities: IntroductionOpportunity[] = [];

    // Find triangular connections: A knows B, A knows C, but B and C don't know each other
    for (const contactA of contacts) {
      const aConnections = [
        ...contactA.relationships.map(r => r.relatedContact),
        ...contactA.relatedTo.map(r => r.contact)
      ];

      // For each pair of A's connections, check if they should be introduced
      for (let i = 0; i < aConnections.length; i++) {
        for (let j = i + 1; j < aConnections.length; j++) {
          const contactB = aConnections[i];
          const contactC = aConnections[j];

          // Skip if B and C already know each other
          const existingRelationship = await this.checkExistingRelationship(contactB.id, contactC.id);
          if (existingRelationship) continue;

          // Analyze if this would be a valuable introduction
          const opportunity = await this.analyzeIntroductionOpportunity(
            contactA,
            contactB,
            contactC,
            accountId
          );

          if (opportunity && opportunity.opportunity.confidenceScore >= 0.4) {
            opportunities.push(opportunity);
          }
        }
      }
    }

    // Sort by impact score and confidence, take top opportunities
    return opportunities
      .sort((a, b) => 
        (b.opportunity.impactScore * b.opportunity.confidenceScore) - 
        (a.opportunity.impactScore * a.opportunity.confidenceScore)
      )
      .slice(0, limit);
  }

  /**
   * Analyze a potential introduction opportunity
   */
  private async analyzeIntroductionOpportunity(
    introducer: any,
    contactB: any,
    contactC: any,
    accountId: string
  ): Promise<IntroductionOpportunity | null> {
    
    const businessMatch = this.analyzeBusinessMatching(contactB, contactC);
    if (!businessMatch.score || businessMatch.score < 0.3) return null;

    const relationshipStrengths = this.getRelationshipStrengths(introducer, contactB, contactC);
    const impactAnalysis = this.calculateIntroductionImpact(contactB, contactC, businessMatch);
    const effortAnalysis = this.calculateIntroductionEffort(introducer, contactB, contactC);
    const timingAnalysis = this.analyzeIntroductionTiming(contactB, contactC);

    const confidenceScore = this.calculateIntroductionConfidence({
      businessMatch,
      relationshipStrengths,
      impactAnalysis,
      timingAnalysis
    });

    if (confidenceScore < 0.4) return null;

    return {
      introducerContact: {
        id: introducer.id,
        name: `${introducer.firstName} ${introducer.lastName}`,
        company: introducer.company,
        position: introducer.position,
        relationshipType: introducer.relationshipType,
        relationshipStrength: relationshipStrengths.introducerStrength
      },
      targetContact: {
        id: contactB.id,
        name: `${contactB.firstName} ${contactB.lastName}`,
        company: contactB.company,
        position: contactB.position,
        relationshipType: contactB.relationshipType,
        relationshipStrength: relationshipStrengths.targetBStrength
      },
      mutualContact: {
        id: contactC.id,
        name: `${contactC.firstName} ${contactC.lastName}`,
        company: contactC.company,
        position: contactC.position,
        relationshipWithIntroducer: relationshipStrengths.introducerStrength,
        relationshipWithTarget: relationshipStrengths.targetCStrength
      },
      opportunity: {
        confidenceScore,
        impactScore: impactAnalysis.score,
        effortScore: effortAnalysis.score,
        reasoning: this.generateIntroductionReasoning(businessMatch, impactAnalysis, effortAnalysis),
        evidenceFactors: businessMatch.factors,
        bestTiming: timingAnalysis.bestTiming,
        category: 'INTRODUCTION' as OpportunityCategory,
        type: this.determineIntroductionType(businessMatch),
        priority: this.determineIntroductionPriority(confidenceScore, impactAnalysis.score)
      }
    };
  }

  /**
   * Analyze business matching potential between two contacts
   */
  private analyzeBusinessMatching(contactB: any, contactC: any): { score: number; factors: string[]; criteria: BusinessMatchingCriteria } {
    const factors: string[] = [];
    const criteria: BusinessMatchingCriteria = {};
    let score = 0;

    // Industry alignment - look for complementary or same industries
    if (contactB.company && contactC.company) {
      const industryMatch = this.analyzeIndustryAlignment(contactB.company, contactC.company);
      if (industryMatch.complementary) {
        score += 0.25;
        factors.push(`Complementary industries: ${contactB.company} & ${contactC.company}`);
        criteria.industryAlignment = true;
      } else if (industryMatch.same) {
        score += 0.15;
        factors.push(`Same industry: ${contactB.company}`);
        criteria.industryAlignment = true;
      }
    }

    // Role complementarity
    if (contactB.position && contactC.position) {
      const roleMatch = this.analyzeRoleComplementarity(contactB.position, contactC.position);
      if (roleMatch.complementary) {
        score += 0.3;
        factors.push(`Complementary roles: ${contactB.position} & ${contactC.position}`);
        criteria.complementarySkills = true;
      }
    }

    // Seniority balance - look for mentor/mentee or peer relationships
    const seniorityBalance = this.analyzeSeniorityBalance(contactB.position, contactC.position);
    if (seniorityBalance.beneficial) {
      score += 0.2;
      factors.push(seniorityBalance.reason);
      criteria.seniorityBalance = true;
    }

    // Priority and strategic value alignment
    const priorityAlignment = this.analyzePriorityAlignment(contactB, contactC);
    if (priorityAlignment.highValue) {
      score += 0.15;
      factors.push('Both contacts have high strategic value');
    }

    // Opportunity score alignment
    if (contactB.opportunityScore && contactC.opportunityScore && 
        (contactB.opportunityScore > 70 || contactC.opportunityScore > 70)) {
      score += 0.1;
      factors.push('High opportunity potential identified');
    }

    return { score, factors, criteria };
  }

  /**
   * Check if two contacts already have a relationship
   */
  private async checkExistingRelationship(contactId1: string, contactId2: string): Promise<boolean> {
    const existing = await prisma.contactRelationship.findFirst({
      where: {
        OR: [
          { contactId: contactId1, relatedContactId: contactId2 },
          { contactId: contactId2, relatedContactId: contactId1 }
        ]
      }
    });
    return !!existing;
  }

  /**
   * Get relationship strengths between introducer and both contacts
   */
  private getRelationshipStrengths(introducer: any, contactB: any, contactC: any): {
    introducerStrength: number;
    targetBStrength: number;
    targetCStrength: number;
  } {
    // In a real implementation, you'd look up the actual relationship strengths
    // For now, we'll use some heuristics based on available data
    return {
      introducerStrength: 0.8, // Strong relationship assumed
      targetBStrength: 0.7,
      targetCStrength: 0.7
    };
  }

  /**
   * Calculate the potential impact of the introduction
   */
  private calculateIntroductionImpact(contactB: any, contactC: any, businessMatch: any): { score: number; reasoning: string } {
    let score = 0;
    const reasons: string[] = [];

    // Base score from business matching
    score += businessMatch.score * 50; // Scale to 0-50

    // Strategic value bonus
    const avgStrategicValue = ((contactB.strategicValue || 0) + (contactC.strategicValue || 0)) / 2;
    score += avgStrategicValue * 0.3; // Add up to 30 points

    // Priority score bonus
    const avgPriorityScore = ((contactB.priorityScore || 0) + (contactC.priorityScore || 0)) / 2;
    score += avgPriorityScore * 0.2; // Add up to 20 points

    if (avgStrategicValue > 70) reasons.push('High strategic value contacts');
    if (avgPriorityScore > 80) reasons.push('High priority contacts');
    if (businessMatch.criteria.complementarySkills) reasons.push('Complementary skill sets');
    if (businessMatch.criteria.industryAlignment) reasons.push('Industry synergy');

    return {
      score: Math.min(100, Math.max(0, score)),
      reasoning: reasons.join(', ')
    };
  }

  /**
   * Calculate the effort required for the introduction
   */
  private calculateIntroductionEffort(introducer: any, contactB: any, contactC: any): { score: number; reasoning: string } {
    let effort = 50; // Base effort score (lower = less effort)

    // Recent contact reduces effort
    const recentContactB = this.isRecentContact(contactB.lastContactDate);
    const recentContactC = this.isRecentContact(contactC.lastContactDate);

    if (recentContactB) effort -= 10;
    if (recentContactC) effort -= 10;

    // Strong relationships reduce effort
    if (introducer.relationshipType === 'FRIEND' || introducer.relationshipType === 'COLLEAGUE') {
      effort -= 15;
    }

    const reasons: string[] = [];
    if (recentContactB || recentContactC) reasons.push('Recent contact history');
    if (effort < 40) reasons.push('Strong existing relationships');

    return {
      score: Math.max(10, Math.min(100, effort)),
      reasoning: reasons.join(', ')
    };
  }

  /**
   * Analyze timing for the introduction
   */
  private analyzeIntroductionTiming(contactB: any, contactC: any): { bestTiming?: Date; reasoning: string } {
    // For now, suggest immediate timing, but this could be enhanced with:
    // - Contact availability patterns
    // - Industry event calendars
    // - Recent activity patterns
    return {
      bestTiming: new Date(),
      reasoning: 'Immediate introduction recommended'
    };
  }

  /**
   * Calculate overall confidence score for the introduction
   */
  private calculateIntroductionConfidence(factors: {
    businessMatch: any;
    relationshipStrengths: any;
    impactAnalysis: any;
    timingAnalysis: any;
  }): number {
    const weights = {
      businessMatch: 0.4,
      relationshipStrength: 0.3,
      impact: 0.2,
      timing: 0.1
    };

    const avgRelationshipStrength = (
      factors.relationshipStrengths.targetBStrength + 
      factors.relationshipStrengths.targetCStrength
    ) / 2;

    return Math.min(1, 
      factors.businessMatch.score * weights.businessMatch +
      avgRelationshipStrength * weights.relationshipStrength +
      (factors.impactAnalysis.score / 100) * weights.impact +
      0.8 * weights.timing // Timing is generally good
    );
  }

  /**
   * Generate human-readable reasoning for the introduction
   */
  private generateIntroductionReasoning(businessMatch: any, impactAnalysis: any, effortAnalysis: any): string {
    const parts = [
      `Business matching score: ${Math.round(businessMatch.score * 100)}%`,
      `Potential impact: ${Math.round(impactAnalysis.score)}/100`,
      `Effort required: ${Math.round(effortAnalysis.score)}/100`
    ];

    if (businessMatch.factors.length > 0) {
      parts.push(`Key factors: ${businessMatch.factors.slice(0, 2).join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Helper methods for analysis
   */
  private analyzeIndustryAlignment(company1: string, company2: string): { same: boolean; complementary: boolean } {
    const c1 = company1.toLowerCase();
    const c2 = company2.toLowerCase();

    // Same industry indicators
    const same = c1.includes(c2) || c2.includes(c1) || this.extractIndustryKeywords(c1).some(k => c2.includes(k));

    // Complementary industry pairs
    const complementaryPairs = [
      ['tech', 'marketing'], ['software', 'consulting'], ['finance', 'real estate'],
      ['healthcare', 'technology'], ['education', 'technology'], ['retail', 'logistics']
    ];

    const keywords1 = this.extractIndustryKeywords(c1);
    const keywords2 = this.extractIndustryKeywords(c2);
    
    const complementary = complementaryPairs.some(([ind1, ind2]) =>
      (keywords1.includes(ind1) && keywords2.includes(ind2)) ||
      (keywords1.includes(ind2) && keywords2.includes(ind1))
    );

    return { same, complementary };
  }

  private analyzeRoleComplementarity(role1: string, role2: string): { complementary: boolean; reason?: string } {
    const r1 = role1.toLowerCase();
    const r2 = role2.toLowerCase();

    const complementaryPairs = [
      ['sales', 'marketing'], ['product', 'engineering'], ['ceo', 'cto'],
      ['business development', 'operations'], ['finance', 'accounting'],
      ['designer', 'developer'], ['consultant', 'client']
    ];

    for (const [roleA, roleB] of complementaryPairs) {
      if ((r1.includes(roleA) && r2.includes(roleB)) || (r1.includes(roleB) && r2.includes(roleA))) {
        return { complementary: true, reason: `Complementary roles: ${roleA} and ${roleB}` };
      }
    }

    return { complementary: false };
  }

  private analyzeSeniorityBalance(role1: string, role2: string): { beneficial: boolean; reason: string } {
    const seniority1 = this.calculateSeniorityScore(role1);
    const seniority2 = this.calculateSeniorityScore(role2);
    const diff = Math.abs(seniority1 - seniority2);

    if (diff > 20 && diff < 50) {
      return {
        beneficial: true,
        reason: `Good seniority balance for mentorship/guidance opportunities`
      };
    }

    if (diff < 15) {
      return {
        beneficial: true,
        reason: `Peer-level professionals for collaboration`
      };
    }

    return { beneficial: false, reason: 'Seniority mismatch' };
  }

  private analyzePriorityAlignment(contactB: any, contactC: any): { highValue: boolean } {
    const avgPriority = ((contactB.priorityScore || 0) + (contactC.priorityScore || 0)) / 2;
    const avgStrategic = ((contactB.strategicValue || 0) + (contactC.strategicValue || 0)) / 2;

    return {
      highValue: avgPriority > 70 || avgStrategic > 70
    };
  }

  private isRecentContact(lastContactDate?: Date): boolean {
    if (!lastContactDate) return false;
    const daysSince = (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 30; // Within last 30 days
  }

  private extractIndustryKeywords(company: string): string[] {
    const keywords = [
      'tech', 'technology', 'software', 'fintech', 'healthcare', 'finance',
      'marketing', 'consulting', 'education', 'retail', 'logistics', 'manufacturing'
    ];
    return keywords.filter(keyword => company.includes(keyword));
  }

  private calculateSeniorityScore(position: string): number {
    const pos = position.toLowerCase();
    if (pos.includes('ceo') || pos.includes('president') || pos.includes('founder')) return 100;
    if (pos.includes('cto') || pos.includes('cfo') || pos.includes('cmo')) return 95;
    if (pos.includes('vp') || pos.includes('vice president')) return 85;
    if (pos.includes('director')) return 75;
    if (pos.includes('senior') || pos.includes('lead') || pos.includes('principal')) return 65;
    if (pos.includes('manager')) return 55;
    if (pos.includes('associate')) return 40;
    if (pos.includes('junior')) return 30;
    return 50; // Default mid-level
  }

  private determineIntroductionType(businessMatch: any): OpportunityType {
    if (businessMatch.criteria.complementarySkills) return 'PARTNERSHIP';
    if (businessMatch.criteria.industryAlignment) return 'BUSINESS_PROPOSAL';
    return 'WARM_INTRODUCTION';
  }

  private determineIntroductionPriority(confidence: number, impact: number): OpportunityPriority {
    const score = confidence * impact;
    if (score > 80) return 'HIGH';
    if (score > 60) return 'MEDIUM';
    return 'LOW';
  }
}

export const introductionEngine = new IntroductionOpportunityEngine();