
import { RelationshipType } from '@prisma/client';

import prisma from "../utils/prisma";

interface PotentialRelationshipEvidence {
  type: string;
  score: number;
  details: any;
}

interface PotentialRelationship {
  contactId: string;
  relatedContactId: string;
  relationshipType: RelationshipType;
  confidence: number;
  evidence: PotentialRelationshipEvidence[];
  source: string;
}

export class RelationshipDiscoveryService {
  
  /**
   * Discover potential relationships for a specific contact
   */
  async discoverRelationshipsForContact(contactId: string, accountId: string): Promise<PotentialRelationship[]> {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, accountId }
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get all other contacts in the account (excluding this one and already connected ones)
    const existingRelationshipIds = await prisma.contactRelationship.findMany({
      where: {
        OR: [
          { contactId },
          { relatedContactId: contactId }
        ]
      },
      select: {
        contactId: true,
        relatedContactId: true
      }
    });

    const connectedContactIds = new Set();
    existingRelationshipIds.forEach(rel => {
      connectedContactIds.add(rel.contactId);
      connectedContactIds.add(rel.relatedContactId);
    });

    const candidateContacts = await prisma.contact.findMany({
      where: {
        accountId,
        id: { not: contactId },
        NOT: {
          id: { in: Array.from(connectedContactIds) as string[] }
        },
        status: 'ACTIVE'
      }
    });

    const potentialRelationships: PotentialRelationship[] = [];

    for (const candidate of candidateContacts) {
      const evidence = await this.analyzeRelationshipEvidence(contact, candidate);
      
      if (evidence.length > 0) {
        const confidence = this.calculateConfidence(evidence);
        
        if (confidence >= 0.3) { // Only consider relationships with 30%+ confidence
          const relationshipType = this.inferRelationshipType(evidence, contact, candidate);
          
          potentialRelationships.push({
            contactId,
            relatedContactId: candidate.id,
            relationshipType,
            confidence,
            evidence,
            source: 'auto_discovery'
          });
        }
      }
    }

    return potentialRelationships.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze evidence for a potential relationship between two contacts
   */
  private async analyzeRelationshipEvidence(contact1: any, contact2: any): Promise<PotentialRelationshipEvidence[]> {
    const evidence: PotentialRelationshipEvidence[] = [];

    // Company connection evidence
    if (contact1.company && contact2.company) {
      if (contact1.company.toLowerCase() === contact2.company.toLowerCase()) {
        evidence.push({
          type: 'same_company',
          score: 0.8,
          details: { company: contact1.company }
        });
      } else if (this.areCompaniesRelated(contact1.company, contact2.company)) {
        evidence.push({
          type: 'related_companies',
          score: 0.4,
          details: { 
            company1: contact1.company, 
            company2: contact2.company 
          }
        });
      }
    }

    // Email domain evidence
    if (contact1.email && contact2.email) {
      const domain1 = contact1.email.split('@')[1]?.toLowerCase();
      const domain2 = contact2.email.split('@')[1]?.toLowerCase();
      
      if (domain1 && domain2 && domain1 === domain2 && !this.isGenericEmailDomain(domain1)) {
        evidence.push({
          type: 'same_email_domain',
          score: 0.7,
          details: { domain: domain1 }
        });
      }
    }

    // Geographic proximity evidence
    if (contact1.city && contact1.state && contact2.city && contact2.state) {
      if (contact1.city.toLowerCase() === contact2.city.toLowerCase() && 
          contact1.state.toLowerCase() === contact2.state.toLowerCase()) {
        evidence.push({
          type: 'same_location',
          score: 0.3,
          details: { 
            city: contact1.city, 
            state: contact1.state 
          }
        });
      } else if (contact1.state.toLowerCase() === contact2.state.toLowerCase()) {
        evidence.push({
          type: 'same_state',
          score: 0.1,
          details: { state: contact1.state }
        });
      }
    }

    // Industry/role similarity evidence
    if (contact1.position && contact2.position) {
      const similarity = this.calculateRoleSimilarity(contact1.position, contact2.position);
      if (similarity > 0.5) {
        evidence.push({
          type: 'similar_roles',
          score: similarity * 0.4,
          details: { 
            position1: contact1.position, 
            position2: contact2.position,
            similarity 
          }
        });
      }
    }

    // LinkedIn connection evidence (if LinkedIn URLs are available)
    if (contact1.linkedinUrl && contact2.linkedinUrl) {
      // This would require LinkedIn API integration to check actual connections
      // For now, we'll just note that both have LinkedIn profiles
      evidence.push({
        type: 'both_on_linkedin',
        score: 0.1,
        details: {
          linkedin1: contact1.linkedinUrl,
          linkedin2: contact2.linkedinUrl
        }
      });
    }

    // Mutual connections evidence
    const mutualConnectionsCount = await this.getMutualConnectionsCount(contact1.id, contact2.id);
    if (mutualConnectionsCount > 0) {
      evidence.push({
        type: 'mutual_connections',
        score: Math.min(0.6, mutualConnectionsCount * 0.2),
        details: { count: mutualConnectionsCount }
      });
    }

    return evidence;
  }

  /**
   * Calculate confidence score based on evidence
   */
  private calculateConfidence(evidence: PotentialRelationshipEvidence[]): number {
    if (evidence.length === 0) return 0;

    // Weighted average of evidence scores
    const totalScore = evidence.reduce((sum, e) => sum + e.score, 0);
    const maxPossibleScore = evidence.length * 1.0; // Max score per evidence is 1.0
    
    return Math.min(1, totalScore / Math.max(1, evidence.length));
  }

  /**
   * Infer relationship type based on evidence
   */
  private inferRelationshipType(evidence: PotentialRelationshipEvidence[], contact1: any, contact2: any): RelationshipType {
    // Priority-based inference
    for (const e of evidence) {
      switch (e.type) {
        case 'same_company':
          return 'COLLEAGUE';
        case 'related_companies':
          if (this.isClientVendorRelationship(contact1.position, contact2.position)) {
            return 'CLIENT';
          }
          return 'PARTNER';
        case 'same_email_domain':
          return 'COLLEAGUE';
        case 'mutual_connections':
          if (e.details.count >= 3) {
            return 'ACQUAINTANCE';
          }
          return 'PROSPECT';
        case 'similar_roles':
          return 'ACQUAINTANCE';
      }
    }

    return 'PROSPECT'; // Default fallback
  }

  /**
   * Check if two companies are related
   */
  private areCompaniesRelated(company1: string, company2: string): boolean {
    const c1 = company1.toLowerCase();
    const c2 = company2.toLowerCase();

    // Check for common parent/subsidiary patterns
    if (c1.includes(c2) || c2.includes(c1)) return true;

    // Check for common corporate suffixes
    const suffixes = ['inc', 'corp', 'corporation', 'llc', 'ltd', 'limited'];
    const cleanC1 = this.cleanCompanyName(c1, suffixes);
    const cleanC2 = this.cleanCompanyName(c2, suffixes);

    return cleanC1 === cleanC2;
  }

  /**
   * Clean company name by removing common suffixes
   */
  private cleanCompanyName(company: string, suffixes: string[]): string {
    let clean = company.toLowerCase().trim();
    for (const suffix of suffixes) {
      clean = clean.replace(new RegExp(`\\s*${suffix}\\.?$`, 'g'), '');
    }
    return clean;
  }

  /**
   * Check if email domain is generic (gmail, yahoo, etc.)
   */
  private isGenericEmailDomain(domain: string): boolean {
    const genericDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'live.com', 'msn.com', 'comcast.net', 'verizon.net'
    ];
    return genericDomains.includes(domain.toLowerCase());
  }

  /**
   * Calculate similarity between two job positions/roles
   */
  private calculateRoleSimilarity(role1: string, role2: string): number {
    const r1 = role1.toLowerCase();
    const r2 = role2.toLowerCase();

    // Exact match
    if (r1 === r2) return 1;

    // Check for common role keywords
    const commonKeywords = this.extractRoleKeywords(r1).filter(keyword => 
      r2.includes(keyword)
    );

    const totalKeywords = Math.max(
      this.extractRoleKeywords(r1).length,
      this.extractRoleKeywords(r2).length
    );

    return commonKeywords.length / Math.max(1, totalKeywords);
  }

  /**
   * Extract keywords from job role/position
   */
  private extractRoleKeywords(role: string): string[] {
    const keywords = [
      'director', 'manager', 'senior', 'junior', 'lead', 'head', 'chief',
      'engineer', 'developer', 'designer', 'analyst', 'consultant',
      'sales', 'marketing', 'product', 'finance', 'operations', 'hr',
      'vp', 'president', 'ceo', 'cto', 'cfo', 'cmo', 'coo'
    ];

    return keywords.filter(keyword => role.toLowerCase().includes(keyword));
  }

  /**
   * Check if positions suggest client-vendor relationship
   */
  private isClientVendorRelationship(position1: string, position2: string): boolean {
    const p1 = position1.toLowerCase();
    const p2 = position2.toLowerCase();

    const clientKeywords = ['buyer', 'procurement', 'purchasing'];
    const vendorKeywords = ['sales', 'account', 'business development'];

    const hasClientKeywords = clientKeywords.some(k => p1.includes(k) || p2.includes(k));
    const hasVendorKeywords = vendorKeywords.some(k => p1.includes(k) || p2.includes(k));

    return hasClientKeywords && hasVendorKeywords;
  }

  /**
   * Get count of mutual connections between two contacts
   */
  private async getMutualConnectionsCount(contactId1: string, contactId2: string): Promise<number> {
    const [contact1Connections, contact2Connections] = await Promise.all([
      prisma.contactRelationship.findMany({
        where: {
          OR: [
            { contactId: contactId1 },
            { relatedContactId: contactId1 }
          ]
        },
        select: { contactId: true, relatedContactId: true }
      }),
      prisma.contactRelationship.findMany({
        where: {
          OR: [
            { contactId: contactId2 },
            { relatedContactId: contactId2 }
          ]
        },
        select: { contactId: true, relatedContactId: true }
      })
    ]);

    const contact1ConnectedIds = new Set();
    const contact2ConnectedIds = new Set();

    contact1Connections.forEach(rel => {
      const otherId = rel.contactId === contactId1 ? rel.relatedContactId : rel.contactId;
      contact1ConnectedIds.add(otherId);
    });

    contact2Connections.forEach(rel => {
      const otherId = rel.contactId === contactId2 ? rel.relatedContactId : rel.contactId;
      contact2ConnectedIds.add(otherId);
    });

    return [...contact1ConnectedIds].filter(id => contact2ConnectedIds.has(id)).length;
  }

  /**
   * Batch discover relationships for all contacts in an account
   */
  async batchDiscoverRelationships(accountId: string): Promise<void> {
    const contacts = await prisma.contact.findMany({
      where: { accountId, status: 'ACTIVE' },
      select: { id: true }
    });

    const batchSize = 10; // Process 10 contacts at a time
    
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (contact) => {
          try {
            const potentialRelationships = await this.discoverRelationshipsForContact(
              contact.id, 
              accountId
            );

            // Save potential relationships to database
            for (const potential of potentialRelationships.slice(0, 5)) { // Top 5 per contact
              await prisma.potentialRelationship.upsert({
                where: {
                  contactId_relatedContactId: {
                    contactId: potential.contactId,
                    relatedContactId: potential.relatedContactId
                  }
                },
                update: {
                  confidence: potential.confidence,
                  evidence: potential.evidence,
                  relationshipType: potential.relationshipType
                },
                create: {
                  contactId: potential.contactId,
                  relatedContactId: potential.relatedContactId,
                  relationshipType: potential.relationshipType,
                  confidence: potential.confidence,
                  evidence: potential.evidence,
                  source: potential.source
                }
              });
            }
          } catch (error) {
            console.error(`Error discovering relationships for contact ${contact.id}:`, error);
          }
        })
      );

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

export const relationshipDiscovery = new RelationshipDiscoveryService();