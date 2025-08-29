const { sequelize } = require('./src/config/database');
const { QueryInterface } = require('sequelize');

async function fixDatabase() {
  try {
    console.log('🔧 Memperbaiki struktur database...');
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Periksa apakah kolom deletedAt sudah ada
    try {
      const tableDescription = await queryInterface.describeTable('users');
      
      if (!tableDescription.deletedAt) {
        console.log('➕ Menambahkan kolom deletedAt ke tabel users...');
        await queryInterface.addColumn('users', 'deletedAt', {
          type: sequelize.Sequelize.DATE,
          allowNull: true
        });
        console.log('✅ Kolom deletedAt berhasil ditambahkan');
      } else {
        console.log('✅ Kolom deletedAt sudah ada');
      }
      
      // Periksa kolom createdAt dan updatedAt
      if (!tableDescription.createdAt) {
        console.log('➕ Menambahkan kolom createdAt ke tabel users...');
        await queryInterface.addColumn('users', 'createdAt', {
          type: sequelize.Sequelize.DATE,
          allowNull: false,
          defaultValue: sequelize.Sequelize.NOW
        });
        console.log('✅ Kolom createdAt berhasil ditambahkan');
      }
      
      if (!tableDescription.updatedAt) {
        console.log('➕ Menambahkan kolom updatedAt ke tabel users...');
        await queryInterface.addColumn('users', 'updatedAt', {
          type: sequelize.Sequelize.DATE,
          allowNull: false,
          defaultValue: sequelize.Sequelize.NOW
        });
        console.log('✅ Kolom updatedAt berhasil ditambahkan');
      }
      
    } catch (error) {
      console.error('❌ Error saat memperbaiki tabel users:', error.message);
    }
    
    // Test query setelah perbaikan
    console.log('\n🧪 Testing query User.count() setelah perbaikan...');
    const models = require('./src/models');
    const userCount = await models.User.count();
    console.log('✅ Jumlah user:', userCount);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

fixDatabase();