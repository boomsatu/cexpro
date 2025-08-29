const twilio = require('twilio');
const crypto = require('crypto');
const { cache } = require('../config/redis');

// Twilio configuration
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  serviceSid: process.env.TWILIO_SERVICE_SID,
  fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890'
};

// Initialize Twilio client (only if credentials are available)
let client = null;
if (twilioConfig.accountSid && twilioConfig.authToken && 
    twilioConfig.accountSid.startsWith('AC') && twilioConfig.authToken.length > 10) {
  client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
} else {
  console.warn('Twilio credentials not configured. SMS service will be disabled.');
}

// SMS Service class
class SMSService {
  constructor() {
    this.client = client;
    this.fromNumber = twilioConfig.fromNumber;
    this.isEnabled = !!client;
  }

  // Generate SMS verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send SMS verification code
  async sendVerificationCode(phoneNumber, userId) {
    if (!this.isEnabled) {
      console.warn('SMS service is disabled. Returning mock verification code.');
      const code = this.generateVerificationCode();
      const cacheKey = `sms_verification:${userId}`;
      
      await cache.set(cacheKey, {
        code,
        phoneNumber,
        attempts: 0,
        createdAt: new Date()
      }, 600);
      
      return {
        success: true,
        messageSid: 'mock_message_id',
        code: process.env.NODE_ENV === 'development' ? code : undefined
      };
    }
    
    try {
      const code = this.generateVerificationCode();
      const cacheKey = `sms_verification:${userId}`;
      
      // Store code in cache with 10 minutes expiry
      await cache.set(cacheKey, {
        code,
        phoneNumber,
        attempts: 0,
        createdAt: new Date()
      }, 600); // 10 minutes

      // Send SMS
      const message = await this.client.messages.create({
        body: `Your CEX verification code is: ${code}. This code will expire in 10 minutes.`,
        from: this.fromNumber,
        to: phoneNumber
      });

      console.log(`SMS sent to ${phoneNumber}: ${message.sid}`);
      return {
        success: true,
        messageSid: message.sid,
        code: process.env.NODE_ENV === 'development' ? code : undefined
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      throw new Error('Failed to send SMS verification code');
    }
  }

  // Verify SMS code
  async verifyCode(userId, code) {
    try {
      const cacheKey = `sms_verification:${userId}`;
      const storedData = await cache.get(cacheKey);

      if (!storedData) {
        return {
          success: false,
          error: 'Verification code expired or not found'
        };
      }

      // Check attempts
      if (storedData.attempts >= 3) {
        await cache.del(cacheKey);
        return {
          success: false,
          error: 'Too many failed attempts. Please request a new code.'
        };
      }

      // Verify code
      if (storedData.code !== code) {
        // Increment attempts
        storedData.attempts += 1;
        await cache.set(cacheKey, storedData, 600);
        
        return {
          success: false,
          error: 'Invalid verification code',
          attemptsLeft: 3 - storedData.attempts
        };
      }

      // Code is valid, remove from cache
      await cache.del(cacheKey);
      
      return {
        success: true,
        phoneNumber: storedData.phoneNumber
      };
    } catch (error) {
      console.error('SMS verification error:', error);
      throw new Error('Failed to verify SMS code');
    }
  }

  // Send SMS notification
  async sendNotification(phoneNumber, message) {
    if (!this.isEnabled) {
      console.warn('SMS service is disabled. Notification not sent:', message);
      return {
        success: true,
        messageSid: 'mock_notification_id'
      };
    }
    
    try {
      const sms = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      });

      console.log(`SMS notification sent to ${phoneNumber}: ${sms.sid}`);
      return {
        success: true,
        messageSid: sms.sid
      };
    } catch (error) {
      console.error('SMS notification error:', error);
      throw new Error('Failed to send SMS notification');
    }
  }

  // Send security alert
  async sendSecurityAlert(phoneNumber, alertType, details = {}) {
    try {
      let message = '';
      
      switch (alertType) {
        case 'login':
          message = `Security Alert: New login detected on your CEX account from ${details.location || 'unknown location'} at ${new Date().toLocaleString()}.`;
          break;
        case 'withdrawal':
          message = `Security Alert: Withdrawal request of ${details.amount || 'unknown amount'} ${details.currency || ''} initiated on your CEX account.`;
          break;
        case 'password_change':
          message = 'Security Alert: Your CEX account password has been changed. If this was not you, please contact support immediately.';
          break;
        case 'suspicious_activity':
          message = 'Security Alert: Suspicious activity detected on your CEX account. Please review your account and contact support if needed.';
          break;
        default:
          message = 'Security Alert: Important activity detected on your CEX account. Please check your account for details.';
      }

      return await this.sendNotification(phoneNumber, message);
    } catch (error) {
      console.error('Security alert SMS error:', error);
      throw new Error('Failed to send security alert SMS');
    }
  }

  // Send trading notification
  async sendTradingNotification(phoneNumber, notificationType, details = {}) {
    try {
      let message = '';
      
      switch (notificationType) {
        case 'order_filled':
          message = `Trade Alert: Your ${details.side || ''} order for ${details.amount || ''} ${details.symbol || ''} has been filled at ${details.price || ''}.`;
          break;
        case 'order_cancelled':
          message = `Trade Alert: Your ${details.side || ''} order for ${details.amount || ''} ${details.symbol || ''} has been cancelled.`;
          break;
        case 'price_alert':
          message = `Price Alert: ${details.symbol || ''} has reached your target price of ${details.price || ''}.`;
          break;
        case 'margin_call':
          message = `Margin Call: Your margin position requires additional funds. Please add funds or close positions to avoid liquidation.`;
          break;
        default:
          message = 'Trading Alert: Important trading activity on your CEX account.';
      }

      return await this.sendNotification(phoneNumber, message);
    } catch (error) {
      console.error('Trading notification SMS error:', error);
      throw new Error('Failed to send trading notification SMS');
    }
  }

  // Check SMS service health
  async healthCheck() {
    if (!this.isEnabled) {
      return {
        status: 'disabled',
        service: 'SMS (Twilio)',
        message: 'Twilio credentials not configured'
      };
    }
    
    try {
      // Try to get account info to verify connection
      const account = await this.client.api.accounts(twilioConfig.accountSid).fetch();
      
      return {
        status: 'healthy',
        service: 'SMS (Twilio)',
        accountSid: account.sid,
        accountStatus: account.status
      };
    } catch (error) {
      console.error('SMS service health check failed:', error);
      return {
        status: 'unhealthy',
        service: 'SMS (Twilio)',
        error: error.message
      };
    }
  }
}

// Create and export SMS service instance
const smsService = new SMSService();

module.exports = {
  smsService,
  SMSService
};