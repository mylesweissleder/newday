import express, { Request, Response } from 'express';

import { requireRole } from '../middleware/auth';

const router = express.Router();
import prisma from "../utils/prisma";

// Get account details
router.get('/', async (req: Request, res: Response) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.user!.accountId },
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

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to fetch account details' });
  }
});

// Update account settings (admin only)
router.put('/', requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    const account = await prisma.account.update({
      where: { id: req.user!.accountId },
      data: { name },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    res.json(account);
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Get account users (admin only)
router.get('/users', requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { accountId: req.user!.accountId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (admin only)
router.put('/users/:userId/role', requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['ADMIN', 'MEMBER', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent user from changing their own role
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await prisma.user.update({
      where: { 
        id: userId,
        accountId: req.user!.accountId
      },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Deactivate user (admin only)
router.put('/users/:userId/deactivate', requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent user from deactivating themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    const user = await prisma.user.update({
      where: { 
        id: userId,
        accountId: req.user!.accountId
      },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

export default router;