
import { NetworkGapType, NetworkGapStatus, OpportunityCategory, OpportunityType, OpportunityPriority } from '@prisma/client';

import prisma from "../utils/prisma";

export interface NetworkGap {
  id?: string;
  gapType: NetworkGapType;
  title: string;
  description: string;
  importance: number; // 0-1
  targetCriteria: {
    industry?: string;
    role?: string;
    companySize?: string;
    location?: string;
    seniority?: string;
    functional?: string;
  };
  currentCoverage: number; // 0-1 how well this gap is covered
  analysisData: {
    totalContacts: number;
    currentCoverageCount: number;
    benchmarkCoverage: number;
    gapSize: number;
    priority: number;
  };
  suggestions: NetworkGapSuggestion[];
  potentialContacts: PotentialGapContact[];
}

export interface NetworkGapSuggestion {
  type: 'TARGET_ROLE' | 'TARGET_COMPANY' | 'TARGET_INDUSTRY' | 'TARGET_LOCATION' | 'LEVERAGE_EXISTING';
  title: string;
  description: string;
  actionableSteps: string[];
  estimatedEffort: number; // 1-10
  potentialImpact: number; // 1-10
}

export interface PotentialGapContact {
  id?: string;
  name?: string;
  company?: string;
  position?: string;
  location?: string;
  connectionPath?: string[];
  confidence: number; // 0-1
  source: 'EXISTING_NETWORK' | 'INDUSTRY_EVENTS' | 'LINKEDIN_SEARCH' | 'MUTUAL_CONNECTIONS' | 'COMPANY_RESEARCH';
}

export interface NetworkAnalysisResult {
  overallScore: number; // 0-100
  totalGaps: number;
  criticalGaps: number;
  networkHealth: {
    diversity: number;
    reach: number;
    influence: number;
    activity: number;
  };
  gaps: NetworkGap[];
  recommendations: string[];
}

export class NetworkGapAnalysisService {

  /**
   * Perform comprehensive network gap analysis for an account
   */
  async analyzeNetworkGaps(accountId: string): Promise<NetworkAnalysisResult> {
    const contacts = await this.getAccountContacts(accountId);
    const networkMetrics = this.calculateNetworkMetrics(contacts);
    
    const gaps: NetworkGap[] = [];
    
    // Analyze different types of network gaps
    gaps.push(...await this.analyzeIndustryGaps(contacts));
    gaps.push(...await this.analyzeRoleGaps(contacts));
    gaps.push(...await this.analyzeSeniorityGaps(contacts));
    gaps.push(...await this.analyzeGeographicGaps(contacts));
    gaps.push(...await this.analyzeFunctionalGaps(contacts));
    gaps.push(...await this.analyzeCompanySizeGaps(contacts));
    gaps.push(...await this.analyzeDiversityGaps(contacts));

    // Calculate gap priorities and filter
    const prioritizedGaps = this.prioritizeGaps(gaps);
    const criticalGaps = prioritizedGaps.filter(gap => gap.importance > 0.7).length;

    // Generate recommendations
    const recommendations = this.generateNetworkRecommendations(prioritizedGaps, networkMetrics);

    // Calculate overall network health score
    const overallScore = this.calculateOverallNetworkScore(networkMetrics, prioritizedGaps);

    return {
      overallScore,
      totalGaps: prioritizedGaps.length,
      criticalGaps,
      networkHealth: networkMetrics,
      gaps: prioritizedGaps,
      recommendations
    };
  }

  /**
   * Get all contacts for analysis
   */
  private async getAccountContacts(accountId: string): Promise<any[]> {
    return prisma.contact.findMany({
      where: {
        accountId,
        status: 'ACTIVE'
      },
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
                position: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Calculate basic network metrics
   */
  private calculateNetworkMetrics(contacts: any[]): {
    diversity: number;
    reach: number;
    influence: number;
    activity: number;
  } {
    const totalContacts = contacts.length;
    
    // Industry diversity
    const industries = new Set(contacts.map(c => c.company?.toLowerCase()).filter(Boolean));
    const industryDiversity = Math.min(1, industries.size / Math.max(1, totalContacts * 0.2));

    // Geographic diversity
    const locations = new Set(contacts.map(c => c.state || c.country).filter(Boolean));
    const geoDiversity = Math.min(1, locations.size / Math.max(1, totalContacts * 0.1));

    // Role diversity
    const roles = new Set(contacts.map(c => this.normalizeRole(c.position)).filter(Boolean));
    const roleDiversity = Math.min(1, roles.size / Math.max(1, totalContacts * 0.15));

    const diversity = (industryDiversity + geoDiversity + roleDiversity) / 3;

    // Network reach (based on total connections and mutual connections)
    const totalNetworkConnections = contacts.reduce((sum, c) => 
      sum + (c.networkAnalytics?.totalConnections || 0), 0);
    const reach = Math.min(1, totalNetworkConnections / (totalContacts * 100));

    // Influence (based on strategic value and priority scores)
    const avgStrategicValue = contacts.reduce((sum, c) => 
      sum + (c.strategicValue || 0), 0) / Math.max(1, totalContacts);
    const influence = avgStrategicValue / 100;

    // Activity (based on recent outreach and contact dates)
    const recentlyActive = contacts.filter(c => {
      const lastContact = c.lastContactDate;
      if (!lastContact) return false;
      const daysSince = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 90;
    }).length;
    const activity = recentlyActive / Math.max(1, totalContacts);

    return {
      diversity: Math.round(diversity * 100) / 100,
      reach: Math.round(reach * 100) / 100,
      influence: Math.round(influence * 100) / 100,
      activity: Math.round(activity * 100) / 100
    };
  }

  /**
   * Analyze industry gaps in the network
   */
  private async analyzeIndustryGaps(contacts: any[]): Promise<NetworkGap[]> {
    const gaps: NetworkGap[] = [];
    
    // Get industry distribution
    const industryMap = new Map<string, number>();
    contacts.forEach(contact => {
      if (contact.company) {
        const industry = this.normalizeIndustry(contact.company);
        industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
      }
    });

    // Key industries that should be represented
    const keyIndustries = [
      'technology', 'finance', 'healthcare', 'consulting', 'marketing',
      'education', 'manufacturing', 'retail', 'media', 'legal'
    ];

    const totalContacts = contacts.length;
    const expectedCoveragePerIndustry = Math.max(1, totalContacts * 0.05); // 5% minimum

    keyIndustries.forEach(industry => {
      const currentCount = industryMap.get(industry) || 0;
      const coverage = currentCount / expectedCoveragePerIndustry;
      
      if (coverage < 0.5) { // Less than 50% of expected coverage
        gaps.push({
          gapType: 'INDUSTRY_GAP',
          title: `${industry.charAt(0).toUpperCase() + industry.slice(1)} Industry Gap`,
          description: `Limited connections in the ${industry} industry. Current coverage: ${currentCount} contacts.`,
          importance: this.calculateIndustryImportance(industry),
          targetCriteria: { industry },
          currentCoverage: coverage,
          analysisData: {
            totalContacts,
            currentCoverageCount: currentCount,
            benchmarkCoverage: expectedCoveragePerIndustry,
            gapSize: Math.max(0, expectedCoveragePerIndustry - currentCount),
            priority: coverage < 0.2 ? 9 : (coverage < 0.4 ? 7 : 5)
          },
          suggestions: this.generateIndustryGapSuggestions(industry, currentCount),
          potentialContacts: []
        });
      }
    });

    return gaps;
  }

  /**
   * Analyze role/function gaps in the network
   */
  private async analyzeRoleGaps(contacts: any[]): Promise<NetworkGap[]> {
    const gaps: NetworkGap[] = [];
    
    const roleMap = new Map<string, number>();
    contacts.forEach(contact => {
      if (contact.position) {
        const role = this.normalizeRole(contact.position);
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      }
    });

    // Key roles that should be represented
    const keyRoles = [
      'ceo', 'cto', 'cfo', 'cmo', 'sales', 'marketing', 'engineering',
      'product', 'operations', 'finance', 'hr', 'business_development'
    ];

    const totalContacts = contacts.length;
    const expectedCoveragePerRole = Math.max(1, totalContacts * 0.03); // 3% minimum

    keyRoles.forEach(role => {
      const currentCount = roleMap.get(role) || 0;
      const coverage = currentCount / expectedCoveragePerRole;
      
      if (coverage < 0.6) {
        gaps.push({
          gapType: 'ROLE_GAP',
          title: `${role.toUpperCase()} Role Gap`,
          description: `Limited connections in ${role} roles. Current coverage: ${currentCount} contacts.`,
          importance: this.calculateRoleImportance(role),
          targetCriteria: { role },
          currentCoverage: coverage,
          analysisData: {
            totalContacts,
            currentCoverageCount: currentCount,
            benchmarkCoverage: expectedCoveragePerRole,
            gapSize: Math.max(0, expectedCoveragePerRole - currentCount),
            priority: coverage < 0.2 ? 8 : (coverage < 0.4 ? 6 : 4)
          },
          suggestions: this.generateRoleGapSuggestions(role, currentCount),
          potentialContacts: []
        });
      }
    });

    return gaps;
  }

  /**
   * Analyze seniority gaps in the network
   */
  private async analyzeSeniorityGaps(contacts: any[]): Promise<NetworkGap[]> {
    const gaps: NetworkGap[] = [];
    
    const seniorityMap = new Map<string, number>();
    contacts.forEach(contact => {
      if (contact.position) {
        const seniority = this.normalizeSeniority(contact.position);
        seniorityMap.set(seniority, (seniorityMap.get(seniority) || 0) + 1);
      }
    });

    const seniorityLevels = ['executive', 'senior', 'mid', 'junior'];
    const totalContacts = contacts.length;

    // Ideal distribution: 20% executive, 30% senior, 35% mid, 15% junior
    const idealDistribution = { executive: 0.2, senior: 0.3, mid: 0.35, junior: 0.15 };

    seniorityLevels.forEach(level => {
      const currentCount = seniorityMap.get(level) || 0;
      const currentRatio = currentCount / Math.max(1, totalContacts);
      const idealRatio = idealDistribution[level as keyof typeof idealDistribution];
      const coverage = currentRatio / idealRatio;
      
      if (coverage < 0.5) {
        gaps.push({
          gapType: 'SENIORITY_GAP',
          title: `${level.charAt(0).toUpperCase() + level.slice(1)} Level Gap`,
          description: `Underrepresented ${level}-level contacts. Current: ${Math.round(currentRatio * 100)}%, target: ${Math.round(idealRatio * 100)}%.`,
          importance: level === 'executive' ? 0.9 : (level === 'senior' ? 0.7 : 0.5),
          targetCriteria: { seniority: level },
          currentCoverage: coverage,
          analysisData: {
            totalContacts,
            currentCoverageCount: currentCount,
            benchmarkCoverage: Math.round(totalContacts * idealRatio),
            gapSize: Math.max(0, Math.round(totalContacts * idealRatio) - currentCount),
            priority: level === 'executive' ? 9 : 6
          },
          suggestions: this.generateSeniorityGapSuggestions(level, currentRatio, idealRatio),
          potentialContacts: []
        });
      }
    });

    return gaps;
  }

  /**
   * Analyze geographic gaps in the network
   */
  private async analyzeGeographicGaps(contacts: any[]): Promise<NetworkGap[]> {
    const gaps: NetworkGap[] = [];
    
    const locationMap = new Map<string, number>();
    const stateMap = new Map<string, number>();
    
    contacts.forEach(contact => {
      if (contact.city && contact.state) {
        const location = `${contact.city}, ${contact.state}`;
        locationMap.set(location, (locationMap.get(location) || 0) + 1);
        stateMap.set(contact.state, (stateMap.get(contact.state) || 0) + 1);
      }
    });

    // Key markets that should be represented
    const keyMarkets = [
      'New York, NY', 'Los Angeles, CA', 'San Francisco, CA', 'Chicago, IL',
      'Boston, MA', 'Austin, TX', 'Seattle, WA', 'Miami, FL'
    ];

    const totalContacts = contacts.length;
    const expectedMarketCoverage = Math.max(1, totalContacts * 0.05);

    keyMarkets.forEach(market => {
      const currentCount = locationMap.get(market) || 0;
      const coverage = currentCount / expectedMarketCoverage;
      
      if (coverage < 0.3) {
        gaps.push({
          gapType: 'GEOGRAPHIC_GAP',
          title: `${market} Market Gap`,
          description: `Limited presence in ${market} market. Current coverage: ${currentCount} contacts.`,
          importance: this.calculateLocationImportance(market),
          targetCriteria: { location: market },
          currentCoverage: coverage,
          analysisData: {
            totalContacts,
            currentCoverageCount: currentCount,
            benchmarkCoverage: expectedMarketCoverage,
            gapSize: Math.max(0, expectedMarketCoverage - currentCount),
            priority: 6
          },
          suggestions: this.generateLocationGapSuggestions(market, currentCount),
          potentialContacts: []
        });
      }
    });

    return gaps;
  }

  /**
   * Analyze functional gaps (departments/specializations)
   */
  private async analyzeFunctionalGaps(contacts: any[]): Promise<NetworkGap[]> {
    const gaps: NetworkGap[] = [];
    
    const functionMap = new Map<string, number>();
    contacts.forEach(contact => {
      if (contact.position) {
        const functions = this.extractFunctions(contact.position);
        functions.forEach(func => {
          functionMap.set(func, (functionMap.get(func) || 0) + 1);
        });
      }
    });

    const keyFunctions = [
      'sales', 'marketing', 'engineering', 'product', 'design', 'operations',
      'finance', 'legal', 'hr', 'strategy', 'consulting', 'research'
    ];

    const totalContacts = contacts.length;
    const expectedFunctionCoverage = Math.max(1, totalContacts * 0.04);

    keyFunctions.forEach(func => {
      const currentCount = functionMap.get(func) || 0;
      const coverage = currentCount / expectedFunctionCoverage;
      
      if (coverage < 0.4) {
        gaps.push({
          gapType: 'FUNCTIONAL_GAP',
          title: `${func.charAt(0).toUpperCase() + func.slice(1)} Function Gap`,
          description: `Limited connections in ${func} function. Current coverage: ${currentCount} contacts.`,
          importance: this.calculateFunctionImportance(func),
          targetCriteria: { functional: func },
          currentCoverage: coverage,
          analysisData: {
            totalContacts,
            currentCoverageCount: currentCount,
            benchmarkCoverage: expectedFunctionCoverage,
            gapSize: Math.max(0, expectedFunctionCoverage - currentCount),
            priority: 5
          },
          suggestions: this.generateFunctionGapSuggestions(func, currentCount),
          potentialContacts: []
        });
      }
    });

    return gaps;
  }

  /**
   * Analyze company size gaps
   */
  private async analyzeCompanySizeGaps(contacts: any[]): Promise<NetworkGap[]> {
    const gaps: NetworkGap[] = [];
    
    const sizeMap = new Map<string, number>();
    contacts.forEach(contact => {
      if (contact.company) {
        const size = this.estimateCompanySize(contact.company);
        sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
      }
    });

    const sizes = ['startup', 'small', 'medium', 'large', 'enterprise'];
    const totalContacts = contacts.length;
    
    // Ideal distribution: 15% startup, 20% small, 25% medium, 25% large, 15% enterprise
    const idealDistribution = { startup: 0.15, small: 0.2, medium: 0.25, large: 0.25, enterprise: 0.15 };

    sizes.forEach(size => {
      const currentCount = sizeMap.get(size) || 0;
      const currentRatio = currentCount / Math.max(1, totalContacts);
      const idealRatio = idealDistribution[size as keyof typeof idealDistribution];
      const coverage = currentRatio / idealRatio;
      
      if (coverage < 0.4) {
        gaps.push({
          gapType: 'COMPANY_SIZE_GAP',
          title: `${size.charAt(0).toUpperCase() + size.slice(1)} Company Gap`,
          description: `Limited representation from ${size} companies. Current: ${Math.round(currentRatio * 100)}%, target: ${Math.round(idealRatio * 100)}%.`,
          importance: size === 'enterprise' ? 0.8 : 0.6,
          targetCriteria: { companySize: size },
          currentCoverage: coverage,
          analysisData: {
            totalContacts,
            currentCoverageCount: currentCount,
            benchmarkCoverage: Math.round(totalContacts * idealRatio),
            gapSize: Math.max(0, Math.round(totalContacts * idealRatio) - currentCount),
            priority: size === 'enterprise' ? 7 : 5
          },
          suggestions: this.generateCompanySizeGapSuggestions(size, currentRatio, idealRatio),
          potentialContacts: []
        });
      }
    });

    return gaps;
  }

  /**
   * Analyze diversity gaps in the network
   */
  private async analyzeDiversityGaps(contacts: any[]): Promise<NetworkGap[]> {
    const gaps: NetworkGap[] = [];
    
    // This is a simplified analysis - in practice, you'd have more sophisticated diversity tracking
    const totalContacts = contacts.length;
    
    // Industry diversity
    const industries = new Set(contacts.map(c => this.normalizeIndustry(c.company || '')).filter(Boolean));
    const industryDiversityScore = industries.size / Math.max(1, totalContacts * 0.1);
    
    if (industryDiversityScore < 0.6) {
      gaps.push({
        gapType: 'DIVERSITY_GAP',
        title: 'Industry Diversity Gap',
        description: `Network lacks industry diversity. Currently represented in ${industries.size} industries.`,
        importance: 0.7,
        targetCriteria: {},
        currentCoverage: industryDiversityScore,
        analysisData: {
          totalContacts,
          currentCoverageCount: industries.size,
          benchmarkCoverage: Math.round(totalContacts * 0.1),
          gapSize: Math.max(0, Math.round(totalContacts * 0.1) - industries.size),
          priority: 6
        },
        suggestions: [{
          type: 'TARGET_INDUSTRY',
          title: 'Diversify Industry Connections',
          description: 'Actively seek connections across different industries to broaden network reach.',
          actionableSteps: [
            'Identify underrepresented industries',
            'Attend cross-industry events',
            'Join professional associations in new sectors'
          ],
          estimatedEffort: 6,
          potentialImpact: 8
        }],
        potentialContacts: []
      });
    }

    return gaps;
  }

  /**
   * Prioritize gaps based on importance and impact
   */
  private prioritizeGaps(gaps: NetworkGap[]): NetworkGap[] {
    return gaps
      .sort((a, b) => {
        const scoreA = a.importance * (1 - a.currentCoverage) * a.analysisData.priority;
        const scoreB = b.importance * (1 - b.currentCoverage) * b.analysisData.priority;
        return scoreB - scoreA;
      })
      .slice(0, 20); // Top 20 gaps
  }

  /**
   * Generate network recommendations based on gaps
   */
  private generateNetworkRecommendations(gaps: NetworkGap[], metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.diversity < 0.5) {
      recommendations.push('Focus on diversifying your network across industries and roles');
    }
    
    if (metrics.influence < 0.6) {
      recommendations.push('Target higher-level executives and industry influencers');
    }
    
    if (metrics.activity < 0.4) {
      recommendations.push('Increase networking activity and contact frequency');
    }
    
    const topGaps = gaps.slice(0, 3);
    topGaps.forEach(gap => {
      recommendations.push(`Address ${gap.title.toLowerCase()} to improve network coverage`);
    });
    
    return recommendations.slice(0, 5);
  }

  /**
   * Calculate overall network health score
   */
  private calculateOverallNetworkScore(metrics: any, gaps: NetworkGap[]): number {
    const metricsScore = (metrics.diversity + metrics.reach + metrics.influence + metrics.activity) / 4;
    const gapPenalty = Math.min(0.3, gaps.length * 0.02); // Max 30% penalty
    return Math.round((metricsScore - gapPenalty) * 100);
  }

  /**
   * Helper methods for normalization and analysis
   */
  private normalizeIndustry(company: string): string {
    const industry = company.toLowerCase();
    if (industry.includes('tech') || industry.includes('software')) return 'technology';
    if (industry.includes('finance') || industry.includes('bank')) return 'finance';
    if (industry.includes('health') || industry.includes('medical')) return 'healthcare';
    if (industry.includes('consult')) return 'consulting';
    if (industry.includes('market') || industry.includes('advertis')) return 'marketing';
    if (industry.includes('educat') || industry.includes('school')) return 'education';
    if (industry.includes('retail') || industry.includes('store')) return 'retail';
    if (industry.includes('manufactur')) return 'manufacturing';
    if (industry.includes('media') || industry.includes('news')) return 'media';
    if (industry.includes('legal') || industry.includes('law')) return 'legal';
    return 'other';
  }

  private normalizeRole(position: string): string {
    const role = position.toLowerCase();
    if (role.includes('ceo') || role.includes('chief executive')) return 'ceo';
    if (role.includes('cto') || role.includes('chief technology')) return 'cto';
    if (role.includes('cfo') || role.includes('chief financial')) return 'cfo';
    if (role.includes('cmo') || role.includes('chief marketing')) return 'cmo';
    if (role.includes('sales')) return 'sales';
    if (role.includes('marketing')) return 'marketing';
    if (role.includes('engineer')) return 'engineering';
    if (role.includes('product')) return 'product';
    if (role.includes('operations')) return 'operations';
    if (role.includes('finance')) return 'finance';
    if (role.includes('hr') || role.includes('human resources')) return 'hr';
    if (role.includes('business development')) return 'business_development';
    return 'other';
  }

  private normalizeSeniority(position: string): string {
    const pos = position.toLowerCase();
    if (pos.includes('ceo') || pos.includes('president') || pos.includes('founder') || pos.includes('chief')) return 'executive';
    if (pos.includes('vp') || pos.includes('vice president') || pos.includes('director') || pos.includes('head')) return 'senior';
    if (pos.includes('manager') || pos.includes('lead') || pos.includes('principal') || pos.includes('senior')) return 'mid';
    if (pos.includes('junior') || pos.includes('associate') || pos.includes('intern')) return 'junior';
    return 'mid';
  }

  private extractFunctions(position: string): string[] {
    const pos = position.toLowerCase();
    const functions: string[] = [];
    
    const functionKeywords = {
      'sales': ['sales', 'account manager', 'business development'],
      'marketing': ['marketing', 'brand', 'communications'],
      'engineering': ['engineer', 'developer', 'architect'],
      'product': ['product', 'pm'],
      'design': ['design', 'ux', 'ui'],
      'operations': ['operations', 'ops'],
      'finance': ['finance', 'accounting', 'controller'],
      'legal': ['legal', 'counsel', 'attorney'],
      'hr': ['hr', 'human resources', 'people'],
      'strategy': ['strategy', 'strategic'],
      'consulting': ['consultant', 'consulting'],
      'research': ['research', 'analyst']
    };
    
    Object.entries(functionKeywords).forEach(([func, keywords]) => {
      if (keywords.some(keyword => pos.includes(keyword))) {
        functions.push(func);
      }
    });
    
    return functions.length > 0 ? functions : ['general'];
  }

  private estimateCompanySize(company: string): string {
    // This is a simplified implementation - in practice, you'd use external APIs
    const comp = company.toLowerCase();
    const largeCompanies = ['microsoft', 'google', 'apple', 'amazon', 'facebook', 'meta'];
    const mediumIndicators = ['inc', 'corp', 'corporation'];
    
    if (largeCompanies.some(large => comp.includes(large))) return 'enterprise';
    if (comp.includes('startup')) return 'startup';
    if (mediumIndicators.some(indicator => comp.includes(indicator))) return 'medium';
    return 'small';
  }

  /**
   * Importance calculation methods
   */
  private calculateIndustryImportance(industry: string): number {
    const importance = {
      'technology': 0.9,
      'finance': 0.8,
      'healthcare': 0.7,
      'consulting': 0.8,
      'marketing': 0.6,
      'education': 0.5,
      'manufacturing': 0.6,
      'retail': 0.5,
      'media': 0.6,
      'legal': 0.7
    };
    return importance[industry as keyof typeof importance] || 0.5;
  }

  private calculateRoleImportance(role: string): number {
    const importance = {
      'ceo': 1.0,
      'cto': 0.9,
      'cfo': 0.8,
      'cmo': 0.8,
      'sales': 0.8,
      'marketing': 0.7,
      'engineering': 0.7,
      'product': 0.8,
      'operations': 0.6,
      'finance': 0.6,
      'hr': 0.5,
      'business_development': 0.8
    };
    return importance[role as keyof typeof importance] || 0.5;
  }

  private calculateLocationImportance(location: string): number {
    const importance = {
      'New York, NY': 1.0,
      'San Francisco, CA': 0.9,
      'Los Angeles, CA': 0.8,
      'Chicago, IL': 0.7,
      'Boston, MA': 0.8,
      'Austin, TX': 0.7,
      'Seattle, WA': 0.8,
      'Miami, FL': 0.6
    };
    return importance[location as keyof typeof importance] || 0.5;
  }

  private calculateFunctionImportance(func: string): number {
    const importance = {
      'sales': 0.9,
      'marketing': 0.8,
      'engineering': 0.8,
      'product': 0.9,
      'design': 0.6,
      'operations': 0.7,
      'finance': 0.7,
      'legal': 0.6,
      'hr': 0.5,
      'strategy': 0.8,
      'consulting': 0.7,
      'research': 0.6
    };
    return importance[func as keyof typeof importance] || 0.5;
  }

  /**
   * Suggestion generation methods
   */
  private generateIndustryGapSuggestions(industry: string, currentCount: number): NetworkGapSuggestion[] {
    return [{
      type: 'TARGET_INDUSTRY',
      title: `Target ${industry} professionals`,
      description: `Actively network within the ${industry} industry to fill this gap.`,
      actionableSteps: [
        `Join ${industry} professional associations`,
        `Attend ${industry}-specific events and conferences`,
        `Connect with ${industry} thought leaders on LinkedIn`
      ],
      estimatedEffort: 6,
      potentialImpact: 8
    }];
  }

  private generateRoleGapSuggestions(role: string, currentCount: number): NetworkGapSuggestion[] {
    return [{
      type: 'TARGET_ROLE',
      title: `Connect with ${role} professionals`,
      description: `Build relationships with ${role} professionals across industries.`,
      actionableSteps: [
        `Search for ${role} professionals in your target companies`,
        `Attend ${role}-focused meetups and events`,
        `Engage with ${role} content on professional networks`
      ],
      estimatedEffort: 5,
      potentialImpact: 7
    }];
  }

  private generateSeniorityGapSuggestions(level: string, current: number, ideal: number): NetworkGapSuggestion[] {
    return [{
      type: 'TARGET_ROLE',
      title: `Increase ${level}-level connections`,
      description: `Focus on building relationships with ${level}-level professionals.`,
      actionableSteps: [
        `Identify ${level}-level targets in key companies`,
        `Attend executive or ${level}-focused events`,
        `Seek introductions through existing network`
      ],
      estimatedEffort: level === 'executive' ? 8 : 6,
      potentialImpact: level === 'executive' ? 9 : 7
    }];
  }

  private generateLocationGapSuggestions(location: string, currentCount: number): NetworkGapSuggestion[] {
    return [{
      type: 'TARGET_LOCATION',
      title: `Build presence in ${location}`,
      description: `Establish connections in the ${location} market.`,
      actionableSteps: [
        `Join ${location} professional groups`,
        `Attend events when visiting ${location}`,
        `Connect with ${location}-based professionals in your industry`
      ],
      estimatedEffort: 7,
      potentialImpact: 6
    }];
  }

  private generateFunctionGapSuggestions(func: string, currentCount: number): NetworkGapSuggestion[] {
    return [{
      type: 'TARGET_ROLE',
      title: `Connect with ${func} professionals`,
      description: `Build relationships with ${func} experts and practitioners.`,
      actionableSteps: [
        `Join ${func} professional communities`,
        `Attend ${func}-focused conferences`,
        `Engage with ${func} thought leadership content`
      ],
      estimatedEffort: 5,
      potentialImpact: 6
    }];
  }

  private generateCompanySizeGapSuggestions(size: string, current: number, ideal: number): NetworkGapSuggestion[] {
    return [{
      type: 'TARGET_COMPANY',
      title: `Target ${size} companies`,
      description: `Build relationships within ${size} companies to balance your network.`,
      actionableSteps: [
        `Research key ${size} companies in your industry`,
        `Attend ${size} company events and meetups`,
        `Connect with professionals from ${size} companies`
      ],
      estimatedEffort: 6,
      potentialImpact: 7
    }];
  }
}

export const networkGapAnalysis = new NetworkGapAnalysisService();