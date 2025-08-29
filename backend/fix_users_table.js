const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');

async function fixUsersTable() {
  try {
    console.log('🔍 Memeriksa struktur tabel users...');
    
    // Cek kolom yang ada di tabel users
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Kolom yang ada di tabel users:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    const columnNames = columns.map(col => col.column_name);
    
    // Cek kolom yang diperlukan
    const requiredColumns = ['created_at', 'updated_at', 'deleted_at'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n❌ Kolom yang hilang:', missingColumns);
      
      for (const column of missingColumns) {
        try {
          console.log(`➕ Menambahkan kolom ${column}...`);
          
          if (column === 'created_at' || column === 'updated_at') {
            await sequelize.query(`
              ALTER TABLE users 
              ADD COLUMN ${column} TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            `);
          } else if (column === 'deleted_at') {
            await sequelize.query(`
              ALTER TABLE users 
              ADD COLUMN ${column} TIMESTAMP WITH TIME ZONE
            `);
          }
          
          console.log(`✅ Kolom ${column} berhasil ditambahkan`);
        } catch (error) {
          console.error(`❌ Error menambahkan kolom ${column}:`, error.message);
        }
      }
    } else {
      console.log('\n✅ Semua kolom yang diperlukan sudah ada');
    }
    
    // Test User.count() dan User.findAll()
    console.log('\n🧪 Testing model User...');
    
    const userCount = await User.count();
    console.log(`📊 Total users: ${userCount}`);
    
    const users = await User.findAll({ limit: 3 });
    console.log(`📋 Sample users: ${users.length} records`);
    
    // Test agregasi dengan createdAt
    console.log('\n🧪 Testing agregasi dengan createdAt...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await User.count({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: today
        }
      }
    });
    console.log(`📊 Users baru hari ini: ${newUsersToday}`);
    
    console.log('\n✅ Semua test berhasil!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixUsersTable();