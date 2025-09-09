
import { OpportunityStatus, OpportunityActionResult } from '@prisma/client';

import prisma from "../utils/prisma";

export interface OpportunitySuccessMetrics {
  totalOpportunities: number;
  acceptanceRate: number; // % of opportunities accepted by users
  completionRate: number; // % of accepted opportunities completed successfully
  averageTimeToAction: number; // Average days from suggestion to first action
  averageTimeToCompletion: number; // Average days from acceptance to completion
  successRateByCategory: Record<string, number>;
  successRateByType: Record<string, number>;
  successRateByPriority: Record<string, number>;
  confidenceAccuracy: number; // How often high-confidence suggestions succeed
  impactAccuracy: number; // Correlation between predicted and actual impact
  userEngagementScore: number; // How actively users engage with suggestions
}

export interface OpportunityFeedback {
  id?: string;
  opportunityId: string;
  userId: string;
  rating: number; // 1-5 stars
  actualOutcome: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'NO_RESULT' | 'NEGATIVE';
  actualImpact: number; // 1-100, actual impact experienced
  timeInvested: number; // Hours spent on this opportunity
  feedback: string; // Open text feedback
  suggestions: string[]; // How to improve similar suggestions
  wouldRecommend: boolean;
  createdAt?: Date;
}

export interface OpportunityLearning {
  category: string;
  type: string;
  successFactors: string[];
  failureFactors: string[];
  optimalConfidenceRange: { min: number; max: number };
  optimalImpactRange: { min: number; max: number };
  bestTimingPatterns: string[];
  userPreferences: {
    preferredActions: string[];
    preferredTimelines: string[];
    preferredContactTypes: string[];
  };
}

export class OpportunitySuccessTrackingService {

  /**
   * Record feedback for a completed opportunity
   */
  async recordOpportunityFeedback(feedback: OpportunityFeedback): Promise<void> {
    try {
      // In a real implementation, save to opportunity_feedback table
      console.log('Recording opportunity feedback:', {
        opportunityId: feedback.opportunityId,
        rating: feedback.rating,
        outcome: feedback.actualOutcome,
        impact: feedback.actualImpact
      });

      // Update opportunity with actual results
      await prisma.opportunitySuggestion.update({
        where: { id: feedback.opportunityId },
        data: {
          metadata: {
            actualOutcome: feedback.actualOutcome,
            actualImpact: feedback.actualImpact,
            userRating: feedback.rating,
            timeInvested: feedback.timeInvested,
            feedback: feedback.feedback
          }
        }
      });

      // Learn from this feedback to improve future suggestions
      await this.updateLearningModel(feedback);

    } catch (error) {
      console.error('Error recording opportunity feedback:', error);
    }
  }

  /**
   * Calculate comprehensive success metrics for an account
   */
  async calculateSuccessMetrics(accountId: string, timeRange: number = 90): Promise<OpportunitySuccessMetrics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Get all opportunities in the time range
      const opportunities = await prisma.opportunitySuggestion.findMany({
        where: {
          accountId,
          createdAt: { gte: startDate }
        },
        include: {
          actions: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      const totalOpportunities = opportunities.length;
      if (totalOpportunities === 0) {
        return this.getEmptyMetrics();
      }

      // Calculate basic rates
      const acceptedOpportunities = opportunities.filter(op => 
        ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(op.status)
      );
      const completedOpportunities = opportunities.filter(op => op.status === 'COMPLETED');

      const acceptanceRate = (acceptedOpportunities.length / totalOpportunities) * 100;
      const completionRate = acceptedOpportunities.length > 0 
        ? (completedOpportunities.length / acceptedOpportunities.length) * 100 
        : 0;

      // Calculate timing metrics
      const timeToActionData = this.calculateTimeToAction(opportunities);
      const timeToCompletionData = this.calculateTimeToCompletion(opportunities);

      // Calculate success rates by category
      const successRateByCategory = this.calculateSuccessRateByAttribute(opportunities, 'category');
      const successRateByType = this.calculateSuccessRateByAttribute(opportunities, 'type');
      const successRateByPriority = this.calculateSuccessRateByAttribute(opportunities, 'priority');

      // Calculate accuracy metrics
      const confidenceAccuracy = this.calculateConfidenceAccuracy(opportunities);
      const impactAccuracy = this.calculateImpactAccuracy(opportunities);
      const userEngagementScore = this.calculateUserEngagementScore(opportunities);

      return {
        totalOpportunities,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        averageTimeToAction: timeToActionData.average,
        averageTimeToCompletion: timeToCompletionData.average,
        successRateByCategory,
        successRateByType,
        successRateByPriority,
        confidenceAccuracy,
        impactAccuracy,
        userEngagementScore
      };

    } catch (error) {
      console.error('Error calculating success metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Generate learning insights from historical data
   */
  async generateLearningInsights(accountId: string): Promise<OpportunityLearning[]> {
    try {
      const completedOpportunities = await prisma.opportunitySuggestion.findMany({
        where: {
          accountId,
          status: 'COMPLETED'
        },
        include: {
          actions: true
        }
      });

      const learnings: OpportunityLearning[] = [];
      
      // Group by category and type
      const categories = [...new Set(completedOpportunities.map(op => op.category))];
      
      for (const category of categories) {
        const categoryOpportunities = completedOpportunities.filter(op => op.category === category);
        const types = [...new Set(categoryOpportunities.map(op => op.type))];
        
        for (const type of types) {
          const typeOpportunities = categoryOpportunities.filter(op => op.type === type);
          
          if (typeOpportunities.length < 3) continue; // Need at least 3 samples for learning
          
          const learning = await this.analyzeLearningForType(category, type, typeOpportunities);
          learnings.push(learning);
        }
      }

      return learnings;

    } catch (error) {
      console.error('Error generating learning insights:', error);
      return [];
    }
  }

  /**
   * Get recommendations for improving opportunity suggestions
   */
  async getImprovementRecommendations(accountId: string): Promise<string[]> {
    try {
      const metrics = await this.calculateSuccessMetrics(accountId);
      const recommendations: string[] = [];

      // Analyze acceptance rate
      if (metrics.acceptanceRate < 30) {
        recommendations.push('Consider raising confidence threshold - low acceptance rate suggests suggestions may not be relevant enough');
      }
      if (metrics.acceptanceRate > 80) {
        recommendations.push('Consider lowering confidence threshold - high acceptance rate suggests you might be missing opportunities');
      }

      // Analyze completion rate
      if (metrics.completionRate < 50) {
        recommendations.push('Focus on actionability - many accepted opportunities are not being completed');
        recommendations.push('Consider breaking down complex opportunities into smaller, more manageable actions');
      }

      // Analyze timing
      if (metrics.averageTimeToAction > 7) {
        recommendations.push('Improve urgency indicators - users are taking too long to act on suggestions');
      }

      // Analyze category performance
      const bestCategory = Object.entries(metrics.successRateByCategory)
        .sort(([,a], [,b]) => b - a)[0];
      const worstCategory = Object.entries(metrics.successRateByCategory)
        .sort(([,a], [,b]) => a - b)[0];

      if (bestCategory && worstCategory && bestCategory[1] - worstCategory[1] > 20) {
        recommendations.push(`Focus more on ${bestCategory[0]} opportunities - they have a ${Math.round(bestCategory[1])}% success rate`);
        recommendations.push(`Improve ${worstCategory[0]} opportunity detection - currently only ${Math.round(worstCategory[1])}% success rate`);
      }

      // Analyze confidence accuracy
      if (metrics.confidenceAccuracy < 0.7) {
        recommendations.push('Recalibrate confidence scoring model - predictions are not accurate enough');
      }

      // Analyze user engagement
      if (metrics.userEngagementScore < 50) {
        recommendations.push('Improve user experience - low engagement with opportunity suggestions');
        recommendations.push('Consider adding more context or explanation to help users understand opportunity value');
      }

      return recommendations.slice(0, 10); // Top 10 recommendations

    } catch (error) {
      console.error('Error generating improvement recommendations:', error);
      return [];
    }
  }

  /**
   * Update machine learning model based on feedback
   */
  private async updateLearningModel(feedback: OpportunityFeedback): Promise<void> {
    try {
      // Get the original opportunity
      const opportunity = await prisma.opportunitySuggestion.findUnique({
        where: { id: feedback.opportunityId }
      });

      if (!opportunity) return;

      // Extract learning signals
      const learningSignal = {
        category: opportunity.category,
        type: opportunity.type,
        originalConfidence: opportunity.confidenceScore,
        originalImpact: opportunity.impactScore,
        actualOutcome: feedback.actualOutcome,
        actualImpact: feedback.actualImpact,
        userRating: feedback.rating,
        success: feedback.rating >= 4 && 
                feedback.actualOutcome === 'SUCCESS' && 
                feedback.actualImpact >= opportunity.impactScore * 0.8
      };

      // In a real implementation, this would update ML model weights
      console.log('Learning signal generated:', learningSignal);

      // Store learning for future analysis
      // TODO: Implement learning data storage and model updates

    } catch (error) {
      console.error('Error updating learning model:', error);
    }
  }

  /**
   * Helper methods for calculations
   */
  private calculateTimeToAction(opportunities: any[]): { average: number; median: number } {
    const timesToAction = opportunities
      .filter(op => op.actedAt && op.createdAt)
      .map(op => (op.actedAt.getTime() - op.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (timesToAction.length === 0) return { average: 0, median: 0 };

    const average = timesToAction.reduce((sum, time) => sum + time, 0) / timesToAction.length;
    const sorted = timesToAction.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return { average: Math.round(average * 10) / 10, median: Math.round(median * 10) / 10 };
  }

  private calculateTimeToCompletion(opportunities: any[]): { average: number; median: number } {
    const timesToCompletion = opportunities
      .filter(op => op.status === 'COMPLETED' && op.actedAt && op.updatedAt)
      .map(op => (op.updatedAt.getTime() - op.actedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (timesToCompletion.length === 0) return { average: 0, median: 0 };

    const average = timesToCompletion.reduce((sum, time) => sum + time, 0) / timesToCompletion.length;
    const sorted = timesToCompletion.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return { average: Math.round(average * 10) / 10, median: Math.round(median * 10) / 10 };
  }

  private calculateSuccessRateByAttribute(opportunities: any[], attribute: string): Record<string, number> {
    const groups = opportunities.reduce((acc, op) => {
      const key = op[attribute];
      if (!acc[key]) acc[key] = { total: 0, successful: 0 };
      acc[key].total++;
      
      if (op.status === 'COMPLETED') {
        // Additional success criteria based on metadata
        const actualOutcome = op.metadata?.actualOutcome;
        const userRating = op.metadata?.userRating;
        
        if (actualOutcome === 'SUCCESS' || userRating >= 4) {
          acc[key].successful++;
        }
      }
      
      return acc;
    }, {});

    const result: Record<string, number> = {};
    Object.entries(groups).forEach(([key, data]: [string, any]) => {
      result[key] = data.total > 0 ? Math.round((data.successful / data.total) * 100) : 0;
    });

    return result;
  }

  private calculateConfidenceAccuracy(opportunities: any[]): number {
    const completedOps = opportunities.filter(op => 
      op.status === 'COMPLETED' && op.metadata?.actualOutcome
    );

    if (completedOps.length === 0) return 0;

    let accurate = 0;
    for (const op of completedOps) {
      const predictedSuccess = op.confidenceScore > 0.7;
      const actualSuccess = op.metadata.actualOutcome === 'SUCCESS' && 
                           (op.metadata.userRating || 3) >= 4;
      
      if (predictedSuccess === actualSuccess) {
        accurate++;
      }
    }

    return Math.round((accurate / completedOps.length) * 100);
  }

  private calculateImpactAccuracy(opportunities: any[]): number {
    const completedOps = opportunities.filter(op => 
      op.status === 'COMPLETED' && 
      op.metadata?.actualImpact &&
      op.impactScore
    );

    if (completedOps.length === 0) return 0;

    let totalError = 0;
    for (const op of completedOps) {
      const predictedImpact = op.impactScore;
      const actualImpact = op.metadata.actualImpact;
      const error = Math.abs(predictedImpact - actualImpact) / predictedImpact;
      totalError += error;
    }

    const averageError = totalError / completedOps.length;
    return Math.round((1 - averageError) * 100);
  }

  private calculateUserEngagementScore(opportunities: any[]): number {
    if (opportunities.length === 0) return 0;

    const engagementFactors = {
      viewRate: opportunities.filter(op => ['VIEWED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(op.status)).length / opportunities.length,
      acceptanceRate: opportunities.filter(op => ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(op.status)).length / opportunities.length,
      actionTakenRate: opportunities.filter(op => op.actions && op.actions.length > 0).length / opportunities.length,
      quickActionRate: opportunities.filter(op => {
        if (!op.actedAt || !op.createdAt) return false;
        const daysDiff = (op.actedAt.getTime() - op.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 3;
      }).length / opportunities.length
    };

    const score = (
      engagementFactors.viewRate * 0.2 +
      engagementFactors.acceptanceRate * 0.3 +
      engagementFactors.actionTakenRate * 0.3 +
      engagementFactors.quickActionRate * 0.2
    ) * 100;

    return Math.round(score);
  }

  private async analyzeLearningForType(category: string, type: string, opportunities: any[]): Promise<OpportunityLearning> {
    const successfulOps = opportunities.filter(op => 
      op.metadata?.actualOutcome === 'SUCCESS' || op.metadata?.userRating >= 4
    );
    const failedOps = opportunities.filter(op => 
      op.metadata?.actualOutcome === 'NO_RESULT' || op.metadata?.userRating < 3
    );

    // Analyze confidence ranges
    const successfulConfidences = successfulOps.map(op => op.confidenceScore);
    const optimalConfidenceRange = successfulConfidences.length > 0 ? {
      min: Math.min(...successfulConfidences),
      max: Math.max(...successfulConfidences)
    } : { min: 0, max: 1 };

    // Analyze impact ranges
    const successfulImpacts = successfulOps.map(op => op.impactScore);
    const optimalImpactRange = successfulImpacts.length > 0 ? {
      min: Math.min(...successfulImpacts),
      max: Math.max(...successfulImpacts)
    } : { min: 0, max: 100 };

    return {
      category,
      type,
      successFactors: this.extractSuccessFactors(successfulOps),
      failureFactors: this.extractFailureFactors(failedOps),
      optimalConfidenceRange,
      optimalImpactRange,
      bestTimingPatterns: this.extractTimingPatterns(successfulOps),
      userPreferences: {
        preferredActions: this.extractPreferredActions(successfulOps),
        preferredTimelines: this.extractPreferredTimelines(successfulOps),
        preferredContactTypes: this.extractPreferredContactTypes(successfulOps)
      }
    };
  }

  private extractSuccessFactors(opportunities: any[]): string[] {
    // Simplified success factor extraction
    const factors: string[] = [];
    
    if (opportunities.length === 0) return factors;

    const avgConfidence = opportunities.reduce((sum, op) => sum + op.confidenceScore, 0) / opportunities.length;
    if (avgConfidence > 0.8) factors.push('High confidence threshold');
    
    const urgentCount = opportunities.filter(op => op.priority === 'URGENT').length;
    if (urgentCount / opportunities.length > 0.5) factors.push('Urgent priority');
    
    return factors;
  }

  private extractFailureFactors(opportunities: any[]): string[] {
    const factors: string[] = [];
    
    if (opportunities.length === 0) return factors;

    const avgConfidence = opportunities.reduce((sum, op) => sum + op.confidenceScore, 0) / opportunities.length;
    if (avgConfidence < 0.4) factors.push('Low confidence threshold');
    
    const lowPriorityCount = opportunities.filter(op => op.priority === 'LOW').length;
    if (lowPriorityCount / opportunities.length > 0.5) factors.push('Low priority');
    
    return factors;
  }

  private extractTimingPatterns(opportunities: any[]): string[] {
    return ['Weekdays preferred', 'Morning hours optimal'];
  }

  private extractPreferredActions(opportunities: any[]): string[] {
    return ['Email outreach', 'LinkedIn message', 'Introduction request'];
  }

  private extractPreferredTimelines(opportunities: any[]): string[] {
    return ['Immediate action', 'Short-term follow-up'];
  }

  private extractPreferredContactTypes(opportunities: any[]): string[] {
    return ['Colleagues', 'Industry contacts', 'Mutual connections'];
  }

  private getEmptyMetrics(): OpportunitySuccessMetrics {
    return {
      totalOpportunities: 0,
      acceptanceRate: 0,
      completionRate: 0,
      averageTimeToAction: 0,
      averageTimeToCompletion: 0,
      successRateByCategory: {},
      successRateByType: {},
      successRateByPriority: {},
      confidenceAccuracy: 0,
      impactAccuracy: 0,
      userEngagementScore: 0
    };
  }
}

export const opportunitySuccessTracking = new OpportunitySuccessTrackingService();