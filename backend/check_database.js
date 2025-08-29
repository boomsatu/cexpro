const { sequelize } = require('./src/config/database');
const models = require('./src/models');

async function checkDatabase() {
  try {
    console.log('🔍 Memeriksa koneksi database...');
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil');
    
    console.log('\n📋 Memeriksa tabel yang ada...');
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    console.log('Tabel yang ditemukan:', tables);
    
    if (!tables.includes('users')) {
      console.log('\n⚠️  Tabel users tidak ditemukan. Menjalankan sync...');
      await sequelize.sync({ force: false });
      console.log('✅ Database sync selesai');
    } else {
      console.log('\n✅ Tabel users sudah ada');
    }
    
    // Test query sederhana
    console.log('\n🧪 Testing query User.count()...');
    const userCount = await models.User.count();
    console.log('Jumlah user:', userCount);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

checkDatabase();