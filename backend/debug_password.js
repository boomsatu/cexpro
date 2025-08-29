const { Admin } = require('./src/models');
const bcrypt = require('bcryptjs');

async function debugPassword() {
  try {
    console.log('🔍 Debugging password comparison...');
    
    // Find admin
    const admin = await Admin.findOne({
      where: { email: 'admin@cex.com' }
    });
    
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('✅ Admin found:', {
      id: admin.id,
      email: admin.email,
      status: admin.status,
      hashedPassword: admin.password.substring(0, 20) + '...'
    });
    
    const testPassword = 'Admin123!@#';
    console.log('🔐 Testing password:', testPassword);
    
    // Test with model method
    const modelResult = await admin.comparePassword(testPassword);
    console.log('📋 Model comparePassword result:', modelResult);
    
    // Test with direct bcrypt
    const directResult = await bcrypt.compare(testPassword, admin.password);
    console.log('🔧 Direct bcrypt.compare result:', directResult);
    
    // Test hash generation
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log('🆕 New hash generated:', newHash.substring(0, 20) + '...');
    
    const newHashTest = await bcrypt.compare(testPassword, newHash);
    console.log('✅ New hash test:', newHashTest);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugPassword();