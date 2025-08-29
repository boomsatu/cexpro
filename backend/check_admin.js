const bcrypt = require('bcryptjs');
const { Admin } = require('./src/models');

async function checkAdmin() {
  try {
    console.log('Checking admin data...');
    
    // Check if admin exists
    const admin = await Admin.findOne({ where: { email: 'admin@cex.com' } });
    
    if (admin) {
      console.log('Admin found:');
      console.log('ID:', admin.id);
      console.log('Email:', admin.email);
      console.log('Name:', admin.name);
      console.log('Role:', admin.role);
      console.log('Status:', admin.status);
      console.log('Password hash:', admin.password);
      
      // Force update password to ensure it's correct
      console.log('Updating admin password to ensure it matches Admin123!@#...');
      
      const newHashedPassword = await bcrypt.hash('Admin123!@#', 12);
      await admin.update({ password: newHashedPassword });
      console.log('Password updated successfully');
      console.log('New hash:', newHashedPassword);
      
      // Test the updated password
      const updatedAdmin = await Admin.findByPk(admin.id);
      const isPasswordValid = await bcrypt.compare('Admin123!@#', updatedAdmin.password);
      console.log('Updated password valid:', isPasswordValid);
    } else {
      console.log('Admin not found. Creating admin...');
      
      const hashedPassword = await bcrypt.hash('Admin123!@#', 12);
      const newAdmin = await Admin.create({
        email: 'admin@cex.com',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'super_admin',
        status: 'active'
      });
      
      console.log('Admin created:', newAdmin.toJSON());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdmin();