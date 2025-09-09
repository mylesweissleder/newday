import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { emailService } from '../services/email';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const inviteUserSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('ADMIN', 'MEMBER', 'VIEWER').default('MEMBER')
});

const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid('CREW_LEADER', 'ADMIN', 'MEMBER', 'VIEWER').required()
});

// Helper function to check if user has crew management permissions
const hasCrewPermissions = (userRole: string): boolean => {
  return ['CREW_LEADER', 'ADMIN'].includes(userRole);
};

// Get all crew members (crew leaders and admins only)
router.get('/members', async (req: Request, res: Response) => {
  try {
    console.log('Crew members request - user:', req.user);
    
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    console.log('Current user found:', currentUser?.email, currentUser?.role);

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const crewMembers = await prisma.user.findMany({
      where: { 
        accountId: req.user.accountId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePic: true,
        role: true,
        isActive: true,
        createdAt: true,
        invitedAt: true,
        acceptedAt: true,
        invitedBy: true,
        lastLoginAt: true,
        loginCount: true
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Get invitation details for invited members
    const membersWithInviteInfo = await Promise.all(
      crewMembers.map(async (member) => {
        let inviterName = null;
        if (member.invitedBy) {
          const inviter = await prisma.user.findUnique({
            where: { id: member.invitedBy },
            select: { firstName: true, lastName: true }
          });
          if (inviter) {
            inviterName = `${inviter.firstName} ${inviter.lastName}`;
          }
        }

        return {
          ...member,
          inviterName,
          isInvited: !!member.invitedAt && !member.acceptedAt,
          isPending: !!member.invitedAt && !member.acceptedAt && !member.lastLoginAt
        };
      })
    );

    res.json(membersWithInviteInfo);
  } catch (error) {
    console.error('Get crew members error:', error);
    res.status(500).json({ error: 'Failed to get crew members' });
  }
});

// Invite new crew member
router.post('/invite', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const { error, value } = inviteUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, firstName, lastName, role } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Create invited user (without password initially)
    const invitedUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        accountId: req.user!.accountId,
        invitationToken,
        invitedAt: new Date(),
        invitedBy: req.user!.id,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        invitedAt: true
      }
    });

    // Send invitation email with token
    const invitationLink = `${process.env.CLIENT_URL || 'https://api.whatintheworldwasthat.com'}/accept-invitation?token=${invitationToken}`;
    
    try {
      const inviterUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { account: true }
      });

      if (inviterUser) {
        const invitationEmail = emailService.generateCrewInvitationEmail({
          inviteeName: firstName,
          inviterName: `${inviterUser.firstName} ${inviterUser.lastName}`,
          accountName: inviterUser.account.name,
          role: role,
          invitationLink: invitationLink
        });
        
        invitationEmail.to = [email];
        await emailService.sendEmail(invitationEmail);
        console.log('Invitation email sent successfully to:', email);
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the whole operation if email fails
    }

    res.status(201).json({
      message: 'Crew member invited successfully',
      user: invitedUser,
      invitationLink
    });
  } catch (error) {
    console.error('Invite crew member error:', error);
    res.status(500).json({ error: 'Failed to invite crew member' });
  }
});

// Accept invitation
router.post('/accept-invitation', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Invitation token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Find user by invitation token
    const user = await prisma.user.findUnique({
      where: { invitationToken: token },
      include: { account: true }
    });

    if (!user || !user.invitedAt) {
      return res.status(404).json({ error: 'Invalid or expired invitation token' });
    }

    if (user.acceptedAt) {
      return res.status(400).json({ error: 'Invitation already accepted' });
    }

    // Check if invitation is not too old (e.g., 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (user.invitedAt < sevenDaysAgo) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Hash password and complete the invitation
    const hashedPassword = await bcrypt.hash(password, 12);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        acceptedAt: new Date(),
        invitationToken: null,
        lastLoginAt: new Date(),
        loginCount: 1
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        accountId: true,
        account: {
          select: { name: true }
        }
      }
    });

    // Generate JWT token for immediate login
    const jwt = require('jsonwebtoken');
    const token_jwt = jwt.sign(
      { 
        userId: updatedUser.id, 
        accountId: updatedUser.accountId, 
        email: updatedUser.email 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Invitation accepted successfully',
      token: token_jwt,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        accountId: updatedUser.accountId,
        accountName: updatedUser.account.name
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Update crew member role
router.put('/members/:id/role', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const { error, value } = updateUserRoleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { role } = value;
    const targetUserId = req.params.id;

    // Can't modify your own role
    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot modify your own role' });
    }

    // Find target user
    const targetUser = await prisma.user.findFirst({
      where: { 
        id: targetUserId,
        accountId: req.user!.accountId
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    // Only crew leaders can assign crew leader role
    if (role === 'CREW_LEADER' && currentUser.role !== 'CREW_LEADER') {
      return res.status(403).json({ error: 'Only crew leaders can assign crew leader role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    res.json({
      message: 'Crew member role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update crew member role error:', error);
    res.status(500).json({ error: 'Failed to update crew member role' });
  }
});

// Deactivate crew member
router.put('/members/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const targetUserId = req.params.id;

    // Can't deactivate yourself
    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Find target user
    const targetUser = await prisma.user.findFirst({
      where: { 
        id: targetUserId,
        accountId: req.user!.accountId
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    res.json({
      message: 'Crew member deactivated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Deactivate crew member error:', error);
    res.status(500).json({ error: 'Failed to deactivate crew member' });
  }
});

// Reactivate crew member
router.put('/members/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const targetUserId = req.params.id;

    const updatedUser = await prisma.user.update({
      where: { 
        id: targetUserId,
        accountId: req.user!.accountId
      },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    res.json({
      message: 'Crew member reactivated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Reactivate crew member error:', error);
    res.status(500).json({ error: 'Failed to reactivate crew member' });
  }
});

// Delete crew member (crew leaders only)
router.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || currentUser.role !== 'CREW_LEADER') {
      return res.status(403).json({ error: 'Crew leader access required' });
    }

    const targetUserId = req.params.id;

    // Can't delete yourself
    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Find target user
    const targetUser = await prisma.user.findFirst({
      where: { 
        id: targetUserId,
        accountId: req.user!.accountId
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    // Instead of hard delete, we'll deactivate and mark for deletion
    await prisma.user.update({
      where: { id: targetUserId },
      data: { 
        isActive: false,
        email: `deleted_${Date.now()}_${targetUser.email}` // Prevent email conflicts
      }
    });

    res.json({
      message: 'Crew member deleted successfully'
    });
  } catch (error) {
    console.error('Delete crew member error:', error);
    res.status(500).json({ error: 'Failed to delete crew member' });
  }
});

// Generate or regenerate join code for the crew
router.post('/join-code/generate', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { account: true }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    // Generate a readable join code (e.g., CREW-ABC123)
    const joinCode = `CREW-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const updatedAccount = await prisma.account.update({
      where: { id: req.user!.accountId },
      data: {
        joinCode,
        joinCodeEnabled: true
      },
      select: {
        joinCode: true,
        joinCodeEnabled: true,
        name: true
      }
    });

    res.json({
      message: 'Join code generated successfully',
      joinCode: updatedAccount.joinCode,
      enabled: updatedAccount.joinCodeEnabled,
      accountName: updatedAccount.name
    });
  } catch (error) {
    console.error('Generate join code error:', error);
    res.status(500).json({ error: 'Failed to generate join code' });
  }
});

// Get current join code
router.get('/join-code', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { account: true }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    res.json({
      joinCode: currentUser.account.joinCode,
      enabled: currentUser.account.joinCodeEnabled,
      accountName: currentUser.account.name
    });
  } catch (error) {
    console.error('Get join code error:', error);
    res.status(500).json({ error: 'Failed to get join code' });
  }
});

// Toggle join code enabled/disabled
router.put('/join-code/toggle', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { account: true }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const { enabled } = req.body;

    const updatedAccount = await prisma.account.update({
      where: { id: req.user!.accountId },
      data: { joinCodeEnabled: enabled },
      select: {
        joinCode: true,
        joinCodeEnabled: true,
        name: true
      }
    });

    res.json({
      message: `Join code ${enabled ? 'enabled' : 'disabled'} successfully`,
      joinCode: updatedAccount.joinCode,
      enabled: updatedAccount.joinCodeEnabled
    });
  } catch (error) {
    console.error('Toggle join code error:', error);
    res.status(500).json({ error: 'Failed to toggle join code' });
  }
});

// Join crew using join code (for members)
router.post('/join-request', async (req: Request, res: Response) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({ error: 'Join code is required' });
    }

    // Find account by join code
    const account = await prisma.account.findUnique({
      where: { joinCode: joinCode.toUpperCase() }
    });

    if (!account || !account.joinCodeEnabled) {
      return res.status(404).json({ error: 'Invalid or inactive join code' });
    }

    // Check if user is already authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User must be logged in to join a crew' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already in this account
    if (currentUser.accountId === account.id) {
      return res.status(400).json({ error: 'You are already a member of this crew' });
    }

    // Update user's account to join the crew
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        accountId: account.id,
        role: 'MEMBER', // Default role for join requests
        invitedAt: new Date(),
        acceptedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        accountId: true,
        account: {
          select: { name: true }
        }
      }
    });

    res.json({
      message: 'Successfully joined the crew!',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        accountId: updatedUser.accountId,
        accountName: updatedUser.account.name
      }
    });
  } catch (error) {
    console.error('Join crew error:', error);
    res.status(500).json({ error: 'Failed to join crew' });
  }
});

// Search crew by join code (public endpoint to preview crew info)
router.get('/search/:joinCode', async (req: Request, res: Response) => {
  try {
    const { joinCode } = req.params;

    const account = await prisma.account.findUnique({
      where: { joinCode: joinCode.toUpperCase() },
      select: {
        id: true,
        name: true,
        joinCodeEnabled: true,
        createdAt: true,
        _count: {
          select: {
            users: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!account || !account.joinCodeEnabled) {
      return res.status(404).json({ error: 'Crew not found or join code is inactive' });
    }

    res.json({
      accountName: account.name,
      memberCount: account._count.users,
      createdAt: account.createdAt
    });
  } catch (error) {
    console.error('Search crew error:', error);
    res.status(500).json({ error: 'Failed to search crew' });
  }
});

// Get crew analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const accountId = req.user!.accountId;

    // Get basic counts
    const [totalUsers, activeUsers, totalContacts, activeCampaigns] = await Promise.all([
      prisma.user.count({
        where: { accountId }
      }),
      prisma.user.count({
        where: { accountId, isActive: true }
      }),
      prisma.contact.count({
        where: { accountId, status: 'ACTIVE' }
      }),
      prisma.campaign.count({
        where: { accountId, status: 'ACTIVE' }
      })
    ]);

    // Get user activity in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.user.findMany({
      where: {
        accountId,
        lastLoginAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
        loginCount: true
      },
      orderBy: { lastLoginAt: 'desc' }
    });

    // Get contact creation by user
    const contactsByUser = await prisma.contact.groupBy({
      by: ['createdById'],
      where: {
        accountId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      }
    });

    // Get user details for contact stats
    const userContactStats = await Promise.all(
      contactsByUser.map(async (stat) => {
        const user = await prisma.user.findUnique({
          where: { id: stat.createdById },
          select: { firstName: true, lastName: true }
        });
        return {
          userId: stat.createdById,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          contactsCreated: stat._count.id
        };
      })
    );

    res.json({
      summary: {
        totalUsers,
        activeUsers,
        totalContacts,
        activeCampaigns,
        inactiveUsers: totalUsers - activeUsers
      },
      recentActivity,
      contactsByUser: userContactStats,
      periodDays: 30
    });
  } catch (error) {
    console.error('Get crew analytics error:', error);
    res.status(500).json({ error: 'Failed to get crew analytics' });
  }
});

// Search for existing users to add to crew
router.get('/search', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    // Find users by email that are not already in this account
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: email,
          mode: 'insensitive'
        },
        accountId: {
          not: req.user!.accountId
        },
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePic: true,
        account: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 10
    });

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Add existing user to crew
router.post('/add-member', async (req: Request, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser || !hasCrewPermissions(currentUser.role)) {
      return res.status(403).json({ error: 'Crew leadership access required' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.accountId === req.user!.accountId) {
      return res.status(400).json({ error: 'User is already a member of this crew' });
    }

    // Update the user to join this account
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        accountId: req.user!.accountId,
        role: 'MEMBER', // Default role
        invitedAt: new Date(),
        invitedBy: req.user!.id,
        acceptedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        account: {
          select: { name: true }
        }
      }
    });

    res.json({
      message: 'User added to crew successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Add crew member error:', error);
    res.status(500).json({ error: 'Failed to add crew member' });
  }
});

export default router;