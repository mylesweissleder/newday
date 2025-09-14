import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';

import { emailService } from '../services/email';
import crypto from 'crypto';

const router = express.Router();
import prisma from "../utils/prisma";

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

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).required()
});

// Generate JWT token
const generateToken = (userId: string, accountId: string, email: string): string => {
  return jwt.sign(
    { userId, accountId, email },
    process.env.JWT_SECRET as string,
    { expiresIn: '24h' } // 24 hours for security
  );
};

// Cookie management functions
const setCookies = (res: Response, token: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Set HTTP-only cookie for authentication
  res.cookie('auth-token', token, {
    httpOnly: true,
    secure: isProduction, // Use secure cookies in production
    sameSite: isProduction ? 'none' : 'lax', // 'none' needed for cross-origin in production
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
    path: '/',
    domain: isProduction ? undefined : undefined // Let browser set domain for better mobile compatibility
  });
};

const clearCookies = (res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('auth-token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax', // 'none' needed for cross-origin in production
    path: '/',
    domain: isProduction ? undefined : undefined
  });
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

      // Create admin user (first user becomes crew leader)
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'CREW_LEADER',
          accountId: account.id,
          lastLoginAt: new Date(),
          loginCount: 1
        }
      });

      return { account, user };
    });

    // Generate token
    const token = generateToken(result.user.id, result.account.id, result.user.email);

    // Send welcome email
    try {
      const welcomeEmail = emailService.generateWelcomeEmail({
        userName: `${result.user.firstName} ${result.user.lastName}`,
        userEmail: result.user.email,
        accountName: result.account.name
      });
      
      await emailService.sendEmail(welcomeEmail);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    // Set HTTP-only cookie
    setCookies(res, token);

    const responseData = {
      message: 'Account created successfully',
      token, // Include token for mobile incognito fallback
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        accountId: result.account.id,
        accountName: result.account.name
      }
    };
    

    res.status(201).json(responseData);
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
    if (!user.password) {
      return res.status(401).json({ error: 'Account setup incomplete' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update login tracking
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: user.loginCount + 1
      }
    });

    // Generate token and set HTTP-only cookie
    const token = generateToken(user.id, user.accountId, user.email);
    setCookies(res, token);
    
    // Mobile debugging
    const userAgent = req.headers['user-agent'] || 'unknown';
    console.log('📱 Login successful:', {
      email: user.email,
      userAgent: userAgent.substring(0, 100),
      isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent)
    });

    res.json({
      message: 'Login successful',
      token, // Include token for mobile incognito fallback
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

// Profile endpoint - validates JWT cookie or Authorization header
router.get('/profile', async (req: Request, res: Response) => {
  try {
    // Try to get token from HTTP-only cookie first, then fallback to Authorization header
    let token = req.cookies['auth-token'];
    
    // Fallback for Safari/mobile incognito mode: check Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { account: true }
    });

    if (!user || !user.isActive || !user.account.isActive) {
      clearCookies(res);
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    res.json({
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
    console.error('Profile error:', error);
    clearCookies(res);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Get token from cookie instead of Authorization header
    const token = req.cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify current token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get user details from database to ensure they're still active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { account: true }
    });

    if (!user || !user.isActive || !user.account.isActive) {
      clearCookies(res);
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    // Generate new token and set new cookie
    const newToken = generateToken(user.id, user.accountId, user.email);
    setCookies(res, newToken);

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Token refresh error:', error);
    clearCookies(res);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  try {
    clearCookies(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email } = value;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        isActive: true 
      }
    });

    // Always return success to prevent email enumeration attacks
    if (!user || !user.isActive) {
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send password reset email
    try {
      const resetLink = `${process.env.CLIENT_URL || 'https://api.whatintheworldwasthat.com'}/reset-password?token=${resetToken}`;
      
      const resetEmail = emailService.generatePasswordResetEmail({
        userName: `${user.firstName} ${user.lastName}`,
        resetLink: resetLink
      });
      
      resetEmail.to = [user.email];
      await emailService.sendEmail(resetEmail);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Still return success to user but log the error
    }

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { token, password } = value;

    // Find user by reset token
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
      select: { 
        id: true, 
        resetTokenExpiry: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Test email endpoint (for development/testing)
router.post('/test-email', async (req: Request, res: Response) => {
  try {
    const { email, type } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const validTypes = ['referral', 'confirmation', 'success', 'welcome', 'invitation', 'password-reset'];
    const emailType = validTypes.includes(type) ? type : 'welcome';

    await emailService.sendTestEmail(email, emailType as any);

    res.json({ 
      message: `Test ${emailType} email sent successfully to ${email}`,
      type: emailType
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;


