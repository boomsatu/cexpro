const bcrypt = require('bcryptjs');
const { Admin } = require('./src/models');

async function createOrUpdateAdmin() {
  try {
    console.log('🔧 Creating/updating admin user...');
    
    const email = 'admin@cex.com';
    const password = 'Admin123!@#';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if admin exists
    let admin = await Admin.findOne({ where: { email } });
    
    if (admin) {
      console.log('📝 Admin user exists, updating password...');
      await admin.update({
        password: hashedPassword,
        role: 'super_admin',
        isActive: true
      });
      console.log('✅ Admin user updated successfully');
    } else {
      console.log('➕ Creating new admin user...');
      admin = await Admin.create({
        email,
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
        firstName: 'Super',
        lastName: 'Admin'
      });
      console.log('✅ Admin user created successfully');
    }
    
    // Test login with the credentials
    console.log('\n🔐 Testing login credentials...');
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log('Password validation:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
    
    console.log('\n📋 Admin user details:');
    console.log('- ID:', admin.id);
    console.log('- Email:', admin.email);
    console.log('- Role:', admin.role);
    console.log('- Active:', admin.isActive);
    console.log('- Name:', `${admin.firstName} ${admin.lastName}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

createOrUpdateAdmin();