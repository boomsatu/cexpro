const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');
const zxcvbn = require('zxcvbn');

/**
 * Handle validation errors middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Email validation rules
 */
const validateEmail = () => [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    })
    .isLength({ max: 254 })
    .withMessage('Email address is too long')
    .custom(async (email) => {
      // Check for disposable email domains
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'temp-mail.org'
      ];
      
      const domain = email.split('@')[1];
      if (disposableDomains.includes(domain.toLowerCase())) {
        throw new Error('Disposable email addresses are not allowed');
      }
      
      return true;
    })
];

/**
 * Password validation rules
 */
const validatePassword = (fieldName = 'password', options = {}) => {
  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    minStrength = 2,
    checkCommonPasswords = true
  } = options;

  return [
    body(fieldName)
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`Password must be between ${minLength} and ${maxLength} characters`)
      .custom((password) => {
        // Check password strength using zxcvbn
        if (checkCommonPasswords) {
          const strength = zxcvbn(password);
          if (strength.score < minStrength) {
            throw new Error(`Password is too weak. ${strength.feedback.suggestions.join(' ')}`);
          }
        }

        // Character requirements
        const checks = [];
        
        if (requireUppercase && !/[A-Z]/.test(password)) {
          checks.push('at least one uppercase letter');
        }
        
        if (requireLowercase && !/[a-z]/.test(password)) {
          checks.push('at least one lowercase letter');
        }
        
        if (requireNumbers && !/\d/.test(password)) {
          checks.push('at least one number');
        }
        
        if (requireSpecialChars && !/[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
          checks.push('at least one special character');
        }
        
        if (checks.length > 0) {
          throw new Error(`Password must contain ${checks.join(', ')}`);
        }
        
        // Check for common patterns
        if (/^(.)\1+$/.test(password)) {
          throw new Error('Password cannot be all the same character');
        }
        
        if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
          throw new Error('Password cannot contain sequential characters');
        }
        
        return true;
      })
  ];
};

/**
 * Username validation rules
 */
const validateUsername = () => [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
    .custom((username) => {
      // Check for reserved usernames
      const reservedUsernames = [
        'admin', 'administrator', 'root', 'system', 'api', 'www', 'mail',
        'ftp', 'support', 'help', 'info', 'contact', 'sales', 'marketing',
        'security', 'privacy', 'terms', 'about', 'blog', 'news', 'press',
        'legal', 'copyright', 'trademark', 'null', 'undefined', 'test',
        'demo', 'example', 'sample', 'guest', 'anonymous', 'user', 'users',
        'account', 'accounts', 'profile', 'profiles', 'settings', 'config',
        'configuration', 'dashboard', 'panel', 'control', 'manage', 'manager'
      ];
      
      if (reservedUsernames.includes(username.toLowerCase())) {
        throw new Error('This username is reserved and cannot be used');
      }
      
      // Check for inappropriate content (basic check)
      const inappropriateWords = [
        'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
        'nazi', 'hitler', 'terrorist', 'bomb', 'kill', 'murder'
      ];
      
      const lowerUsername = username.toLowerCase();
      for (const word of inappropriateWords) {
        if (lowerUsername.includes(word)) {
          throw new Error('Username contains inappropriate content');
        }
      }
      
      return true;
    })
];

/**
 * Name validation rules
 */
const validateName = (fieldName, options = {}) => {
  const { minLength = 1, maxLength = 50, required = false } = options;
  
  const validation = body(fieldName);
  
  if (required) {
    validation.notEmpty().withMessage(`${fieldName} is required`);
  } else {
    validation.optional();
  }
  
  return [
    validation
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${fieldName} must be between ${minLength} and ${maxLength} characters`)
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`)
      .custom((name) => {
        if (name && name.trim().length === 0) {
          throw new Error(`${fieldName} cannot be empty or only whitespace`);
        }
        return true;
      })
  ];
};

/**
 * Phone number validation rules
 */
const validatePhoneNumber = (required = false) => {
  const validation = body('phoneNumber');
  
  if (required) {
    validation.notEmpty().withMessage('Phone number is required');
  } else {
    validation.optional();
  }
  
  return [
    validation
      .custom((phone) => {
        if (phone && !validator.isMobilePhone(phone, 'any', { strictMode: false })) {
          throw new Error('Please provide a valid phone number');
        }
        return true;
      })
  ];
};

/**
 * Date of birth validation rules
 */
const validateDateOfBirth = (required = false) => {
  const validation = body('dateOfBirth');
  
  if (required) {
    validation.notEmpty().withMessage('Date of birth is required');
  } else {
    validation.optional();
  }
  
  return [
    validation
      .isISO8601()
      .withMessage('Date of birth must be a valid date')
      .custom((dob) => {
        if (!dob) return true;
        
        const birthDate = new Date(dob);
        const today = new Date();
        
        // Check minimum age (18 years)
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 18);
        
        if (birthDate > minAge) {
          throw new Error('You must be at least 18 years old');
        }
        
        // Check maximum age (120 years)
        const maxAge = new Date();
        maxAge.setFullYear(maxAge.getFullYear() - 120);
        
        if (birthDate < maxAge) {
          throw new Error('Invalid date of birth');
        }
        
        // Check if date is not in the future
        if (birthDate > today) {
          throw new Error('Date of birth cannot be in the future');
        }
        
        return true;
      })
  ];
};

/**
 * Country code validation rules
 */
const validateCountryCode = (required = false) => {
  const validation = body('country');
  
  if (required) {
    validation.notEmpty().withMessage('Country is required');
  } else {
    validation.optional();
  }
  
  return [
    validation
      .isLength({ min: 2, max: 2 })
      .withMessage('Country must be a 2-letter ISO country code')
      .isAlpha()
      .withMessage('Country code must contain only letters')
      .toUpperCase()
      .custom((countryCode) => {
        if (!countryCode) return true;
        
        // List of valid ISO 3166-1 alpha-2 country codes
        const validCountries = [
          'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
          'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
          'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
          'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
          'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
          'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
          'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
          'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
          'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
          'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
          'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
          'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
          'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
          'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
          'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
          'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
          'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
          'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
          'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
          'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
          'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
        ];
        
        if (!validCountries.includes(countryCode)) {
          throw new Error('Invalid country code');
        }
        
        return true;
      })
  ];
};

/**
 * 2FA token validation rules
 */
const validate2FAToken = (fieldName = 'token') => [
  body(fieldName)
    .matches(/^\d{6}$/)
    .withMessage('2FA token must be a 6-digit number')
];

/**
 * Address validation rules
 */
const validateAddress = (required = false) => {
  const validation = body('address');
  
  if (required) {
    validation.notEmpty().withMessage('Address is required');
  } else {
    validation.optional();
  }
  
  return [
    validation
      .isLength({ min: 5, max: 200 })
      .withMessage('Address must be between 5 and 200 characters')
      .custom((address) => {
        if (address && address.trim().length === 0) {
          throw new Error('Address cannot be empty or only whitespace');
        }
        return true;
      })
  ];
};

/**
 * City validation rules
 */
const validateCity = (required = false) => {
  const validation = body('city');
  
  if (required) {
    validation.notEmpty().withMessage('City is required');
  } else {
    validation.optional();
  }
  
  return [
    validation
      .isLength({ min: 1, max: 100 })
      .withMessage('City must be between 1 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('City can only contain letters, spaces, hyphens, and apostrophes')
  ];
};

/**
 * Postal code validation rules
 */
const validatePostalCode = (required = false) => {
  const validation = body('postalCode');
  
  if (required) {
    validation.notEmpty().withMessage('Postal code is required');
  } else {
    validation.optional();
  }
  
  return [
    validation
      .isLength({ min: 3, max: 20 })
      .withMessage('Postal code must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9\s-]+$/)
      .withMessage('Postal code can only contain letters, numbers, spaces, and hyphens')
  ];
};

/**
 * UUID validation rules
 */
const validateUUID = (fieldName, location = 'param') => {
  const validator = location === 'param' ? param(fieldName) : 
                   location === 'query' ? query(fieldName) : 
                   body(fieldName);
  
  return [
    validator
      .isUUID()
      .withMessage(`${fieldName} must be a valid UUID`)
  ];
};

/**
 * Pagination validation rules
 */
const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Page must be a positive integer between 1 and 10000')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a positive integer between 1 and 100')
    .toInt(),
  
  query('sortBy')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Sort field must be between 1 and 50 characters')
    .matches(/^[a-zA-Z_][a-zA-Z0-9_.]*$/)
    .withMessage('Sort field must be a valid field name'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', 'ASC', 'DESC'])
    .withMessage('Sort order must be asc or desc')
    .toLowerCase()
];

/**
 * Search query validation rules
 */
const validateSearchQuery = () => [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim()
    .escape()
];

/**
 * File upload validation
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    required = false
  } = options;
  
  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }
    
    if (req.file) {
      // Check file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
        });
      }
      
      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type must be one of: ${allowedTypes.join(', ')}`
        });
      }
    }
    
    next();
  };
};

/**
 * IP address validation
 */
const validateIPAddress = (fieldName = 'ipAddress', location = 'body') => {
  const validator = location === 'param' ? param(fieldName) : 
                   location === 'query' ? query(fieldName) : 
                   body(fieldName);
  
  return [
    validator
      .isIP()
      .withMessage('Must be a valid IP address')
  ];
};

/**
 * URL validation
 */
const validateURL = (fieldName = 'url', options = {}) => {
  const { protocols = ['http', 'https'], required = false } = options;
  
  const validation = body(fieldName);
  
  if (required) {
    validation.notEmpty().withMessage('URL is required');
  } else {
    validation.optional();
  }
  
  return [
    validation
      .isURL({ protocols, require_protocol: true })
      .withMessage(`URL must be a valid URL with protocol: ${protocols.join(', ')}`)
  ];
};

/**
 * Custom sanitization functions
 */
const sanitizers = {
  /**
   * Sanitize HTML content
   */
  sanitizeHTML: (content) => {
    return validator.escape(content);
  },
  
  /**
   * Sanitize filename
   */
  sanitizeFilename: (filename) => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  },
  
  /**
   * Normalize phone number
   */
  normalizePhoneNumber: (phone) => {
    return phone.replace(/[^+\d]/g, '');
  }
};

module.exports = {
  handleValidationErrors,
  validateEmail,
  validatePassword,
  validateUsername,
  validateName,
  validatePhoneNumber,
  validateDateOfBirth,
  validateCountryCode,
  validate2FAToken,
  validateAddress,
  validateCity,
  validatePostalCode,
  validateUUID,
  validatePagination,
  validateSearchQuery,
  validateFileUpload,
  validateIPAddress,
  validateURL,
  sanitizers
};