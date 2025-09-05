import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ContactInsight {
  personality: {
    traits: string[];
    communication_style: string;
    likely_interests: string[];
  };
  outreach_suggestions: {
    best_approach: string;
    conversation_starters: string[];
    timing_recommendations: string;
  };
  network_value: {
    score: number;
    reasoning: string;
    potential_connections: string[];
  };
}

export interface NetworkAnalysis {
  clusters: {
    name: string;
    members: string[];
    strength: number;
    opportunities: string[];
  }[];
  key_connectors: {
    name: string;
    contact_id: string;
    influence_score: number;
    connection_count: number;
  }[];
  recommendations: {
    type: 'introduction' | 'outreach' | 'collaboration';
    priority: 'high' | 'medium' | 'low';
    description: string;
    contacts: string[];
  }[];
}

export class AIService {
  async analyzeContact(contact: any): Promise<ContactInsight> {
    try {
      const prompt = `Analyze this professional contact and provide insights for networking:

Contact Information:
- Name: ${contact.firstName} ${contact.lastName}
- Company: ${contact.company || 'Unknown'}
- Position: ${contact.position || 'Unknown'}
- Industry: ${this.inferIndustry(contact.company)}
- LinkedIn: ${contact.linkedinUrl ? 'Available' : 'Not available'}
- Connection Source: ${contact.source || 'Unknown'}
- Tags: ${contact.tags?.join(', ') || 'None'}

Please provide a JSON response with the following structure:
{
  "personality": {
    "traits": ["trait1", "trait2"],
    "communication_style": "description",
    "likely_interests": ["interest1", "interest2"]
  },
  "outreach_suggestions": {
    "best_approach": "approach description",
    "conversation_starters": ["starter1", "starter2"],
    "timing_recommendations": "timing advice"
  },
  "network_value": {
    "score": 0-100,
    "reasoning": "explanation",
    "potential_connections": ["connection type1", "connection type2"]
  }
}

Base your analysis on their role, company, and any available information. Be professional and practical.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('AI contact analysis error:', error);
      throw new Error('Failed to analyze contact with AI');
    }
  }

  async analyzeNetwork(contacts: any[]): Promise<NetworkAnalysis> {
    try {
      // Prepare contact data for analysis
      const contactSummary = contacts.slice(0, 50).map(contact => ({
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        industry: this.inferIndustry(contact.company),
        tier: contact.tier,
        tags: contact.tags
      }));

      const prompt = `Analyze this professional network and identify opportunities:

Network Overview:
${JSON.stringify(contactSummary, null, 2)}

Please provide a JSON response with the following structure:
{
  "clusters": [
    {
      "name": "cluster name",
      "members": ["contact names"],
      "strength": 0-100,
      "opportunities": ["opportunity1", "opportunity2"]
    }
  ],
  "key_connectors": [
    {
      "name": "contact name",
      "contact_id": "id",
      "influence_score": 0-100,
      "connection_count": number
    }
  ],
  "recommendations": [
    {
      "type": "introduction|outreach|collaboration",
      "priority": "high|medium|low",
      "description": "description",
      "contacts": ["contact names"]
    }
  ]
}

Focus on identifying industry clusters, potential collaboration opportunities, and strategic connections.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('AI network analysis error:', error);
      throw new Error('Failed to analyze network with AI');
    }
  }

  async generateOutreachMessage(contact: any, context: string, tone: 'professional' | 'casual' | 'warm'): Promise<string> {
    try {
      const prompt = `Generate a personalized outreach message for this contact:

Contact: ${contact.firstName} ${contact.lastName}
Company: ${contact.company}
Position: ${contact.position}
Context: ${context}
Tone: ${tone}

Requirements:
- Keep it under 150 words
- Be authentic and specific
- Include a clear call to action
- Reference their background naturally
- ${tone === 'warm' ? 'Use a friendly, approachable tone' : tone === 'casual' ? 'Use a relaxed, conversational tone' : 'Use a professional business tone'}

Return only the message text, no additional formatting.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 300
      });

      return response.choices[0].message.content || 'Failed to generate message';
    } catch (error) {
      console.error('AI message generation error:', error);
      throw new Error('Failed to generate outreach message');
    }
  }

  async findSimilarContacts(contact: any, allContacts: any[]): Promise<any[]> {
    try {
      // Simple similarity matching based on company, position, and tags
      const similar = allContacts
        .filter(c => c.id !== contact.id)
        .map(c => ({
          contact: c,
          score: this.calculateSimilarity(contact, c)
        }))
        .filter(item => item.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(item => ({ ...item.contact, similarityScore: item.score }));

      return similar;
    } catch (error) {
      console.error('Find similar contacts error:', error);
      return [];
    }
  }

  private inferIndustry(company: string): string {
    if (!company) return 'Unknown';
    
    const industryKeywords: { [key: string]: string[] } = {
      'Technology': ['tech', 'software', 'AI', 'data', 'startup', 'app', 'platform', 'digital'],
      'Finance': ['bank', 'financial', 'investment', 'capital', 'fund', 'trading', 'fintech'],
      'Healthcare': ['health', 'medical', 'pharma', 'biotech', 'hospital', 'clinic'],
      'Education': ['university', 'school', 'education', 'learning', 'academy'],
      'Consulting': ['consulting', 'advisory', 'strategy', 'management'],
      'Media': ['media', 'marketing', 'advertising', 'content', 'creative', 'agency'],
      'Manufacturing': ['manufacturing', 'industrial', 'production', 'factory'],
      'Retail': ['retail', 'commerce', 'shopping', 'consumer', 'brand']
    };

    const companyLower = company.toLowerCase();
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => companyLower.includes(keyword))) {
        return industry;
      }
    }

    return 'Other';
  }

  private calculateSimilarity(contact1: any, contact2: any): number {
    let score = 0;

    // Company similarity
    if (contact1.company && contact2.company) {
      if (contact1.company === contact2.company) {
        score += 0.5;
      } else if (this.inferIndustry(contact1.company) === this.inferIndustry(contact2.company)) {
        score += 0.2;
      }
    }

    // Position similarity
    if (contact1.position && contact2.position) {
      const pos1 = contact1.position.toLowerCase();
      const pos2 = contact2.position.toLowerCase();
      
      const commonTitles = ['ceo', 'cto', 'cfo', 'vp', 'director', 'manager', 'lead', 'senior', 'junior'];
      const title1 = commonTitles.find(title => pos1.includes(title));
      const title2 = commonTitles.find(title => pos2.includes(title));
      
      if (title1 && title1 === title2) {
        score += 0.3;
      }
    }

    // Tags similarity
    if (contact1.tags && contact2.tags) {
      const tags1 = new Set(contact1.tags);
      const tags2 = new Set(contact2.tags);
      const intersection = new Set([...tags1].filter(x => tags2.has(x)));
      const union = new Set([...tags1, ...tags2]);
      
      if (union.size > 0) {
        score += (intersection.size / union.size) * 0.3;
      }
    }

    return Math.min(score, 1.0);
  }
}

export const aiService = new AIService();