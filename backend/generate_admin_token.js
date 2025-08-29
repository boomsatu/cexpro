require('dotenv').config();
const jwt = require('jsonwebtoken');
const { Admin } = require('./src/models');

async function generateToken() {
  try {
    // Find admin
    const admin = await Admin.findOne({ where: { email: 'admin@cex.com' } });
    
    if (!admin) {
      console.log('Admin not found');
      return;
    }
    
    // Generate token
    const payload = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      type: 'admin'
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h'
    });
    
    console.log('Generated Token:');
    console.log('TOKEN_START');
    console.log(token);
    console.log('TOKEN_END');
    
    // Test the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('\nToken verified successfully:');
    console.log(JSON.stringify(decoded, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

generateToken();