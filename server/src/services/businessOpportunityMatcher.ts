
import { OpportunityCategory, OpportunityType, OpportunityPriority, RelationshipType } from '@prisma/client';

import prisma from "../utils/prisma";

export interface BusinessOpportunity {
  contact: {
    id: string;
    name: string;
    company?: string;
    position?: string;
    relationshipType?: RelationshipType;
    strategicValue?: number;
    opportunityScore?: number;
    lastContactDate?: Date;
  };
  opportunity: {
    type: BusinessOpportunityType;
    category: OpportunityCategory;
    confidenceScore: number; // 0-1
    impactScore: number; // 0-100
    timelineScore: number; // 0-100 (urgency/timing)
    effortScore: number; // 0-100
    reasoning: string;
    evidenceFactors: string[];
    suggestedActions: BusinessAction[];
    estimatedValue: {
      monetary?: number;
      strategic: number; // 0-100
      relationship: number; // 0-100
    };
    timing: {
      bestApproach: Date;
      deadline?: Date;
      seasonality?: string;
    };
    matchCriteria: BusinessMatchCriteria;
  };
}

export interface BusinessMatchCriteria {
  industryAlignment: boolean;
  roleRelevance: boolean;
  companyStage: string; // 'startup', 'growth', 'mature', 'enterprise'
  needsAlignment: string[]; // What needs this contact might have
  capabilities: string[]; // What this contact can provide
  complementarySkills: boolean;
  mutualBenefit: boolean;
}

export interface BusinessAction {
  action: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: number; // 1-10
  timeline: string; // 'immediate', 'short-term', 'long-term'
  requirements: string[];
}

export type BusinessOpportunityType = 
  'CLIENT_PROSPECT' | 
  'PARTNERSHIP' | 
  'VENDOR_OPPORTUNITY' | 
  'INVESTMENT_OPPORTUNITY' | 
  'JOB_REFERRAL' | 
  'KNOWLEDGE_EXCHANGE' | 
  'COLLABORATION' | 
  'ADVISORY_ROLE' | 
  'BOARD_POSITION' | 
  'SPEAKING_OPPORTUNITY';

export interface BusinessMatchingFilters {
  opportunityTypes?: BusinessOpportunityType[];
  minConfidence?: number;
  minImpact?: number;
  industries?: string[];
  companySizes?: string[];
  relationshipTypes?: RelationshipType[];
  hasRecentActivity?: boolean;
  timeHorizon?: 'immediate' | 'short_term' | 'long_term' | 'any';
}

export class BusinessOpportunityMatcherService {

  /**
   * Find business opportunities across the network
   */
  async findBusinessOpportunities(
    accountId: string, 
    filters: BusinessMatchingFilters = {},
    limit: number = 50
  ): Promise<BusinessOpportunity[]> {
    
    const contacts = await this.getQualifiedContacts(accountId, filters);
    const opportunities: BusinessOpportunity[] = [];

    for (const contact of contacts) {
      const businessOps = await this.analyzeContactForBusinessOpportunities(contact, accountId);
      opportunities.push(...businessOps);
    }

    // Sort by composite score and filter
    return opportunities
      .filter(opp => {
        if (filters.minConfidence && opp.opportunity.confidenceScore < filters.minConfidence) return false;
        if (filters.minImpact && opp.opportunity.impactScore < filters.minImpact) return false;
        if (filters.opportunityTypes && !filters.opportunityTypes.includes(opp.opportunity.type)) return false;
        return true;
      })
      .sort((a, b) => {
        const scoreA = a.opportunity.confidenceScore * a.opportunity.impactScore * a.opportunity.timelineScore;
        const scoreB = b.opportunity.confidenceScore * b.opportunity.impactScore * b.opportunity.timelineScore;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get contacts qualified for business opportunity analysis
   */
  private async getQualifiedContacts(accountId: string, filters: BusinessMatchingFilters): Promise<any[]> {
    const where: any = {
      accountId,
      status: 'ACTIVE'
    };

    // Apply filters
    if (filters.relationshipTypes && filters.relationshipTypes.length > 0) {
      where.relationshipType = { in: filters.relationshipTypes };
    }

    if (filters.hasRecentActivity) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      where.lastContactDate = { gte: threeMonthsAgo };
    }

    return prisma.contact.findMany({
      where,
      include: {
        outreach: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        relationships: {
          include: {
            relatedContact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                position: true,
                strategicValue: true
              }
            }
          }
        },
        networkAnalytics: true,
        campaignContacts: {
          include: {
            campaign: {
              select: { status: true }
            }
          }
        }
      }
    });
  }

  /**
   * Analyze a contact for various business opportunities
   */
  private async analyzeContactForBusinessOpportunities(contact: any, accountId: string): Promise<BusinessOpportunity[]> {
    const opportunities: BusinessOpportunity[] = [];

    // Analyze different types of business opportunities
    const clientOp = await this.analyzeClientOpportunity(contact);
    if (clientOp) opportunities.push(clientOp);

    const partnershipOp = await this.analyzePartnershipOpportunity(contact);
    if (partnershipOp) opportunities.push(partnershipOp);

    const vendorOp = await this.analyzeVendorOpportunity(contact);
    if (vendorOp) opportunities.push(vendorOp);

    const investmentOp = await this.analyzeInvestmentOpportunity(contact);
    if (investmentOp) opportunities.push(investmentOp);

    const jobReferralOp = await this.analyzeJobReferralOpportunity(contact);
    if (jobReferralOp) opportunities.push(jobReferralOp);

    const knowledgeExchangeOp = await this.analyzeKnowledgeExchangeOpportunity(contact);
    if (knowledgeExchangeOp) opportunities.push(knowledgeExchangeOp);

    const collaborationOp = await this.analyzeCollaborationOpportunity(contact);
    if (collaborationOp) opportunities.push(collaborationOp);

    return opportunities.filter(op => op.opportunity.confidenceScore >= 0.3);
  }

  /**
   * Analyze client/customer opportunity potential
   */
  private async analyzeClientOpportunity(contact: any): Promise<BusinessOpportunity | null> {
    // Skip if already a client
    if (contact.relationshipType === 'CLIENT') return null;

    const evidence: string[] = [];
    let confidence = 0;
    let impact = 0;

    // Company size indicates budget potential
    const companySize = this.estimateCompanySize(contact.company || '');
    if (companySize === 'enterprise' || companySize === 'large') {
      confidence += 0.3;
      impact += 40;
      evidence.push('Large company with significant budget potential');
    } else if (companySize === 'medium') {
      confidence += 0.2;
      impact += 25;
      evidence.push('Medium-sized company with moderate budget');
    }

    // Role indicates decision-making power
    const decisionMakingPower = this.assessDecisionMakingPower(contact.position || '');
    confidence += decisionMakingPower * 0.3;
    impact += decisionMakingPower * 30;
    if (decisionMakingPower > 0.6) {
      evidence.push('High decision-making authority in role');
    }

    // Industry alignment with services
    const industryMatch = this.calculateIndustryServiceAlignment(contact.company || '');
    if (industryMatch > 0.7) {
      confidence += 0.2;
      impact += 20;
      evidence.push('Strong industry-service alignment');
    }

    // Recent activity or engagement
    if (contact.opportunityScore > 70) {
      confidence += 0.15;
      evidence.push('High opportunity score indicates readiness');
    }

    // Relationship strength
    if (contact.relationshipType === 'PROSPECT') {
      confidence += 0.1;
      evidence.push('Already identified as prospect');
    } else if (contact.relationshipType === 'COLLEAGUE' || contact.relationshipType === 'PARTNER') {
      confidence += 0.05;
      evidence.push('Existing professional relationship');
    }

    if (confidence < 0.3) return null;

    const matchCriteria: BusinessMatchCriteria = {
      industryAlignment: industryMatch > 0.5,
      roleRelevance: decisionMakingPower > 0.5,
      companyStage: companySize,
      needsAlignment: this.identifyPotentialNeeds(contact),
      capabilities: this.identifyOurCapabilities(contact),
      complementarySkills: industryMatch > 0.6,
      mutualBenefit: true
    };

    return {
      contact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        relationshipType: contact.relationshipType,
        strategicValue: contact.strategicValue,
        opportunityScore: contact.opportunityScore,
        lastContactDate: contact.lastContactDate
      },
      opportunity: {
        type: 'CLIENT_PROSPECT',
        category: 'BUSINESS_MATCH',
        confidenceScore: Math.min(1, confidence),
        impactScore: Math.min(100, impact),
        timelineScore: this.calculateClientTimelineScore(contact),
        effortScore: this.calculateClientEffortScore(contact),
        reasoning: this.generateClientOpportunityReasoning(evidence, impact, confidence),
        evidenceFactors: evidence,
        suggestedActions: this.generateClientActions(contact, confidence, impact),
        estimatedValue: {
          monetary: this.estimateClientValue(contact, companySize),
          strategic: Math.min(100, impact),
          relationship: contact.strategicValue || 0
        },
        timing: {
          bestApproach: this.calculateOptimalClientApproachTiming(contact),
          deadline: this.calculateClientOpportunityDeadline(contact),
          seasonality: this.getIndustrySeasonality(contact.company)
        },
        matchCriteria
      }
    };
  }

  /**
   * Analyze partnership opportunity potential
   */
  private async analyzePartnershipOpportunity(contact: any): Promise<BusinessOpportunity | null> {
    const evidence: string[] = [];
    let confidence = 0;
    let impact = 0;

    // Complementary business/skills
    const complementarity = this.assessComplementaryPotential(contact);
    if (complementarity > 0.6) {
      confidence += 0.4;
      impact += 50;
      evidence.push('Strong complementary business potential');
    }

    // Similar market/customer base
    const marketOverlap = this.assessMarketOverlap(contact);
    if (marketOverlap > 0.5) {
      confidence += 0.2;
      impact += 30;
      evidence.push('Significant market/customer overlap');
    }

    // Network strength and influence
    if (contact.networkAnalytics?.influenceScore > 0.7) {
      confidence += 0.2;
      impact += 25;
      evidence.push('High network influence for partnership leverage');
    }

    // Strategic value
    if (contact.strategicValue > 80) {
      confidence += 0.1;
      evidence.push('High strategic value contact');
    }

    if (confidence < 0.3) return null;

    const matchCriteria: BusinessMatchCriteria = {
      industryAlignment: marketOverlap > 0.4,
      roleRelevance: this.assessDecisionMakingPower(contact.position || '') > 0.5,
      companyStage: this.estimateCompanySize(contact.company || ''),
      needsAlignment: ['partnership', 'collaboration', 'market_expansion'],
      capabilities: this.identifyPartnershipCapabilities(contact),
      complementarySkills: complementarity > 0.5,
      mutualBenefit: true
    };

    return {
      contact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        relationshipType: contact.relationshipType,
        strategicValue: contact.strategicValue,
        opportunityScore: contact.opportunityScore,
        lastContactDate: contact.lastContactDate
      },
      opportunity: {
        type: 'PARTNERSHIP',
        category: 'BUSINESS_MATCH',
        confidenceScore: Math.min(1, confidence),
        impactScore: Math.min(100, impact),
        timelineScore: this.calculatePartnershipTimelineScore(contact),
        effortScore: this.calculatePartnershipEffortScore(contact),
        reasoning: this.generatePartnershipReasoning(evidence, complementarity, marketOverlap),
        evidenceFactors: evidence,
        suggestedActions: this.generatePartnershipActions(contact),
        estimatedValue: {
          strategic: Math.min(100, impact),
          relationship: Math.min(100, (contact.strategicValue || 0) + 20)
        },
        timing: {
          bestApproach: this.calculateOptimalPartnershipTiming(contact)
        },
        matchCriteria
      }
    };
  }

  /**
   * Analyze vendor/supplier opportunity potential
   */
  private async analyzeVendorOpportunity(contact: any): Promise<BusinessOpportunity | null> {
    // Skip if already a vendor
    if (contact.relationshipType === 'VENDOR') return null;

    const evidence: string[] = [];
    let confidence = 0;
    let impact = 0;

    // Company provides services we might need
    const serviceAlignment = this.assessVendorServiceAlignment(contact);
    if (serviceAlignment > 0.6) {
      confidence += 0.4;
      impact += 40;
      evidence.push('Strong service alignment with our needs');
    }

    // Cost-effectiveness potential
    const companySize = this.estimateCompanySize(contact.company || '');
    if (companySize === 'small' || companySize === 'startup') {
      confidence += 0.2;
      impact += 20;
      evidence.push('Smaller company likely offers competitive pricing');
    }

    // Quality indicators
    if (contact.strategicValue > 70) {
      confidence += 0.15;
      evidence.push('High strategic value indicates quality');
    }

    if (confidence < 0.3) return null;

    const matchCriteria: BusinessMatchCriteria = {
      industryAlignment: serviceAlignment > 0.5,
      roleRelevance: true,
      companyStage: companySize,
      needsAlignment: this.identifyOurPotentialNeeds(),
      capabilities: this.identifyVendorCapabilities(contact),
      complementarySkills: serviceAlignment > 0.6,
      mutualBenefit: true
    };

    return {
      contact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        relationshipType: contact.relationshipType,
        strategicValue: contact.strategicValue,
        opportunityScore: contact.opportunityScore,
        lastContactDate: contact.lastContactDate
      },
      opportunity: {
        type: 'VENDOR_OPPORTUNITY',
        category: 'BUSINESS_MATCH',
        confidenceScore: Math.min(1, confidence),
        impactScore: Math.min(100, impact),
        timelineScore: 60, // Vendor opportunities are usually medium-term
        effortScore: 40, // Generally lower effort
        reasoning: `Potential vendor opportunity: ${evidence.join(', ')}`,
        evidenceFactors: evidence,
        suggestedActions: this.generateVendorActions(contact),
        estimatedValue: {
          strategic: Math.min(100, impact),
          relationship: contact.strategicValue || 0
        },
        timing: {
          bestApproach: new Date() // Vendor evaluation can be ongoing
        },
        matchCriteria
      }
    };
  }

  /**
   * Analyze investment opportunity potential
   */
  private async analyzeInvestmentOpportunity(contact: any): Promise<BusinessOpportunity | null> {
    const evidence: string[] = [];
    let confidence = 0;
    let impact = 0;

    // Contact is investor or works at investment firm
    const isInvestor = this.isInvestorRole(contact.position || '') || 
                      this.isInvestmentCompany(contact.company || '');
    
    if (!isInvestor) return null;

    confidence += 0.3;
    impact += 60;
    evidence.push('Contact works in investment/funding role');

    // Stage alignment
    const investorStage = this.identifyInvestorStage(contact);
    if (investorStage === 'seed' || investorStage === 'series_a') {
      confidence += 0.2;
      evidence.push('Investor stage aligns with growth companies');
    }

    // Network quality
    if (contact.networkAnalytics?.influenceScore > 0.8) {
      confidence += 0.2;
      impact += 20;
      evidence.push('High network influence valuable for funding');
    }

    if (confidence < 0.4) return null; // Higher bar for investment opportunities

    const matchCriteria: BusinessMatchCriteria = {
      industryAlignment: this.assessInvestorIndustryFit(contact),
      roleRelevance: true,
      companyStage: 'investment_firm',
      needsAlignment: ['funding', 'growth_capital', 'strategic_advice'],
      capabilities: ['capital', 'network', 'expertise'],
      complementarySkills: true,
      mutualBenefit: true
    };

    return {
      contact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        relationshipType: contact.relationshipType,
        strategicValue: contact.strategicValue,
        opportunityScore: contact.opportunityScore,
        lastContactDate: contact.lastContactDate
      },
      opportunity: {
        type: 'INVESTMENT_OPPORTUNITY',
        category: 'STRATEGIC_MOVE',
        confidenceScore: Math.min(1, confidence),
        impactScore: Math.min(100, impact),
        timelineScore: 40, // Investment discussions take time
        effortScore: 80, // High effort required
        reasoning: `Investment opportunity: ${evidence.join(', ')}`,
        evidenceFactors: evidence,
        suggestedActions: this.generateInvestmentActions(contact),
        estimatedValue: {
          monetary: this.estimateInvestmentValue(contact),
          strategic: Math.min(100, impact + 20),
          relationship: Math.min(100, (contact.strategicValue || 0) + 30)
        },
        timing: {
          bestApproach: this.calculateOptimalInvestmentTiming(),
          seasonality: 'Q1 and Q3 typically more active'
        },
        matchCriteria
      }
    };
  }

  /**
   * Analyze job referral opportunity potential
   */
  private async analyzeJobReferralOpportunity(contact: any): Promise<BusinessOpportunity | null> {
    const evidence: string[] = [];
    let confidence = 0;
    let impact = 0;

    // Contact is in hiring role or HR
    const canHire = this.canInfluenceHiring(contact.position || '');
    if (canHire) {
      confidence += 0.4;
      impact += 50;
      evidence.push('Contact has hiring influence');
    }

    // Company is growing
    const companyGrowth = this.assessCompanyGrowth(contact.company || '');
    if (companyGrowth) {
      confidence += 0.2;
      impact += 25;
      evidence.push('Company showing growth indicators');
    }

    // Industry/role alignment for referrals
    const roleAlignment = this.assessRoleAlignmentForReferrals(contact);
    if (roleAlignment > 0.6) {
      confidence += 0.2;
      impact += 20;
      evidence.push('Good role alignment for potential referrals');
    }

    if (confidence < 0.3) return null;

    const matchCriteria: BusinessMatchCriteria = {
      industryAlignment: roleAlignment > 0.5,
      roleRelevance: canHire,
      companyStage: this.estimateCompanySize(contact.company || ''),
      needsAlignment: ['talent', 'hiring', 'team_expansion'],
      capabilities: ['candidate_referrals', 'talent_network'],
      complementarySkills: false,
      mutualBenefit: true
    };

    return {
      contact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        relationshipType: contact.relationshipType,
        strategicValue: contact.strategicValue,
        opportunityScore: contact.opportunityScore,
        lastContactDate: contact.lastContactDate
      },
      opportunity: {
        type: 'JOB_REFERRAL',
        category: 'BUSINESS_MATCH',
        confidenceScore: Math.min(1, confidence),
        impactScore: Math.min(100, impact),
        timelineScore: 70, // Job referrals can be immediate
        effortScore: 30, // Generally low effort
        reasoning: `Job referral opportunity: ${evidence.join(', ')}`,
        evidenceFactors: evidence,
        suggestedActions: this.generateJobReferralActions(contact),
        estimatedValue: {
          strategic: Math.min(100, impact),
          relationship: Math.min(100, (contact.strategicValue || 0) + 15)
        },
        timing: {
          bestApproach: new Date()
        },
        matchCriteria
      }
    };
  }

  /**
   * Analyze knowledge exchange opportunity potential
   */
  private async analyzeKnowledgeExchangeOpportunity(contact: any): Promise<BusinessOpportunity | null> {
    const evidence: string[] = [];
    let confidence = 0;
    let impact = 0;

    // Contact has expertise we could learn from
    const expertiseValue = this.assessExpertiseValue(contact);
    if (expertiseValue > 0.6) {
      confidence += 0.3;
      impact += 40;
      evidence.push('Contact has valuable expertise');
    }

    // We have expertise they might value
    const mutualValue = this.assessMutualExpertiseValue(contact);
    if (mutualValue > 0.5) {
      confidence += 0.3;
      impact += 30;
      evidence.push('Mutual expertise exchange potential');
    }

    // Similar roles or complementary expertise
    const roleComplementarity = this.assessRoleComplementarity(contact.position || '');
    if (roleComplementarity) {
      confidence += 0.2;
      impact += 20;
      evidence.push('Complementary professional roles');
    }

    if (confidence < 0.4) return null; // Higher bar for knowledge exchange

    const matchCriteria: BusinessMatchCriteria = {
      industryAlignment: expertiseValue > 0.5,
      roleRelevance: roleComplementarity,
      companyStage: this.estimateCompanySize(contact.company || ''),
      needsAlignment: ['knowledge', 'expertise', 'learning'],
      capabilities: ['industry_insights', 'experience', 'network'],
      complementarySkills: true,
      mutualBenefit: mutualValue > 0.5
    };

    return {
      contact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        relationshipType: contact.relationshipType,
        strategicValue: contact.strategicValue,
        opportunityScore: contact.opportunityScore,
        lastContactDate: contact.lastContactDate
      },
      opportunity: {
        type: 'KNOWLEDGE_EXCHANGE',
        category: 'NETWORK_EXPANSION',
        confidenceScore: Math.min(1, confidence),
        impactScore: Math.min(100, impact),
        timelineScore: 80, // Knowledge exchange can happen quickly
        effortScore: 25, // Low effort
        reasoning: `Knowledge exchange opportunity: ${evidence.join(', ')}`,
        evidenceFactors: evidence,
        suggestedActions: this.generateKnowledgeExchangeActions(contact),
        estimatedValue: {
          strategic: Math.min(100, impact + 10),
          relationship: Math.min(100, (contact.strategicValue || 0) + 10)
        },
        timing: {
          bestApproach: new Date()
        },
        matchCriteria
      }
    };
  }

  /**
   * Analyze collaboration opportunity potential
   */
  private async analyzeCollaborationOpportunity(contact: any): Promise<BusinessOpportunity | null> {
    const evidence: string[] = [];
    let confidence = 0;
    let impact = 0;

    // Similar industry or complementary services
    const collaborationFit = this.assessCollaborationFit(contact);
    if (collaborationFit > 0.7) {
      confidence += 0.4;
      impact += 50;
      evidence.push('Strong collaboration fit identified');
    }

    // Project or initiative potential
    const projectPotential = this.assessProjectCollaborationPotential(contact);
    if (projectPotential > 0.5) {
      confidence += 0.3;
      impact += 30;
      evidence.push('Potential for project collaboration');
    }

    // Network synergies
    if (contact.networkAnalytics?.totalConnections > 100) {
      confidence += 0.2;
      impact += 20;
      evidence.push('Large network for collaboration leverage');
    }

    if (confidence < 0.4) return null;

    const matchCriteria: BusinessMatchCriteria = {
      industryAlignment: collaborationFit > 0.5,
      roleRelevance: projectPotential > 0.4,
      companyStage: this.estimateCompanySize(contact.company || ''),
      needsAlignment: ['collaboration', 'joint_projects', 'shared_resources'],
      capabilities: this.identifyCollaborationCapabilities(contact),
      complementarySkills: collaborationFit > 0.6,
      mutualBenefit: true
    };

    return {
      contact: {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        relationshipType: contact.relationshipType,
        strategicValue: contact.strategicValue,
        opportunityScore: contact.opportunityScore,
        lastContactDate: contact.lastContactDate
      },
      opportunity: {
        type: 'COLLABORATION',
        category: 'BUSINESS_MATCH',
        confidenceScore: Math.min(1, confidence),
        impactScore: Math.min(100, impact),
        timelineScore: 60, // Medium timeline for collaboration
        effortScore: 50, // Medium effort
        reasoning: `Collaboration opportunity: ${evidence.join(', ')}`,
        evidenceFactors: evidence,
        suggestedActions: this.generateCollaborationActions(contact),
        estimatedValue: {
          strategic: Math.min(100, impact + 15),
          relationship: Math.min(100, (contact.strategicValue || 0) + 20)
        },
        timing: {
          bestApproach: new Date()
        },
        matchCriteria
      }
    };
  }

  /**
   * Helper methods for assessment and calculations
   */
  
  private estimateCompanySize(company: string): string {
    const comp = company.toLowerCase();
    if (['microsoft', 'google', 'apple', 'amazon', 'facebook', 'meta', 'ibm'].some(large => comp.includes(large))) return 'enterprise';
    if (comp.includes('startup') || comp.includes('stealth')) return 'startup';
    if (['inc', 'corp', 'corporation'].some(indicator => comp.includes(indicator))) return 'medium';
    return 'small';
  }

  private assessDecisionMakingPower(position: string): number {
    const pos = position.toLowerCase();
    if (pos.includes('ceo') || pos.includes('president') || pos.includes('founder')) return 1.0;
    if (pos.includes('cto') || pos.includes('cfo') || pos.includes('cmo') || pos.includes('chief')) return 0.9;
    if (pos.includes('vp') || pos.includes('vice president')) return 0.8;
    if (pos.includes('director') || pos.includes('head')) return 0.7;
    if (pos.includes('manager') || pos.includes('lead')) return 0.5;
    return 0.3;
  }

  private calculateIndustryServiceAlignment(company: string): number {
    // Simplified industry alignment - in practice, you'd have more sophisticated matching
    const industry = company.toLowerCase();
    const highValueIndustries = ['technology', 'software', 'fintech', 'healthcare', 'consulting'];
    return highValueIndustries.some(hvi => industry.includes(hvi)) ? 0.8 : 0.4;
  }

  private identifyPotentialNeeds(contact: any): string[] {
    const needs = [];
    const company = contact.company?.toLowerCase() || '';
    const position = contact.position?.toLowerCase() || '';
    
    if (company.includes('startup')) needs.push('growth', 'funding', 'scaling');
    if (company.includes('tech')) needs.push('development', 'integration', 'optimization');
    if (position.includes('sales')) needs.push('lead_generation', 'crm', 'automation');
    if (position.includes('marketing')) needs.push('campaigns', 'analytics', 'content');
    
    return needs.length > 0 ? needs : ['consulting', 'advisory'];
  }

  private identifyOurCapabilities(contact: any): string[] {
    // This would be customized based on your actual business capabilities
    return ['consulting', 'development', 'strategy', 'networking', 'introductions'];
  }

  private generateClientOpportunityReasoning(evidence: string[], impact: number, confidence: number): string {
    return `Client opportunity identified: ${evidence.join(', ')}. Impact score: ${Math.round(impact)}, Confidence: ${Math.round(confidence * 100)}%`;
  }

  private calculateClientTimelineScore(contact: any): number {
    if (contact.opportunityScore > 80) return 90; // High urgency
    if (contact.opportunityScore > 60) return 70; // Medium urgency
    return 50; // Standard timeline
  }

  private calculateClientEffortScore(contact: any): number {
    let effort = 60; // Base effort
    
    if (contact.relationshipType === 'COLLEAGUE' || contact.relationshipType === 'PARTNER') {
      effort -= 20; // Existing relationship reduces effort
    }
    
    const daysSinceLastContact = contact.lastContactDate ? 
      (Date.now() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24) : 9999;
    
    if (daysSinceLastContact < 30) effort -= 15;
    else if (daysSinceLastContact > 365) effort += 15;
    
    return Math.max(20, Math.min(100, effort));
  }

  private estimateClientValue(contact: any, companySize: string): number {
    const sizeMultiplier = {
      'startup': 10000,
      'small': 25000,
      'medium': 75000,
      'large': 200000,
      'enterprise': 500000
    };
    return sizeMultiplier[companySize as keyof typeof sizeMultiplier] || 25000;
  }

  private calculateOptimalClientApproachTiming(contact: any): Date {
    const now = new Date();
    
    // If high opportunity score, approach soon
    if (contact.opportunityScore > 80) {
      now.setDate(now.getDate() + 1);
      return now;
    }
    
    // If recent contact, wait a bit
    const daysSinceLastContact = contact.lastContactDate ? 
      (Date.now() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24) : 9999;
    
    if (daysSinceLastContact < 14) {
      now.setDate(now.getDate() + 7);
    }
    
    return now;
  }

  private calculateClientOpportunityDeadline(contact: any): Date | undefined {
    if (contact.opportunityScore > 90) {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);
      return deadline;
    }
    return undefined;
  }

  private getIndustrySeasonality(company?: string): string {
    if (!company) return 'No specific seasonality';
    const industry = company.toLowerCase();
    if (industry.includes('retail')) return 'Q4 peak season';
    if (industry.includes('education')) return 'Back-to-school and Q1 budget cycles';
    return 'Q1 and Q3 typically strong';
  }

  private generateClientActions(contact: any, confidence: number, impact: number): BusinessAction[] {
    const actions: BusinessAction[] = [];
    
    actions.push({
      action: 'Research company needs',
      description: `Research ${contact.company}'s current challenges and initiatives`,
      priority: 'HIGH',
      effort: 3,
      timeline: 'immediate',
      requirements: ['Company research', 'Industry knowledge']
    });
    
    if (confidence > 0.6) {
      actions.push({
        action: 'Schedule discovery call',
        description: 'Schedule a call to understand their needs and explore opportunities',
        priority: 'HIGH',
        effort: 5,
        timeline: 'short-term',
        requirements: ['Value proposition prepared', 'Case studies ready']
      });
    }
    
    if (impact > 70) {
      actions.push({
        action: 'Prepare proposal',
        description: 'Develop a tailored proposal based on their specific needs',
        priority: 'MEDIUM',
        effort: 8,
        timeline: 'short-term',
        requirements: ['Needs assessment completed', 'Pricing strategy']
      });
    }
    
    return actions;
  }

  // Additional helper methods for other opportunity types...
  private assessComplementaryPotential(contact: any): number {
    // Simplified assessment - would be more sophisticated in practice
    const industry = contact.company?.toLowerCase() || '';
    const position = contact.position?.toLowerCase() || '';
    
    let score = 0.3; // Base score
    
    if (industry.includes('tech') && position.includes('sales')) score += 0.3;
    if (industry.includes('marketing') && position.includes('strategy')) score += 0.2;
    
    return Math.min(1, score);
  }

  private assessMarketOverlap(contact: any): number {
    // Simplified market overlap assessment
    return 0.6; // Default moderate overlap
  }

  private generatePartnershipActions(contact: any): BusinessAction[] {
    return [{
      action: 'Explore partnership potential',
      description: `Discuss potential partnership opportunities with ${contact.firstName}`,
      priority: 'MEDIUM',
      effort: 6,
      timeline: 'short-term',
      requirements: ['Partnership framework', 'Mutual value proposition']
    }];
  }

  private generatePartnershipReasoning(evidence: string[], complementarity: number, marketOverlap: number): string {
    return `Partnership opportunity: ${evidence.join(', ')}. Complementarity: ${Math.round(complementarity * 100)}%, Market overlap: ${Math.round(marketOverlap * 100)}%`;
  }

  private calculatePartnershipTimelineScore(contact: any): number {
    return 50; // Partnerships typically medium-term
  }

  private calculatePartnershipEffortScore(contact: any): number {
    return 70; // Partnerships require significant effort
  }

  private calculateOptimalPartnershipTiming(contact: any): Date {
    return new Date(); // Default to current timing
  }

  private identifyPartnershipCapabilities(contact: any): string[] {
    return ['market_access', 'expertise', 'resources', 'network'];
  }

  // Additional simplified implementations for other opportunity types...
  private assessVendorServiceAlignment(contact: any): number { return 0.5; }
  private identifyOurPotentialNeeds(): string[] { return ['services', 'tools', 'expertise']; }
  private identifyVendorCapabilities(contact: any): string[] { return ['service_delivery', 'expertise']; }
  private generateVendorActions(contact: any): BusinessAction[] { return []; }
  
  private isInvestorRole(position: string): boolean {
    const pos = position.toLowerCase();
    return pos.includes('investor') || pos.includes('venture') || pos.includes('capital') || pos.includes('fund');
  }
  
  private isInvestmentCompany(company: string): boolean {
    const comp = company.toLowerCase();
    return comp.includes('capital') || comp.includes('ventures') || comp.includes('partners') || comp.includes('fund');
  }
  
  private identifyInvestorStage(contact: any): string { return 'series_a'; }
  private assessInvestorIndustryFit(contact: any): boolean { return true; }
  private generateInvestmentActions(contact: any): BusinessAction[] { return []; }
  private estimateInvestmentValue(contact: any): number { return 1000000; }
  private calculateOptimalInvestmentTiming(): Date { return new Date(); }
  
  private canInfluenceHiring(position: string): boolean {
    const pos = position.toLowerCase();
    return pos.includes('hr') || pos.includes('hiring') || pos.includes('manager') || pos.includes('director') || pos.includes('ceo');
  }
  
  private assessCompanyGrowth(company: string): boolean { return true; }
  private assessRoleAlignmentForReferrals(contact: any): number { return 0.6; }
  private generateJobReferralActions(contact: any): BusinessAction[] { return []; }
  
  private assessExpertiseValue(contact: any): number { return 0.7; }
  private assessMutualExpertiseValue(contact: any): number { return 0.6; }
  private assessRoleComplementarity(position: string): boolean { return true; }
  private generateKnowledgeExchangeActions(contact: any): BusinessAction[] { return []; }
  
  private assessCollaborationFit(contact: any): number { return 0.7; }
  private assessProjectCollaborationPotential(contact: any): number { return 0.6; }
  private identifyCollaborationCapabilities(contact: any): string[] { return ['expertise', 'resources']; }
  private generateCollaborationActions(contact: any): BusinessAction[] { return []; }
}

export const businessOpportunityMatcher = new BusinessOpportunityMatcherService();