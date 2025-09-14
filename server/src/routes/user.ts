import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';


const router = express.Router();
import prisma from "../utils/prisma";

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  bio: Joi.string().max(500).optional().allow(''),
  phone: Joi.string().max(20).optional().allow(''),
  timezone: Joi.string().max(50).optional().allow(''),
  profilePic: Joi.string().optional().allow('')
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

// Get current user profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePic: true,
        bio: true,
        phone: true,
        timezone: true,
        role: true,
        createdAt: true,
        skills: {
          include: {
            skill: true
          },
          where: {
            isActive: true
          }
        },
        account: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, ...otherFields } = value;

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser && existingUser.id !== req.user!.id) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...otherFields,
        ...(email && { email })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePic: true,
        bio: true,
        phone: true,
        timezone: true,
        role: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', async (req: Request, res: Response) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { currentPassword, newPassword } = value;

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    if (!user.password) {
      return res.status(400).json({ error: 'Account has no password set' });
    }
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Upload profile picture (placeholder for now - would integrate with file upload service)
router.post('/profile-picture', async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { profilePic: imageUrl },
      select: {
        id: true,
        profilePic: true
      }
    });

    res.json({
      message: 'Profile picture updated successfully',
      profilePic: updatedUser.profilePic
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Delete profile picture
router.delete('/profile-picture', async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { profilePic: null }
    });

    res.json({ message: 'Profile picture removed successfully' });
  } catch (error) {
    console.error('Remove profile picture error:', error);
    res.status(500).json({ error: 'Failed to remove profile picture' });
  }
});

// Get account settings (admin only)
router.get('/account', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { account: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const account = await prisma.account.findUnique({
      where: { id: user.accountId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            contacts: true,
            campaigns: true
          }
        }
      }
    });

    res.json(account);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to get account information' });
  }
});

// Update account settings (admin only)
router.put('/account', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Account name must be at least 2 characters' });
    }

    const updatedAccount = await prisma.account.update({
      where: { id: user.accountId },
      data: { name: name.trim() }
    });

    res.json({
      message: 'Account updated successfully',
      account: updatedAccount
    });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Skills management routes
router.post('/skills', async (req: Request, res: Response) => {
  try {
    const { skillName, type, proficiency, notes } = req.body;

    if (!skillName || !type) {
      return res.status(400).json({ error: 'Skill name and type are required' });
    }

    if (!['ASK', 'HAVE'].includes(type)) {
      return res.status(400).json({ error: 'Type must be ASK or HAVE' });
    }

    // Find or create skill
    let skill = await prisma.skill.findUnique({
      where: { name: skillName.trim() }
    });

    if (!skill) {
      skill = await prisma.skill.create({
        data: { name: skillName.trim() }
      });
    }

    // Check if user already has this skill with this type
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId_type: {
          userId: req.user!.id,
          skillId: skill.id,
          type
        }
      }
    });

    if (existingUserSkill) {
      return res.status(409).json({ error: 'You already have this skill/need' });
    }

    // Create user skill
    const userSkill = await prisma.userSkill.create({
      data: {
        userId: req.user!.id,
        skillId: skill.id,
        type,
        proficiency: type === 'HAVE' ? proficiency : undefined,
        notes: notes || undefined,
        isActive: true
      },
      include: {
        skill: true
      }
    });

    res.json({
      message: 'Skill added successfully',
      userSkill
    });
  } catch (error) {
    console.error('Add user skill error:', error);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

router.delete('/skills/:userSkillId', async (req: Request, res: Response) => {
  try {
    const { userSkillId } = req.params;

    const userSkill = await prisma.userSkill.findUnique({
      where: { id: userSkillId }
    });

    if (!userSkill || userSkill.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    await prisma.userSkill.delete({
      where: { id: userSkillId }
    });

    res.json({ message: 'Skill removed successfully' });
  } catch (error) {
    console.error('Remove user skill error:', error);
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

router.get('/skills/available', async (req: Request, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });

    res.json(skills);
  } catch (error) {
    console.error('Get available skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

export default router;