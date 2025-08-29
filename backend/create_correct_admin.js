const bcrypt = require('bcryptjs');
const { Admin } = require('./src/models');

async function createCorrectAdmin() {
  try {
    console.log('🔧 Creating correct admin user...');
    
    const email = 'admin@cex.com';
    const password = 'Admin123!@#';
    
    // Delete existing admin if exists
    await Admin.destroy({ where: { email } });
    console.log('🗑️ Removed existing admin if any');
    
    // Create new admin with correct structure
    const admin = await Admin.create({
      email,
      name: 'Super Admin',
      password, // Will be hashed by beforeCreate hook
      role: 'super_admin',
      status: 'active',
      twoFactorEnabled: false
    });
    
    console.log('✅ Admin user created successfully');
    
    // Test login credentials
    console.log('\n🔐 Testing login credentials...');
    const isPasswordValid = await admin.comparePassword(password);
    console.log('Password validation:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
    
    console.log('\n📋 Admin user details:');
    console.log('- ID:', admin.id);
    console.log('- Email:', admin.email);
    console.log('- Name:', admin.name);
    console.log('- Role:', admin.role);
    console.log('- Status:', admin.status);
    console.log('- 2FA Enabled:', admin.twoFactorEnabled);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

createCorrectAdmin();