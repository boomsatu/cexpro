// Load environment variables first
require('dotenv').config();

const { Admin } = require('./src/models');
const { validateAdminCredentials, generateAdminToken } = require('./src/middleware/adminAuth');
const jwt = require('jsonwebtoken');
const logger = require('./src/utils/logger');

async function testAdminLogin() {
  try {
    console.log('Testing admin login...');
    
    // Test credentials
    const email = 'admin@cex.com';
    const password = 'admin123';
    
    console.log(`Attempting login with email: ${email}`);
    
    // Validate credentials
    const result = await validateAdminCredentials(email, password);
    console.log('Validation result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      // Generate token
      const token = generateAdminToken(result.admin);
      console.log('Generated token:', token);
      
      // Decode token to see payload
      const decoded = jwt.decode(token);
      console.log('Token payload:', JSON.stringify(decoded, null, 2));
      
      // Verify token
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verification successful:', JSON.stringify(verified, null, 2));
        
        // Try to find admin by ID from token
        const admin = await Admin.findByPk(verified.id, {
          attributes: ['id', 'name', 'email', 'role', 'status', 'lastLogin']
        });
        
        if (admin) {
          console.log('Admin found by token ID:', JSON.stringify(admin, null, 2));
        } else {
          console.log('Admin NOT found by token ID:', verified.id);
        }
        
      } catch (verifyError) {
        console.error('Token verification failed:', verifyError.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testAdminLogin();