import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const registerSchema = Joi.object({
  accountName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const inviteUserSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('ADMIN', 'MEMBER', 'VIEWER').default('MEMBER')
});

// Generate JWT token
const generateToken = (userId: string, accountId: string, email: string): 
  string => {
  return jwt.sign(
    { userId, accountId, email },
  process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register new account and admin user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { accountName, email, password, firstName, lastName } = value;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create account and admin user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create account
      const account = await tx.account.create({
        data: {
          name: accountName,
          email: email,
          password: hashedPassword
        }
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'ADMIN',
          accountId: account.id
        }
      });

      return { account, user };
    });

    // Generate token
    const token = generateToken(result.user.id, result.account.id, result.user.email);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        accountId: result.account.id,
        accountName: result.account.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Find user with account
    const user = await prisma.user.findUnique({
      where: { email },
      include: { account: true }
    });

    if (!user || !user.isActive || !user.account.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.accountId, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountId: user.accountId,
        accountName: user.account.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Invite user to account (admin only)
router.post('/invite', async (req: Request, res: Response) => {
  try {
    const { error, value } = inviteUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // This would typically send an email invitation
    // For now, we'll create a user with a temporary password
    const { email, firstName, lastName, role } = value;
    const tempPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // This should be called with authentication middleware
    // For now, assuming we have accountId from somewhere
    
    res.json({
      message: 'User invitation sent',
      tempPassword // In production, this would be sent via email
    });
  } catch (error) {
    console.error('Invitation error:', error);
    res.status(500).json({ error: 'Invitation failed' });
  }
});


export default router;


