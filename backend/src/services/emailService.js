const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { cache } = require('../config/redis');

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateLimit: 14 // messages per second
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify transporter configuration - DISABLED FOR PERFORMANCE TESTING
// transporter.verify((error, success) => {
//   if (error) {
//     console.error('Email transporter configuration error:', error);
//   } else {
//     console.log('Email server is ready to take our messages');
//   }
// });
console.log('⚠️ Email transporter verification disabled for performance testing');

// Template cache
const templateCache = new Map();

// Load and compile email template
const loadTemplate = async (templateName) => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }

  try {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
    const templateSource = await fs.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    
    templateCache.set(templateName, template);
    return template;
  } catch (error) {
    console.error(`Failed to load email template ${templateName}:`, error);
    throw new Error(`Email template ${templateName} not found`);
  }
};

// Base email sending function
const sendEmail = async (options) => {
  try {
    const {
      to,
      subject,
      template,
      context = {},
      attachments = [],
      priority = 'normal'
    } = options;

    // Rate limiting check
    const rateLimitKey = `email_rate_limit:${to}`;
    const emailCount = await cache.incr(rateLimitKey);
    
    if (emailCount === 1) {
      await cache.expire(rateLimitKey, 3600); // 1 hour window
    }
    
    if (emailCount > 10) { // Max 10 emails per hour per recipient
      throw new Error('Email rate limit exceeded');
    }

    // Load and render template
    const templateFunction = await loadTemplate(template);
    const html = templateFunction({
      ...context,
      baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cexexchange.com',
      companyName: 'CEX Exchange',
      year: new Date().getFullYear()
    });

    // Email options
    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || 'CEX Exchange',
        address: process.env.FROM_EMAIL || process.env.SMTP_USER
      },
      to,
      subject,
      html,
      attachments,
      priority,
      headers: {
        'X-Mailer': 'CEX Exchange System',
        'X-Priority': priority === 'high' ? '1' : priority === 'low' ? '5' : '3'
      }
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to,
      subject,
      template
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

// Verification email
const sendVerificationEmail = async (email, token, userData) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Verify Your CEX Exchange Account',
    template: 'verification',
    context: {
      firstName: userData.firstName,
      username: userData.username,
      verificationUrl,
      expiresIn: '24 hours'
    },
    priority: 'high'
  });
};

// Welcome email
const sendWelcomeEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: 'Welcome to CEX Exchange!',
    template: 'welcome',
    context: {
      firstName: userData.firstName,
      username: userData.username,
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    }
  });
};

// Password reset email
const sendPasswordResetEmail = async (email, token, userData) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your CEX Exchange Password',
    template: 'password-reset',
    context: {
      firstName: userData.firstName,
      resetUrl,
      expiresIn: '10 minutes',
      ipAddress: userData.ipAddress,
      userAgent: userData.userAgent
    },
    priority: 'high'
  });
};

// Password changed notification
const sendPasswordChangedEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: 'Your CEX Exchange Password Has Been Changed',
    template: 'password-changed',
    context: {
      firstName: userData.firstName,
      changeTime: new Date().toLocaleString(),
      ipAddress: userData.ipAddress,
      userAgent: userData.userAgent,
      securityUrl: `${process.env.FRONTEND_URL}/security`
    },
    priority: 'high'
  });
};

// 2FA enabled notification
const send2FAEnabledEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: 'Two-Factor Authentication Enabled',
    template: '2fa-enabled',
    context: {
      firstName: userData.firstName,
      enableTime: new Date().toLocaleString(),
      ipAddress: userData.ipAddress,
      backupCodesCount: userData.backupCodesCount || 10
    }
  });
};

// 2FA disabled notification
const send2FADisabledEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: 'Two-Factor Authentication Disabled',
    template: '2fa-disabled',
    context: {
      firstName: userData.firstName,
      disableTime: new Date().toLocaleString(),
      ipAddress: userData.ipAddress,
      securityUrl: `${process.env.FRONTEND_URL}/security`
    },
    priority: 'high'
  });
};

// Login notification
const sendLoginNotificationEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: 'New Login to Your CEX Exchange Account',
    template: 'login-notification',
    context: {
      firstName: userData.firstName,
      loginTime: new Date().toLocaleString(),
      ipAddress: userData.ipAddress,
      location: userData.location || 'Unknown',
      device: userData.device || 'Unknown',
      securityUrl: `${process.env.FRONTEND_URL}/security`
    }
  });
};

// Suspicious activity alert
const sendSuspiciousActivityEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: 'Suspicious Activity Detected - CEX Exchange',
    template: 'suspicious-activity',
    context: {
      firstName: userData.firstName,
      activityType: userData.activityType,
      activityTime: new Date().toLocaleString(),
      ipAddress: userData.ipAddress,
      location: userData.location || 'Unknown',
      securityUrl: `${process.env.FRONTEND_URL}/security`,
      supportUrl: `${process.env.FRONTEND_URL}/support`
    },
    priority: 'high'
  });
};

// Withdrawal notification
const sendWithdrawalNotificationEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: 'Withdrawal Request - CEX Exchange',
    template: 'withdrawal-notification',
    context: {
      firstName: userData.firstName,
      amount: userData.amount,
      currency: userData.currency,
      address: userData.address,
      transactionId: userData.transactionId,
      requestTime: new Date().toLocaleString(),
      confirmationUrl: userData.confirmationUrl
    },
    priority: 'high'
  });
};

// Deposit confirmation
const sendDepositConfirmationEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: 'Deposit Confirmed - CEX Exchange',
    template: 'deposit-confirmation',
    context: {
      firstName: userData.firstName,
      amount: userData.amount,
      currency: userData.currency,
      transactionId: userData.transactionId,
      confirmationTime: new Date().toLocaleString(),
      dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
    }
  });
};

// KYC status update
const sendKYCStatusEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: `KYC Verification ${userData.status} - CEX Exchange`,
    template: 'kyc-status',
    context: {
      firstName: userData.firstName,
      status: userData.status,
      level: userData.level,
      reason: userData.reason,
      nextSteps: userData.nextSteps,
      kycUrl: `${process.env.FRONTEND_URL}/kyc`
    },
    priority: userData.status === 'rejected' ? 'high' : 'normal'
  });
};

// Newsletter/Marketing email
const sendNewsletterEmail = async (email, userData) => {
  return sendEmail({
    to: email,
    subject: userData.subject,
    template: 'newsletter',
    context: {
      firstName: userData.firstName,
      content: userData.content,
      unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${userData.unsubscribeToken}`
    },
    priority: 'low'
  });
};

// Bulk email sending
const sendBulkEmails = async (emails) => {
  const results = [];
  const batchSize = 10;
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchPromises = batch.map(emailData => 
      sendEmail(emailData).catch(error => ({ error, emailData }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};

// Email queue for background processing
const emailQueue = [];
let isProcessingQueue = false;

const queueEmail = (emailOptions) => {
  emailQueue.push({
    ...emailOptions,
    timestamp: Date.now(),
    retries: 0
  });
  
  processEmailQueue();
};

const processEmailQueue = async () => {
  if (isProcessingQueue || emailQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (emailQueue.length > 0) {
    const emailData = emailQueue.shift();
    
    try {
      await sendEmail(emailData);
      console.log('Queued email sent successfully');
    } catch (error) {
      console.error('Queued email failed:', error);
      
      // Retry logic
      if (emailData.retries < 3) {
        emailData.retries++;
        emailQueue.push(emailData);
      } else {
        console.error('Email failed after 3 retries:', emailData);
      }
    }
    
    // Add small delay between emails
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isProcessingQueue = false;
};

// Health check
const healthCheck = async () => {
  try {
    await transporter.verify();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  send2FAEnabledEmail,
  send2FADisabledEmail,
  sendLoginNotificationEmail,
  sendSuspiciousActivityEmail,
  sendWithdrawalNotificationEmail,
  sendDepositConfirmationEmail,
  sendKYCStatusEmail,
  sendNewsletterEmail,
  sendBulkEmails,
  queueEmail,
  healthCheck
};