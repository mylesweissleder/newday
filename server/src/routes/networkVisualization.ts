import express, { Request, Response } from 'express';


const router = express.Router();
import prisma from "../utils/prisma";

// Get network graph data for visualization
router.get('/graph', async (req: Request, res: Response) => {
  try {
    const { 
      includeInactive = 'false',
      minStrength = '0',
      contactIds,
      maxNodes = '500'
    } = req.query;

    const accountId = req.user!.accountId;

    // Build where clause for contacts
    let contactsWhere: any = {
      accountId,
      status: includeInactive === 'true' ? undefined : 'ACTIVE'
    };

    if (contactIds && typeof contactIds === 'string') {
      contactsWhere.id = { in: contactIds.split(',') };
    }

    // Get contacts with their network analytics
    const contacts = await prisma.contact.findMany({
      where: contactsWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        position: true,
        email: true,
        city: true,
        state: true,
        country: true,
        tier: true,
        priorityScore: true,
        opportunityScore: true,
        strategicValue: true,
        networkAnalytics: {
          select: {
            influenceScore: true,
            totalConnections: true,
            directConnections: true,
            networkReach: true,
            industryDiversity: true,
            geographicSpread: true
          }
        }
      },
      take: Number(maxNodes),
      orderBy: [
        { priorityScore: 'desc' },
        { lastName: 'asc' }
      ]
    });

    const contactIds_internal = contacts.map(c => c.id);

    // Get relationships between these contacts
    const relationships = await prisma.contactRelationship.findMany({
      where: {
        contactId: { in: contactIds_internal },
        relatedContactId: { in: contactIds_internal },
        strength: { gte: parseFloat(minStrength as string) || 0 }
      },
      select: {
        id: true,
        contactId: true,
        relatedContactId: true,
        relationshipType: true,
        strength: true,
        confidence: true,
        isMutual: true,
        isVerified: true,
        source: true,
        interactionCount: true,
        sharedConnections: true,
        lastVerified: true
      },
      orderBy: { strength: 'desc' }
    });

    // Build nodes array with enhanced data for visualization
    const nodes = contacts.map(contact => {
      const analytics = contact.networkAnalytics;
      const fullName = `${contact.firstName} ${contact.lastName}`;
      
      // Calculate node size based on influence and connections
      const baseSize = 8;
      const influenceMultiplier = (analytics?.influenceScore || 0) * 20;
      const connectionsMultiplier = Math.min((analytics?.totalConnections || 0) * 0.5, 15);
      const nodeSize = baseSize + influenceMultiplier + connectionsMultiplier;

      // Determine node color based on tier and scores
      let nodeColor = '#6B7280'; // Default gray
      if (contact.tier === 'TIER_1') nodeColor = '#DC2626'; // Red for tier 1
      else if (contact.tier === 'TIER_2') nodeColor = '#EA580C'; // Orange for tier 2
      else if (contact.tier === 'TIER_3') nodeColor = '#CA8A04'; // Yellow for tier 3
      else if (contact.priorityScore && contact.priorityScore > 80) nodeColor = '#059669'; // Green for high priority
      else if (contact.opportunityScore && contact.opportunityScore > 70) nodeColor = '#7C3AED'; // Purple for opportunities

      return {
        id: contact.id,
        name: fullName,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company,
        position: contact.position,
        email: contact.email,
        location: [contact.city, contact.state, contact.country].filter(Boolean).join(', '),
        tier: contact.tier,
        priorityScore: contact.priorityScore,
        opportunityScore: contact.opportunityScore,
        strategicValue: contact.strategicValue,
        
        // Visual properties
        size: Math.max(nodeSize, 6), // Minimum size
        color: nodeColor,
        
        // Network metrics for tooltip
        influenceScore: analytics?.influenceScore || 0,
        totalConnections: analytics?.totalConnections || 0,
        directConnections: analytics?.directConnections || 0,
        networkReach: analytics?.networkReach || 0,
        industryDiversity: analytics?.industryDiversity || 0,
        geographicSpread: analytics?.geographicSpread || 0
      };
    });

    // Build edges array
    const edges = relationships.map(rel => ({
      id: rel.id,
      source: rel.contactId,
      target: rel.relatedContactId,
      relationshipType: rel.relationshipType,
      strength: rel.strength,
      confidence: rel.confidence,
      isMutual: rel.isMutual,
      isVerified: rel.isVerified,
      source_type: rel.source,
      interactionCount: rel.interactionCount,
      sharedConnections: rel.sharedConnections,
      lastVerified: rel.lastVerified,
      
      // Visual properties based on relationship strength
      strokeWidth: Math.max(1, (rel.strength || 0.5) * 4),
      opacity: Math.max(0.3, rel.confidence || 0.5),
      color: rel.isVerified ? '#10B981' : '#6B7280', // Green for verified, gray for unverified
      style: rel.isMutual ? 'solid' : 'dashed' // Solid for mutual, dashed for one-way
    }));

    // Calculate network statistics
    const networkStats = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      averageConnections: edges.length > 0 ? (edges.length * 2) / nodes.length : 0,
      networkDensity: nodes.length > 1 ? edges.length / (nodes.length * (nodes.length - 1) / 2) : 0,
      verifiedRelationships: edges.filter(e => e.isVerified).length,
      mutualRelationships: edges.filter(e => e.isMutual).length,
      
      // Node distribution by tier
      tierDistribution: {
        tier1: nodes.filter(n => n.tier === 'TIER_1').length,
        tier2: nodes.filter(n => n.tier === 'TIER_2').length,
        tier3: nodes.filter(n => n.tier === 'TIER_3').length,
        untiered: nodes.filter(n => !n.tier).length
      },
      
      // Top influencers
      topInfluencers: nodes
        .sort((a, b) => b.influenceScore - a.influenceScore)
        .slice(0, 5)
        .map(n => ({ id: n.id, name: n.name, influenceScore: n.influenceScore })),
      
      // Most connected
      mostConnected: nodes
        .sort((a, b) => b.totalConnections - a.totalConnections)
        .slice(0, 5)
        .map(n => ({ id: n.id, name: n.name, totalConnections: n.totalConnections }))
    };

    res.json({
      nodes,
      edges,
      stats: networkStats,
      metadata: {
        generatedAt: new Date().toISOString(),
        filters: {
          includeInactive: includeInactive === 'true',
          minStrength: parseFloat(minStrength as string) || 0,
          maxNodes: parseInt(maxNodes as string) || 500,
          contactIds: contactIds ? contactIds.split(',').length : null
        }
      }
    });
  } catch (error) {
    console.error('Network graph error:', error);
    res.status(500).json({ error: 'Failed to generate network graph data' });
  }
});

// Get network clusters/communities
router.get('/clusters', async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    
    // Get all contacts with their relationships for clustering analysis
    const contacts = await prisma.contact.findMany({
      where: { 
        accountId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        position: true
      }
    });

    const relationships = await prisma.contactRelationship.findMany({
      where: {
        contact: { accountId },
        strength: { gte: 0.3 } // Only consider stronger relationships
      },
      select: {
        contactId: true,
        relatedContactId: true,
        strength: true,
        relationshipType: true
      }
    });

    // Simple clustering based on companies and relationship strength
    const clusters = new Map<string, any>();
    const contactClusters = new Map<string, string>();

    // First, group by companies
    contacts.forEach(contact => {
      if (contact.company) {
        const clusterKey = contact.company;
        if (!clusters.has(clusterKey)) {
          clusters.set(clusterKey, {
            id: clusterKey,
            name: contact.company,
            type: 'company',
            members: [],
            connections: 0,
            avgStrength: 0
          });
        }
        clusters.get(clusterKey)!.members.push(contact);
        contactClusters.set(contact.id, clusterKey);
      }
    });

    // Calculate inter-cluster connections
    relationships.forEach(rel => {
      const sourceCluster = contactClusters.get(rel.contactId);
      const targetCluster = contactClusters.get(rel.relatedContactId);
      
      if (sourceCluster && sourceCluster === targetCluster) {
        // Internal cluster connection
        const cluster = clusters.get(sourceCluster)!;
        cluster.connections += 1;
        cluster.avgStrength = ((cluster.avgStrength * (cluster.connections - 1)) + (rel.strength || 0.5)) / cluster.connections;
      }
    });

    // Convert to array and add metrics
    const clusterArray = Array.from(clusters.values()).map(cluster => ({
      ...cluster,
      size: cluster.members.length,
      density: cluster.connections / Math.max(1, cluster.members.length * (cluster.members.length - 1) / 2),
      memberIds: cluster.members.map((m: any) => m.id)
    })).filter(cluster => cluster.size > 1); // Only include clusters with multiple members

    res.json({
      clusters: clusterArray,
      totalClusters: clusterArray.length,
      largestCluster: clusterArray.reduce((max, cluster) => 
        cluster.size > max.size ? cluster : max, 
        { size: 0 }
      ),
      avgClusterSize: clusterArray.length > 0 
        ? clusterArray.reduce((sum, c) => sum + c.size, 0) / clusterArray.length 
        : 0
    });
  } catch (error) {
    console.error('Network clusters error:', error);
    res.status(500).json({ error: 'Failed to analyze network clusters' });
  }
});

// Get network paths between contacts with path optimization
router.get('/paths/:fromId/:toId', async (req: Request, res: Response) => {
  try {
    const { fromId, toId } = req.params;
    const { maxDegrees = '4', minStrength = '0.2' } = req.query;
    
    const accountId = req.user!.accountId;

    // Verify both contacts exist and belong to account
    const [fromContact, toContact] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: fromId, accountId },
        select: { id: true, firstName: true, lastName: true, company: true }
      }),
      prisma.contact.findFirst({
        where: { id: toId, accountId },
        select: { id: true, firstName: true, lastName: true, company: true }
      })
    ]);

    if (!fromContact || !toContact) {
      return res.status(404).json({ error: 'One or both contacts not found' });
    }

    // Get all strong relationships for path finding
    const relationships = await prisma.contactRelationship.findMany({
      where: {
        contact: { accountId },
        strength: { gte: parseFloat(minStrength as string) || 0 },
        isVerified: true
      },
      select: {
        contactId: true,
        relatedContactId: true,
        strength: true,
        relationshipType: true,
        isMutual: true
      }
    });

    // Build weighted graph
    const graph = new Map<string, Array<{id: string, weight: number, type: string, mutual: boolean}>>();
    
    relationships.forEach(rel => {
      const weight = rel.strength || 0.5;
      
      if (!graph.has(rel.contactId)) graph.set(rel.contactId, []);
      if (!graph.has(rel.relatedContactId)) graph.set(rel.relatedContactId, []);
      
      graph.get(rel.contactId)!.push({ 
        id: rel.relatedContactId, 
        weight, 
        type: rel.relationshipType,
        mutual: rel.isMutual || false
      });
      
      graph.get(rel.relatedContactId)!.push({ 
        id: rel.contactId, 
        weight, 
        type: rel.relationshipType,
        mutual: rel.isMutual || false
      });
    });

    // Dijkstra's algorithm for shortest weighted path
    interface PathNode {
      id: string;
      distance: number;
      path: string[];
      relationshipTypes: string[];
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const pathTypes = new Map<string, string[]>();
    const visited = new Set<string>();
    const queue: PathNode[] = [];

    // Initialize
    distances.set(fromId, 0);
    queue.push({ id: fromId, distance: 0, path: [fromId], relationshipTypes: [] });

    let foundPaths: any[] = [];

    while (queue.length > 0 && foundPaths.length < 3) { // Find up to 3 different paths
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift()!;

      if (current.path.length > Number(maxDegrees) + 1) continue;
      if (visited.has(current.id + '_' + current.path.length)) continue;
      
      visited.add(current.id + '_' + current.path.length);

      if (current.id === toId) {
        // Found a path - get contact details
        const pathContacts = await prisma.contact.findMany({
          where: {
            id: { in: current.path },
            accountId
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            position: true
          }
        });

        const orderedPathContacts = current.path.map(id => 
          pathContacts.find(c => c.id === id)!
        );

        foundPaths.push({
          path: orderedPathContacts,
          pathLength: current.path.length - 1,
          totalWeight: current.distance,
          relationshipTypes: current.relationshipTypes,
          strength: current.relationshipTypes.length > 0 ? 
            current.distance / current.relationshipTypes.length : 0
        });
        continue;
      }

      const neighbors = graph.get(current.id) || [];
      
      for (const neighbor of neighbors) {
        if (current.path.includes(neighbor.id)) continue; // Avoid cycles
        
        const newDistance = current.distance + (1 - neighbor.weight); // Lower weight = better connection
        const newPath = [...current.path, neighbor.id];
        const newTypes = [...current.relationshipTypes, neighbor.type];

        queue.push({
          id: neighbor.id,
          distance: newDistance,
          path: newPath,
          relationshipTypes: newTypes
        });
      }
    }

    // Sort paths by strength (lower distance = stronger path)
    foundPaths.sort((a, b) => a.totalWeight - b.totalWeight);

    res.json({
      fromContact,
      toContact,
      paths: foundPaths,
      pathsFound: foundPaths.length,
      searchParams: {
        maxDegrees: parseInt(maxDegrees as string) || 3,
        minStrength: parseFloat(minStrength as string) || 0
      }
    });
  } catch (error) {
    console.error('Network paths error:', error);
    res.status(500).json({ error: 'Failed to find network paths' });
  }
});

// Get network influence analysis
router.get('/influence', async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    
    const contacts = await prisma.contact.findMany({
      where: { 
        accountId,
        status: 'ACTIVE'
      },
      include: {
        networkAnalytics: true
      },
      orderBy: {
        networkAnalytics: {
          influenceScore: 'desc'
        }
      },
      take: 50 // Top 50 most influential
    });

    const influenceData = contacts.map(contact => {
      const analytics = contact.networkAnalytics;
      return {
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        company: contact.company,
        position: contact.position,
        influenceScore: analytics?.influenceScore || 0,
        totalConnections: analytics?.totalConnections || 0,
        networkReach: analytics?.networkReach || 0,
        industryDiversity: analytics?.industryDiversity || 0,
        geographicSpread: analytics?.geographicSpread || 0,
        betweennessCentrality: analytics?.betweennessCentrality || 0,
        clusteringCoefficient: analytics?.clusteringCoefficient || 0
      };
    });

    // Calculate network-wide metrics
    const networkMetrics = {
      totalInfluencers: influenceData.filter(c => c.influenceScore > 0.5).length,
      avgInfluence: influenceData.reduce((sum, c) => sum + c.influenceScore, 0) / influenceData.length,
      topInfluencers: influenceData.slice(0, 10),
      influenceDistribution: {
        high: influenceData.filter(c => c.influenceScore > 0.7).length,
        medium: influenceData.filter(c => c.influenceScore > 0.4 && c.influenceScore <= 0.7).length,
        low: influenceData.filter(c => c.influenceScore <= 0.4).length
      }
    };

    res.json({
      influenceData,
      metrics: networkMetrics
    });
  } catch (error) {
    console.error('Network influence error:', error);
    res.status(500).json({ error: 'Failed to analyze network influence' });
  }
});

// Export network data in various formats
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { format = 'json' } = req.query;
    const accountId = req.user!.accountId;

    // Get comprehensive network data
    const [contacts, relationships] = await Promise.all([
      prisma.contact.findMany({
        where: { accountId, status: 'ACTIVE' },
        include: { networkAnalytics: true }
      }),
      prisma.contactRelationship.findMany({
        where: { contact: { accountId } },
        include: {
          contact: { select: { firstName: true, lastName: true } },
          relatedContact: { select: { firstName: true, lastName: true } }
        }
      })
    ]);

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalContacts: contacts.length,
        totalRelationships: relationships.length,
        format
      },
      contacts: contacts.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        company: c.company,
        position: c.position,
        email: c.email,
        location: [c.city, c.state, c.country].filter(Boolean).join(', '),
        tier: c.tier,
        priorityScore: c.priorityScore,
        analytics: c.networkAnalytics
      })),
      relationships: relationships.map(r => ({
        id: r.id,
        source: r.contactId,
        sourceName: `${r.contact.firstName} ${r.contact.lastName}`,
        target: r.relatedContactId,
        targetName: `${r.relatedContact.firstName} ${r.relatedContact.lastName}`,
        type: r.relationshipType,
        strength: r.strength,
        mutual: r.isMutual,
        verified: r.isVerified
      }))
    };

    if (format === 'csv') {
      // Simple CSV export for relationships
      const csvData = [
        'Source,Target,Type,Strength,Mutual,Verified',
        ...exportData.relationships.map(r => 
          `"${r.sourceName}","${r.targetName}","${r.type}",${r.strength},${r.mutual},${r.verified}`
        )
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="network-export.csv"');
      res.send(csvData);
    } else if (format === 'graphml') {
      // GraphML format for network analysis tools
      const graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="company" for="node" attr.name="company" attr.type="string"/>
  <key id="influence" for="node" attr.name="influence" attr.type="double"/>
  <key id="type" for="edge" attr.name="type" attr.type="string"/>
  <key id="strength" for="edge" attr.name="strength" attr.type="double"/>
  
  <graph id="G" edgedefault="undirected">
    ${exportData.contacts.map(c => `
    <node id="${c.id}">
      <data key="name">${c.name}</data>
      <data key="company">${c.company || ''}</data>
      <data key="influence">${c.analytics?.influenceScore || 0}</data>
    </node>`).join('')}
    
    ${exportData.relationships.map(r => `
    <edge source="${r.source}" target="${r.target}">
      <data key="type">${r.type}</data>
      <data key="strength">${r.strength || 0.5}</data>
    </edge>`).join('')}
  </graph>
</graphml>`;

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="network-export.graphml"');
      res.send(graphml);
    } else {
      // JSON format (default)
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="network-export.json"');
      res.json(exportData);
    }
  } catch (error) {
    console.error('Network export error:', error);
    res.status(500).json({ error: 'Failed to export network data' });
  }
});

export default router;