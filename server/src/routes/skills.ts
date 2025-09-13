import express, { Request, Response } from 'express';
import { SkillType, SkillLevel } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import prisma from '../utils/prisma';

const router = express.Router();

// Get all skills (master list)
router.get('/master', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: [search as string] } }
      ];
    }

    const skills = await prisma.skill.findMany({
      where,
      include: {
        _count: {
          select: { userSkills: true }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    res.json({ skills });
  } catch (error) {
    console.error('Error fetching master skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Create new skill
router.post('/master', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, category, description, tags = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const skill = await prisma.skill.create({
      data: {
        name: name.trim(),
        category,
        description,
        tags
      }
    });

    res.json({ skill });
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

// Get user's skills (ASK and HAVE)
router.get('/my-skills', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const where: any = {
      userId: req.user!.id,
      isActive: true
    };

    if (type && (type === 'ASK' || type === 'HAVE')) {
      where.type = type as SkillType;
    }

    const userSkills = await prisma.userSkill.findMany({
      where,
      include: {
        skill: true
      },
      orderBy: [
        { type: 'asc' },
        { skill: { name: 'asc' } }
      ]
    });

    const grouped = userSkills.reduce((acc: any, userSkill) => {
      const type = userSkill.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(userSkill);
      return acc;
    }, {});

    res.json({ 
      userSkills: grouped,
      total: userSkills.length 
    });
  } catch (error) {
    console.error('Error fetching user skills:', error);
    res.status(500).json({ error: 'Failed to fetch user skills' });
  }
});

// Add skill to user (ASK or HAVE)
router.post('/my-skills', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { skillId, skillName, type, proficiency, notes } = req.body;

    if (!type || !['ASK', 'HAVE'].includes(type)) {
      return res.status(400).json({ error: 'Type must be ASK or HAVE' });
    }

    let skill;
    
    if (skillId) {
      skill = await prisma.skill.findUnique({
        where: { id: skillId }
      });
    } else if (skillName) {
      // Create skill if it doesn't exist
      skill = await prisma.skill.upsert({
        where: { name: skillName.trim() },
        update: {},
        create: {
          name: skillName.trim(),
          category: 'General'
        }
      });
    }

    if (!skill) {
      return res.status(400).json({ error: 'Skill ID or name required' });
    }

    const userSkill = await prisma.userSkill.create({
      data: {
        userId: req.user!.id,
        skillId: skill.id,
        type: type as SkillType,
        proficiency: proficiency as SkillLevel,
        notes,
        isActive: true
      },
      include: {
        skill: true
      }
    });

    res.json({ userSkill });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'You already have this skill with the same type' });
    }
    console.error('Error adding user skill:', error);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// Update user skill
router.put('/my-skills/:userSkillId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userSkillId } = req.params;
    const { proficiency, notes, isActive } = req.body;

    const userSkill = await prisma.userSkill.update({
      where: {
        id: userSkillId,
        userId: req.user!.id // Ensure user owns this skill
      },
      data: {
        proficiency: proficiency as SkillLevel,
        notes,
        isActive
      },
      include: {
        skill: true
      }
    });

    res.json({ userSkill });
  } catch (error) {
    console.error('Error updating user skill:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

// Delete user skill
router.delete('/my-skills/:userSkillId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userSkillId } = req.params;

    await prisma.userSkill.delete({
      where: {
        id: userSkillId,
        userId: req.user!.id
      }
    });

    res.json({ message: 'Skill removed successfully' });
  } catch (error) {
    console.error('Error deleting user skill:', error);
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

// Get crew skills overview
router.get('/crew-overview', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get all crew members' skills
    const crewSkills = await prisma.userSkill.findMany({
      where: {
        user: {
          accountId: req.user!.accountId
        },
        isActive: true
      },
      include: {
        skill: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Group by skill type
    const askSkills = crewSkills.filter(us => us.type === 'ASK');
    const haveSkills = crewSkills.filter(us => us.type === 'HAVE');

    // Find potential matches within the crew
    const potentialMatches = [];
    for (const askSkill of askSkills) {
      const matches = haveSkills.filter(haveSkill => 
        haveSkill.skillId === askSkill.skillId && 
        haveSkill.userId !== askSkill.userId
      );
      
      for (const match of matches) {
        potentialMatches.push({
          skill: askSkill.skill,
          requester: askSkill.user,
          provider: match.user,
          providerProficiency: match.proficiency,
          matchScore: calculateMatchScore(askSkill, match)
        });
      }
    }

    // Get skill distribution
    const skillDistribution = crewSkills.reduce((acc: any, userSkill) => {
      const skillName = userSkill.skill.name;
      const type = userSkill.type;
      
      if (!acc[skillName]) {
        acc[skillName] = { ASK: 0, HAVE: 0, skill: userSkill.skill };
      }
      acc[skillName][type]++;
      
      return acc;
    }, {});

    res.json({
      overview: {
        totalAsks: askSkills.length,
        totalHaves: haveSkills.length,
        uniqueSkills: Object.keys(skillDistribution).length,
        potentialMatches: potentialMatches.length
      },
      potentialMatches: potentialMatches.slice(0, 20), // Top 20 matches
      skillDistribution: Object.values(skillDistribution)
    });
  } catch (error) {
    console.error('Error fetching crew skills overview:', error);
    res.status(500).json({ error: 'Failed to fetch crew skills overview' });
  }
});

// Generate skill-based recommendations
router.post('/recommendations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { skillId, type } = req.body;

    if (!skillId || !type || !['ASK', 'HAVE'].includes(type)) {
      return res.status(400).json({ error: 'Valid skillId and type (ASK/HAVE) required' });
    }

    // Find matching users within the crew
    const oppositeType = type === 'ASK' ? 'HAVE' : 'ASK';
    
    const matches = await prisma.userSkill.findMany({
      where: {
        skillId,
        type: oppositeType as SkillType,
        isActive: true,
        user: {
          accountId: req.user!.accountId,
          id: { not: req.user!.id } // Exclude current user
        }
      },
      include: {
        skill: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Find external contacts with relevant skills/companies
    // This would be enhanced with AI to find people likely to have these skills
    const skill = await prisma.skill.findUnique({
      where: { id: skillId }
    });

    const relevantContacts = await prisma.contact.findMany({
      where: {
        accountId: req.user!.accountId,
        isSharedWithCrew: true,
        status: 'ACTIVE',
        OR: [
          // Look for contacts with positions that might involve this skill
          { position: { contains: skill?.name, mode: 'insensitive' } },
          // Look in tags
          { tags: { hasSome: skill?.tags || [] } },
          // Look in relationship notes
          { relationshipNotes: { contains: skill?.name, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        position: true,
        priorityScore: true,
        tags: true
      },
      take: 10
    });

    // Generate recommendation with AI reasoning
    const recommendation = await prisma.skillRecommendation.create({
      data: {
        accountId: req.user!.accountId,
        requesterId: req.user!.id,
        skillId,
        providerId: matches[0]?.userId || null,
        matchScore: matches.length > 0 ? calculateMatchScore(null, matches[0]) : 50,
        aiReasoning: {
          crewMatches: matches.length,
          externalContacts: relevantContacts.length,
          reasoning: `Found ${matches.length} crew members with ${skill?.name} skills and ${relevantContacts.length} external contacts in relevant positions.`
        },
        status: 'PENDING'
      }
    });

    res.json({
      recommendation,
      crewMatches: matches,
      externalContacts: relevantContacts,
      skill
    });
  } catch (error) {
    console.error('Error generating skill recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get skill recommendations for user
router.get('/recommendations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const recommendations = await prisma.skillRecommendation.findMany({
      where: {
        accountId: req.user!.accountId,
        OR: [
          { requesterId: req.user!.id },
          { providerId: req.user!.id }
        ]
      },
      include: {
        skill: true,
        requester: {
          select: { firstName: true, lastName: true, email: true }
        },
        provider: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Helper function to calculate match score
function calculateMatchScore(askSkill: any, haveSkill: any): number {
  let score = 50; // Base score
  
  if (haveSkill.proficiency) {
    const proficiencyScores = {
      'BEGINNER': 60,
      'INTERMEDIATE': 75,
      'ADVANCED': 90,
      'EXPERT': 100
    };
    score = proficiencyScores[haveSkill.proficiency as keyof typeof proficiencyScores] || score;
  }
  
  // Add randomness for now
  score += Math.random() * 20 - 10;
  
  return Math.max(0, Math.min(100, score));
}

export default router;