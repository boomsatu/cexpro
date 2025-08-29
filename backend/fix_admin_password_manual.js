const { Admin } = require('./src/models');
const bcrypt = require('bcryptjs');

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password manually...');
    
    // Find admin
    const admin = await Admin.findOne({
      where: { email: 'admin@cex.com' }
    });
    
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('✅ Admin found:', admin.email);
    
    const newPassword = 'Admin123!@#';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('🔐 New hashed password generated');
    
    // Update password directly without triggering hooks
    await admin.update({ password: hashedPassword }, {
      hooks: false // Skip beforeUpdate hook to avoid double hashing
    });
    
    console.log('✅ Password updated successfully');
    
    // Test the new password
    const updatedAdmin = await Admin.findOne({
      where: { email: 'admin@cex.com' }
    });
    
    const testResult = await updatedAdmin.comparePassword(newPassword);
    console.log('🧪 Password test result:', testResult);
    
    if (testResult) {
      console.log('🎉 Password fix successful!');
    } else {
      console.log('❌ Password fix failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminPassword();