const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const { cache } = require('../config/redis');
const { createAuditLog, EVENT_TYPES, LOG_LEVELS, RISK_LEVELS } = require('../services/auditService');
const { sendPasswordChangedEmail, send2FAEnabledEmail, send2FADisabledEmail } = require('../services/emailService');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user from cache first
    const cacheKey = `user_profile:${userId}`;
    let user = await cache.get(cacheKey);
    
    if (!user) {
      user = await User.findByPk(userId, {
        attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Cache user profile for 5 minutes
      await cache.setex(cacheKey, 300, JSON.stringify(user));
    } else {
      user = JSON.parse(user);
    }
    
    // Log profile access
    await createAuditLog({
      userId,
      eventType: EVENT_TYPES.PROFILE_UPDATED,
      level: LOG_LEVELS.INFO,
      riskLevel: RISK_LEVELS.LOW,
      description: 'User accessed profile',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth,
          phoneNumber: user.phoneNumber,
          country: user.country,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          kycLevel: user.kycLevel,
          kycStatus: user.kycStatus,
          twoFactorEnabled: user.twoFactorEnabled,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      country,
      address,
      city,
      postalCode
    } = req.body;
    
    // Validate input
    const allowedFields = {
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
      country,
      address,
      city,
      postalCode
    };
    
    // Remove undefined fields
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    // Validate phone number format if provided
    if (phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }
    
    // Validate date of birth if provided
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 18);
      
      if (dob > minAge) {
        return res.status(400).json({
          success: false,
          message: 'You must be at least 18 years old'
        });
      }
    }
    
    // Update user
    const [updatedRowsCount] = await User.update(updateData, {
      where: { id: userId }
    });
    
    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get updated user
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });
    
    // Clear cache
    await cache.del(`user_profile:${userId}`);
    
    // Log profile update
    await createAuditLog({
      userId,
      eventType: EVENT_TYPES.PROFILE_UPDATED,
      level: LOG_LEVELS.INFO,
      riskLevel: RISK_LEVELS.LOW,
      description: 'User updated profile',
      metadata: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      // Log failed password change attempt
      await createAuditLog({
        userId,
        eventType: EVENT_TYPES.PASSWORD_CHANGE,
        level: LOG_LEVELS.WARNING,
        riskLevel: RISK_LEVELS.MEDIUM,
        description: 'Failed password change attempt - incorrect current password',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID
      });
      
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }
    
    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await User.update(
      { 
        password: hashedPassword,
        passwordChangedAt: new Date()
      },
      { where: { id: userId } }
    );
    
    // Clear user cache
    await cache.del(`user_profile:${userId}`);
    
    // Invalidate all user sessions except current
    const sessionPattern = `sess:*`;
    const sessions = await cache.keys(sessionPattern);
    
    for (const sessionKey of sessions) {
      const sessionData = await cache.get(sessionKey);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session.userId === userId && sessionKey !== `sess:${req.sessionID}`) {
            await cache.del(sessionKey);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    // Log successful password change
    await createAuditLog({
      userId,
      eventType: EVENT_TYPES.PASSWORD_CHANGE,
      level: LOG_LEVELS.INFO,
      riskLevel: RISK_LEVELS.MEDIUM,
      description: 'Password changed successfully',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    // Send email notification
    try {
      await sendPasswordChangedEmail(user.email, {
        firstName: user.firstName,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (emailError) {
      console.error('Failed to send password change email:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Password changed successfully. You have been logged out of other devices.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Enable 2FA
const enable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled'
      });
    }
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${process.env.APP_NAME || 'CEX Exchange'} (${user.email})`,
      issuer: process.env.APP_NAME || 'CEX Exchange',
      length: 32
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    // Store temporary secret in cache (expires in 10 minutes)
    const tempSecretKey = `temp_2fa_secret:${userId}`;
    await cache.setex(tempSecretKey, 600, secret.base32);
    
    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        instructions: {
          step1: 'Install Google Authenticator or similar TOTP app',
          step2: 'Scan the QR code or manually enter the secret key',
          step3: 'Enter the 6-digit code from your app to verify setup'
        }
      }
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify and confirm 2FA setup
const verify2FASetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    if (!token || !/^\d{6}$/.test(token)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA token format'
      });
    }
    
    // Get temporary secret from cache
    const tempSecretKey = `temp_2fa_secret:${userId}`;
    const secret = await cache.get(tempSecretKey);
    
    if (!secret) {
      return res.status(400).json({
        success: false,
        message: '2FA setup session expired. Please start over.'
      });
    }
    
    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) tolerance
    });
    
    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }
    
    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    
    // Hash backup codes for storage
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );
    
    // Update user with 2FA enabled
    await User.update(
      {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes)
      },
      { where: { id: userId } }
    );
    
    // Clear temporary secret
    await cache.del(tempSecretKey);
    
    // Clear user cache
    await cache.del(`user_profile:${userId}`);
    
    // Log 2FA enabled
    await createAuditLog({
      userId,
      eventType: EVENT_TYPES.TWO_FA_ENABLED,
      level: LOG_LEVELS.INFO,
      riskLevel: RISK_LEVELS.LOW,
      description: '2FA enabled successfully',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    // Send email notification
    try {
      const user = await User.findByPk(userId);
      await send2FAEnabledEmail(user.email, {
        firstName: user.firstName,
        ipAddress: req.ip,
        backupCodesCount: backupCodes.length
      });
    } catch (emailError) {
      console.error('Failed to send 2FA enabled email:', emailError);
    }
    
    res.json({
      success: true,
      message: '2FA enabled successfully',
      data: {
        backupCodes,
        warning: 'Save these backup codes in a secure location. They can be used to access your account if you lose your 2FA device.'
      }
    });
  } catch (error) {
    console.error('Verify 2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Disable 2FA
const disable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, token } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to disable 2FA'
      });
    }
    
    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    // Verify 2FA token if provided
    if (token) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2
      });
      
      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }
    }
    
    // Disable 2FA
    await User.update(
      {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: null
      },
      { where: { id: userId } }
    );
    
    // Clear user cache
    await cache.del(`user_profile:${userId}`);
    
    // Log 2FA disabled
    await createAuditLog({
      userId,
      eventType: EVENT_TYPES.TWO_FA_DISABLED,
      level: LOG_LEVELS.WARNING,
      riskLevel: RISK_LEVELS.MEDIUM,
      description: '2FA disabled',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    // Send email notification
    try {
      await send2FADisabledEmail(user.email, {
        firstName: user.firstName,
        ipAddress: req.ip
      });
    } catch (emailError) {
      console.error('Failed to send 2FA disabled email:', emailError);
    }
    
    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user sessions
const getSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all sessions for user
    const sessionPattern = `sess:*`;
    const sessionKeys = await cache.keys(sessionPattern);
    
    const userSessions = [];
    
    for (const sessionKey of sessionKeys) {
      const sessionData = await cache.get(sessionKey);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session.userId === userId) {
            const sessionId = sessionKey.replace('sess:', '');
            userSessions.push({
              sessionId,
              isCurrentSession: sessionId === req.sessionID,
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
              lastActivity: session.lastActivity,
              createdAt: session.createdAt
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        sessions: userSessions.sort((a, b) => 
          new Date(b.lastActivity) - new Date(a.lastActivity)
        )
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Revoke session
const revokeSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    
    if (sessionId === req.sessionID) {
      return res.status(400).json({
        success: false,
        message: 'Cannot revoke current session'
      });
    }
    
    // Check if session belongs to user
    const sessionKey = `sess:${sessionId}`;
    const sessionData = await cache.get(sessionKey);
    
    if (!sessionData) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    const session = JSON.parse(sessionData);
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to revoke this session'
      });
    }
    
    // Revoke session
    await cache.del(sessionKey);
    
    // Log session revocation
    await createAuditLog({
      userId,
      eventType: EVENT_TYPES.USER_LOGOUT,
      level: LOG_LEVELS.INFO,
      riskLevel: RISK_LEVELS.LOW,
      description: 'Session revoked by user',
      metadata: { revokedSessionId: sessionId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Revoke all sessions except current
const revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all sessions for user
    const sessionPattern = `sess:*`;
    const sessionKeys = await cache.keys(sessionPattern);
    
    let revokedCount = 0;
    
    for (const sessionKey of sessionKeys) {
      const sessionData = await cache.get(sessionKey);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session.userId === userId && sessionKey !== `sess:${req.sessionID}`) {
            await cache.del(sessionKey);
            revokedCount++;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    // Log session revocation
    await createAuditLog({
      userId,
      eventType: EVENT_TYPES.USER_LOGOUT,
      level: LOG_LEVELS.INFO,
      riskLevel: RISK_LEVELS.LOW,
      description: 'All sessions revoked by user',
      metadata: { revokedSessionsCount: revokedCount },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    res.json({
      success: true,
      message: `${revokedCount} sessions revoked successfully`
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  enable2FA,
  verify2FASetup,
  disable2FA,
  getSessions,
  revokeSession,
  revokeAllSessions
};