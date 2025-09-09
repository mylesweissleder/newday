import express, { Request, Response } from 'express';


const router = express.Router();
import prisma from "../utils/prisma";

// Get dashboard overview
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;

    // Get basic counts
    const [
      totalContacts,
      activeContacts,
      totalCampaigns,
      activeCampaigns,
      totalOutreach,
      recentOutreach
    ] = await Promise.all([
      prisma.contact.count({ where: { accountId } }),
      prisma.contact.count({ where: { accountId, status: 'ACTIVE' } }),
      prisma.campaign.count({ where: { accountId } }),
      prisma.campaign.count({ where: { accountId, status: 'ACTIVE' } }),
      prisma.outreach.count({ 
        where: { contact: { accountId } } 
      }),
      prisma.outreach.count({ 
        where: { 
          contact: { accountId },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        } 
      })
    ]);

    // Get tier distribution
    const tierDistribution = await prisma.contact.groupBy({
      by: ['tier'],
      where: { accountId, status: 'ACTIVE' },
      _count: true
    });

    // Get source distribution
    const sourceDistribution = await prisma.contact.groupBy({
      by: ['source'],
      where: { accountId },
      _count: true,
      orderBy: { _count: { source: 'desc' } },
      take: 10
    });

    // Get company distribution
    const companyDistribution = await prisma.$queryRaw`
      SELECT company, COUNT(*) as count
      FROM contacts
      WHERE account_id = ${accountId} 
        AND company IS NOT NULL 
        AND company != ''
        AND status = 'ACTIVE'
      GROUP BY company
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get recent activity
    const recentActivity = await prisma.contact.findMany({
      where: { accountId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        updatedAt: true,
        updatedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    // Get outreach performance
    const outreachStats = await prisma.outreach.groupBy({
      by: ['status'],
      where: { contact: { accountId } },
      _count: true
    });

    const responseRate = outreachStats.reduce((total, stat) => total + stat._count, 0);
    const responses = outreachStats.find(s => s.status === 'RESPONDED')?._count || 0;

    res.json({
      overview: {
        totalContacts,
        activeContacts,
        totalCampaigns,
        activeCampaigns,
        totalOutreach,
        recentOutreach,
        responseRate: responseRate > 0 ? Math.round((responses / responseRate) * 100 * 100) / 100 : 0
      },
      distributions: {
        tier: tierDistribution,
        source: sourceDistribution,
        company: companyDistribution
      },
      recentActivity,
      outreachStats
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// Get network analytics
router.get('/network', async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;

    // Get relationship stats
    const relationshipStats = await prisma.contactRelationship.groupBy({
      by: ['relationshipType'],
      where: { 
        contact: { accountId }
      },
      _count: true
    });

    // Get network density
    const totalContacts = await prisma.contact.count({ 
      where: { accountId, status: 'ACTIVE' } 
    });
    const totalRelationships = await prisma.contactRelationship.count({
      where: { contact: { accountId } }
    });

    const networkDensity = totalContacts > 1 ? 
      (totalRelationships / (totalContacts * (totalContacts - 1))) * 100 : 0;

    // Get most connected contacts
    const mostConnected = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.company,
        c.position,
        COUNT(cr.id) as connection_count
      FROM contacts c
      LEFT JOIN contact_relationships cr ON c.id = cr.contact_id OR c.id = cr.related_contact_id
      WHERE c.account_id = ${accountId} AND c.status = 'ACTIVE'
      GROUP BY c.id, c.first_name, c.last_name, c.company, c.position
      ORDER BY connection_count DESC
      LIMIT 10
    `;

    // Get industry clusters
    const industryClusters = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN LOWER(company) LIKE '%tech%' OR LOWER(company) LIKE '%software%' THEN 'Technology'
          WHEN LOWER(company) LIKE '%bank%' OR LOWER(company) LIKE '%financial%' THEN 'Finance'
          WHEN LOWER(company) LIKE '%health%' OR LOWER(company) LIKE '%medical%' THEN 'Healthcare'
          ELSE 'Other'
        END as industry,
        COUNT(*) as count
      FROM contacts
      WHERE account_id = ${accountId} 
        AND status = 'ACTIVE' 
        AND company IS NOT NULL
      GROUP BY industry
      ORDER BY count DESC
    `;

    res.json({
      networkDensity: Math.round(networkDensity * 100) / 100,
      totalContacts,
      totalRelationships,
      relationshipStats,
      mostConnected,
      industryClusters
    });
  } catch (error) {
    console.error('Network analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch network analytics' });
  }
});

// Get contact growth over time
router.get('/growth', async (req: Request, res: Response) => {
  try {
    const { timeframe = '6m' } = req.query;
    const accountId = req.user!.accountId;

    let dateRange: Date;
    const now = new Date();

    switch (timeframe) {
      case '1m':
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        dateRange = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        dateRange = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        dateRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateRange = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    }

    // Get daily contact creation
    const dailyGrowth = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_contacts,
        SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_contacts
      FROM contacts
      WHERE account_id = ${accountId} 
        AND created_at >= ${dateRange}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Get source attribution over time
    const sourceGrowth = await prisma.$queryRaw`
      SELECT 
        source,
        DATE(created_at) as date,
        COUNT(*) as count
      FROM contacts
      WHERE account_id = ${accountId} 
        AND created_at >= ${dateRange}
        AND source IS NOT NULL
      GROUP BY source, DATE(created_at)
      ORDER BY date ASC, count DESC
    `;

    res.json({
      dailyGrowth,
      sourceGrowth
    });
  } catch (error) {
    console.error('Growth analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch growth analytics' });
  }
});

// Get engagement analytics
router.get('/engagement', async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;

    // Get outreach performance by tier
    const tierPerformance = await prisma.$queryRaw`
      SELECT 
        c.tier,
        COUNT(o.id) as total_outreach,
        COUNT(CASE WHEN o.status = 'RESPONDED' THEN 1 END) as responses,
        CASE 
          WHEN COUNT(o.id) > 0 THEN 
            ROUND(COUNT(CASE WHEN o.status = 'RESPONDED' THEN 1 END) * 100.0 / COUNT(o.id), 2)
          ELSE 0 
        END as response_rate
      FROM contacts c
      LEFT JOIN outreach o ON c.id = o.contact_id
      WHERE c.account_id = ${accountId} AND c.status = 'ACTIVE'
      GROUP BY c.tier
      ORDER BY response_rate DESC
    `;

    // Get engagement by day of week
    const dayOfWeekPerformance = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM o.created_at) as day_of_week,
        COUNT(o.id) as total_outreach,
        COUNT(CASE WHEN o.status = 'RESPONDED' THEN 1 END) as responses,
        CASE 
          WHEN COUNT(o.id) > 0 THEN 
            ROUND(COUNT(CASE WHEN o.status = 'RESPONDED' THEN 1 END) * 100.0 / COUNT(o.id), 2)
          ELSE 0 
        END as response_rate
      FROM outreach o
      JOIN contacts c ON o.contact_id = c.id
      WHERE c.account_id = ${accountId}
      GROUP BY EXTRACT(DOW FROM o.created_at)
      ORDER BY day_of_week
    `;

    // Get most engaged contacts
    const mostEngaged = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.company,
        COUNT(o.id) as total_outreach,
        COUNT(CASE WHEN o.status = 'RESPONDED' THEN 1 END) as responses,
        MAX(o.created_at) as last_outreach
      FROM contacts c
      JOIN outreach o ON c.id = o.contact_id
      WHERE c.account_id = ${accountId}
      GROUP BY c.id, c.first_name, c.last_name, c.company
      HAVING COUNT(CASE WHEN o.status = 'RESPONDED' THEN 1 END) > 0
      ORDER BY responses DESC, total_outreach DESC
      LIMIT 10
    `;

    res.json({
      tierPerformance,
      dayOfWeekPerformance,
      mostEngaged
    });
  } catch (error) {
    console.error('Engagement analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch engagement analytics' });
  }
});

// Export analytics data
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { type = 'contacts' } = req.query;
    const accountId = req.user!.accountId;

    let data: any[];

    switch (type) {
      case 'contacts':
        data = await prisma.contact.findMany({
          where: { accountId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            position: true,
            tier: true,
            source: true,
            status: true,
            tags: true,
            createdAt: true,
            lastContactDate: true,
            _count: {
              select: {
                outreach: true,
                relationships: true
              }
            }
          }
        });
        break;

      case 'outreach':
        data = await prisma.outreach.findMany({
          where: { contact: { accountId } },
          select: {
            type: true,
            status: true,
            subject: true,
            createdAt: true,
            sentAt: true,
            respondedAt: true,
            contact: {
              select: {
                firstName: true,
                lastName: true,
                company: true,
                email: true
              }
            },
            sentBy: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    res.json({
      type,
      exportedAt: new Date(),
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

export default router;