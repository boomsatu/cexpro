const { Admin } = require('./src/models');
const bcrypt = require('bcryptjs');
const logger = require('./src/utils/logger');

async function fixAdminPassword() {
  try {
    console.log('Fixing admin password...');
    
    // Find admin
    const admin = await Admin.findOne({
      where: { email: 'admin@cex.com' }
    });
    
    if (!admin) {
      console.log('Admin not found');
      return;
    }
    
    console.log('Admin found:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      status: admin.status
    });
    
    // Hash new password
    const newPassword = 'admin123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('New hashed password:', hashedPassword);
    
    // Update password directly in database
    await admin.update({
      password: hashedPassword
    }, {
      hooks: false // Skip hooks to avoid any interference
    });
    
    console.log('Password updated successfully');
    
    // Test password comparison
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log('Password comparison test:', isValid);
    
    // Test using model method
    await admin.reload();
    const modelTest = await admin.comparePassword(newPassword);
    console.log('Model comparePassword test:', modelTest);
    
  } catch (error) {
    console.error('Error fixing admin password:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminPassword();