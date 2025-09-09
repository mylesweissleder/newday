
import OpenAI from 'openai';
import { logError, logPerformance } from '../utils/logger';

import prisma from "../utils/prisma";
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

interface ChatQuery {
  question: string;
  accountId: string;
  userId: string;
}

interface NetworkSearchCriteria {
  companies?: string[];
  positions?: string[];
  industries?: string[];
  tiers?: string[];
  locations?: string[];
  tags?: string[];
  relationshipTypes?: string[];
  intent: 'find_contacts' | 'find_introductions' | 'analyze_network' | 'get_insights' | 'find_opportunities';
  limit?: number;
}

interface ChatResponse {
  answer: string;
  contacts?: any[];
  insights?: any;
  suggestions?: string[];
  query_understood: boolean;
  search_criteria?: NetworkSearchCriteria;
}

export class NetworkChatService {
  
  async processNetworkQuery(query: ChatQuery): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      if (!openai) {
        return {
          answer: "AI features are currently unavailable. Please configure OpenAI API key.",
          query_understood: false
        };
      }

      // Step 1: Parse the natural language query to extract search criteria
      const searchCriteria = await this.parseQuery(query.question);
      
      // Step 2: Execute the search based on the parsed criteria
      const results = await this.executeNetworkSearch(searchCriteria, query.accountId);
      
      // Step 3: Generate a natural language response
      const response = await this.generateResponse(query.question, searchCriteria, results);
      
      logPerformance('network_chat_query', Date.now() - startTime, {
        userId: query.userId,
        intent: searchCriteria.intent,
        resultsCount: results.contacts?.length || 0
      });
      
      return response;
      
    } catch (error) {
      logError(error as Error, 'NetworkChatService.processNetworkQuery', {
        userId: query.userId,
        question: query.question
      });
      
      return {
        answer: "I encountered an error while processing your question. Please try rephrasing your query or contact support if the issue persists.",
        query_understood: false
      };
    }
  }

  private async parseQuery(question: string): Promise<NetworkSearchCriteria> {
    if (!openai) {
      throw new Error('OpenAI not configured');
    }

    const parsePrompt = `
Analyze this network query and extract structured search criteria. Return JSON only.

Query: "${question}"

Extract these elements:
- companies: array of company names mentioned
- positions: array of job titles/roles mentioned  
- industries: array of industries mentioned
- tiers: array of relationship tiers (TIER_1, TIER_2, TIER_3)
- locations: array of cities/regions mentioned
- tags: array of relevant tags or keywords
- relationshipTypes: array of relationship types (COLLEAGUE, FRIEND, MENTOR, CLIENT, etc.)
- intent: one of [find_contacts, find_introductions, analyze_network, get_insights, find_opportunities]
- limit: number of results wanted (default 10, max 50)

Examples:
"Who in my network works at Google?" -> {"companies":["Google"],"intent":"find_contacts","limit":10}
"Find me VCs in San Francisco" -> {"positions":["VC","venture capital","investor"],"locations":["San Francisco"],"intent":"find_contacts","limit":10}
"Who can introduce me to someone at Apple?" -> {"companies":["Apple"],"intent":"find_introductions","limit":10}
"What opportunities exist in my fintech connections?" -> {"industries":["fintech","financial technology"],"intent":"find_opportunities","limit":20}

Return only valid JSON:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: parsePrompt }],
      temperature: 0.1,
      max_tokens: 500
    });

    try {
      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return {
        companies: parsed.companies || [],
        positions: parsed.positions || [],
        industries: parsed.industries || [],
        tiers: parsed.tiers || [],
        locations: parsed.locations || [],
        tags: parsed.tags || [],
        relationshipTypes: parsed.relationshipTypes || [],
        intent: parsed.intent || 'find_contacts',
        limit: Math.min(parsed.limit || 10, 50)
      };
    } catch (error) {
      // Fallback parsing if JSON parsing fails
      return this.fallbackParseQuery(question);
    }
  }

  private fallbackParseQuery(question: string): NetworkSearchCriteria {
    const lowerQuestion = question.toLowerCase();
    const criteria: NetworkSearchCriteria = {
      companies: [],
      positions: [],
      industries: [],
      tiers: [],
      locations: [],
      tags: [],
      relationshipTypes: [],
      intent: 'find_contacts',
      limit: 10
    };

    // Extract companies
    const companyPatterns = [
      /\b(google|apple|microsoft|amazon|meta|facebook|netflix|tesla|uber|airbnb|spotify|slack|zoom|salesforce|oracle|ibm|intel|nvidia|amd|twitter|x corp|linkedin|stripe|square|paypal|visa|mastercard|jpmorgan|goldman sachs|morgan stanley|blackrock|vanguard|fidelity)\b/gi
    ];
    
    companyPatterns.forEach(pattern => {
      const matches = question.match(pattern);
      if (matches) {
        criteria.companies!.push(...matches.map(m => m.toLowerCase()));
      }
    });

    // Extract positions
    if (lowerQuestion.includes('vc') || lowerQuestion.includes('venture capital') || lowerQuestion.includes('investor')) {
      criteria.positions!.push('VC', 'venture capital', 'investor');
    }
    if (lowerQuestion.includes('ceo') || lowerQuestion.includes('founder') || lowerQuestion.includes('co-founder')) {
      criteria.positions!.push('CEO', 'founder', 'co-founder');
    }
    if (lowerQuestion.includes('engineer') || lowerQuestion.includes('developer')) {
      criteria.positions!.push('engineer', 'developer');
    }

    // Extract industries
    if (lowerQuestion.includes('fintech') || lowerQuestion.includes('financial')) {
      criteria.industries!.push('fintech', 'financial');
    }
    if (lowerQuestion.includes('tech') || lowerQuestion.includes('software')) {
      criteria.industries!.push('technology', 'software');
    }
    if (lowerQuestion.includes('healthcare') || lowerQuestion.includes('biotech')) {
      criteria.industries!.push('healthcare', 'biotech');
    }

    // Extract locations
    const locationPattern = /\b(san francisco|sf|new york|nyc|boston|seattle|austin|los angeles|la|chicago|miami|denver|atlanta|washington dc|london|paris|berlin|toronto|vancouver)\b/gi;
    const locationMatches = question.match(locationPattern);
    if (locationMatches) {
      criteria.locations!.push(...locationMatches);
    }

    // Determine intent
    if (lowerQuestion.includes('introduce') || lowerQuestion.includes('introduction')) {
      criteria.intent = 'find_introductions';
    } else if (lowerQuestion.includes('opportunit') || lowerQuestion.includes('chance')) {
      criteria.intent = 'find_opportunities';
    } else if (lowerQuestion.includes('insight') || lowerQuestion.includes('analyze')) {
      criteria.intent = 'analyze_network';
    }

    return criteria;
  }

  private async executeNetworkSearch(criteria: NetworkSearchCriteria, accountId: string) {
    const where: any = {
      accountId,
      status: 'ACTIVE'
    };

    // Build database query
    if (criteria.companies && criteria.companies.length > 0) {
      where.company = {
        in: criteria.companies,
        mode: 'insensitive'
      };
    }

    if (criteria.positions && criteria.positions.length > 0) {
      where.OR = criteria.positions.map(position => ({
        position: { contains: position, mode: 'insensitive' }
      }));
    }

    if (criteria.tiers && criteria.tiers.length > 0) {
      where.tier = { in: criteria.tiers };
    }

    if (criteria.locations && criteria.locations.length > 0) {
      where.OR = [
        ...(where.OR || []),
        ...criteria.locations.map(location => ({
          city: { contains: location, mode: 'insensitive' }
        })),
        ...criteria.locations.map(location => ({
          state: { contains: location, mode: 'insensitive' }
        }))
      ];
    }

    if (criteria.tags && criteria.tags.length > 0) {
      where.tags = { hasSome: criteria.tags };
    }

    // Execute the search
    const contacts = await prisma.contact.findMany({
      where,
      take: criteria.limit || 10,
      orderBy: [
        { tier: 'asc' },
        { updatedAt: 'desc' }
      ],
      include: {
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
        },
        _count: {
          select: {
            relationships: true,
            outreach: true
          }
        }
      }
    });

    // Get additional insights based on intent
    let insights = null;
    if (criteria.intent === 'analyze_network') {
      insights = await this.getNetworkInsights(contacts, accountId);
    } else if (criteria.intent === 'find_opportunities') {
      insights = await this.getOpportunityInsights(contacts, accountId);
    }

    return {
      contacts,
      insights,
      totalFound: contacts.length,
      searchCriteria: criteria
    };
  }

  private async generateResponse(question: string, criteria: NetworkSearchCriteria, results: any): Promise<ChatResponse> {
    if (!openai) {
      throw new Error('OpenAI not configured');
    }

    const responsePrompt = `
You are a helpful AI assistant for network relationship management. Answer the user's question about their professional network based on the search results.

User Question: "${question}"
Search Results: ${results.contacts.length} contacts found
Intent: ${criteria.intent}

Contact Results:
${results.contacts.slice(0, 5).map((contact: any, i: number) => 
  `${i + 1}. ${contact.firstName} ${contact.lastName} - ${contact.position || 'N/A'} at ${contact.company || 'N/A'} (${contact.tier || 'No tier'})`
).join('\n')}

${results.contacts.length > 5 ? `... and ${results.contacts.length - 5} more contacts` : ''}

Guidelines:
- Provide a helpful, conversational response
- Mention specific contact names and companies when relevant
- Suggest actionable next steps
- Keep response under 200 words
- Be friendly and professional

Response:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: responsePrompt }],
      temperature: 0.7,
      max_tokens: 300
    });

    const suggestions = this.generateSuggestions(criteria, results);

    return {
      answer: response.choices[0].message.content || "I found some contacts in your network, but couldn't generate a detailed response.",
      contacts: results.contacts,
      insights: results.insights,
      suggestions,
      query_understood: true,
      search_criteria: criteria
    };
  }

  private generateSuggestions(criteria: NetworkSearchCriteria, results: any): string[] {
    const suggestions = [];

    if (results.contacts.length === 0) {
      suggestions.push("Try broadening your search criteria");
      suggestions.push("Consider looking for similar roles or companies");
      suggestions.push("Check if you have any indirect connections through mutual contacts");
    } else {
      suggestions.push("Reach out to the most relevant contacts first");
      suggestions.push("Look for mutual connections that could provide introductions");
      suggestions.push("Consider the relationship tier when planning your approach");
      
      if (criteria.intent === 'find_introductions') {
        suggestions.push("Ask your strongest connections for warm introductions");
      }
    }

    return suggestions;
  }

  private async getNetworkInsights(contacts: any[], accountId: string) {
    const companies = [...new Set(contacts.map(c => c.company).filter(Boolean))];
    const positions = [...new Set(contacts.map(c => c.position).filter(Boolean))];
    const tierDistribution = contacts.reduce((acc, c) => {
      acc[c.tier || 'UNASSIGNED'] = (acc[c.tier || 'UNASSIGNED'] || 0) + 1;
      return acc;
    }, {});

    return {
      totalContacts: contacts.length,
      uniqueCompanies: companies.length,
      topCompanies: companies.slice(0, 5),
      commonPositions: positions.slice(0, 5),
      tierDistribution
    };
  }

  private async getOpportunityInsights(contacts: any[], accountId: string) {
    const highValueContacts = contacts.filter(c => c.tier === 'TIER_1' || c.tier === 'TIER_2');
    const recentlyActive = contacts.filter(c => 
      new Date(c.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    return {
      highValueContacts: highValueContacts.length,
      recentlyActive: recentlyActive.length,
      recommendedActions: [
        "Focus on Tier 1 and Tier 2 contacts for maximum impact",
        "Reconnect with contacts you haven't spoken to recently",
        "Look for mutual connections that could provide warm introductions"
      ]
    };
  }
}

export const networkChatService = new NetworkChatService();