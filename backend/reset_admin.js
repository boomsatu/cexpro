const bcrypt = require('bcryptjs');
const { Admin } = require('./src/models');

async function resetAdmin() {
  try {
    console.log('Resetting admin account...');
    
    // Delete existing admin if exists
    const existingAdmin = await Admin.findOne({ where: { email: 'admin@cex.com' } });
    if (existingAdmin) {
      await existingAdmin.destroy();
      console.log('Existing admin deleted');
    }
    
    // Create new admin with correct password
    // Note: The beforeCreate hook will automatically hash the password
    const newAdmin = await Admin.create({
      email: 'admin@cex.com',
      name: 'Super Admin',
      password: 'Admin123!@#', // This will be hashed by beforeCreate hook
      role: 'super_admin',
      status: 'active'
    });
    
    console.log('New admin created successfully:');
    console.log('ID:', newAdmin.id);
    console.log('Email:', newAdmin.email);
    console.log('Name:', newAdmin.name);
    console.log('Role:', newAdmin.role);
    console.log('Status:', newAdmin.status);
    
    // Test the password
    const isPasswordValid = await newAdmin.comparePassword('Admin123!@#');
    console.log('Password validation test:', isPasswordValid);
    
    if (isPasswordValid) {
      console.log('✅ Admin account reset successfully! Password is working correctly.');
    } else {
      console.log('❌ Password validation failed after reset.');
    }
    
  } catch (error) {
    console.error('Error resetting admin:', error);
  }
}

resetAdmin();