const { sequelize } = require('./src/config/database');

async function addUpdatedAtColumn() {
  try {
    console.log('🔍 Menambahkan kolom updated_at ke tabel users...');
    
    // Cek apakah kolom updated_at sudah ada
    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      AND column_name = 'updated_at'
    `);
    
    if (columns.length === 0) {
      console.log('➕ Menambahkan kolom updated_at...');
      
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `);
      
      console.log('✅ Kolom updated_at berhasil ditambahkan');
    } else {
      console.log('✅ Kolom updated_at sudah ada');
    }
    
    // Update semua record yang ada dengan timestamp saat ini
    console.log('🔄 Mengupdate timestamp untuk record yang ada...');
    
    await sequelize.query(`
      UPDATE users 
      SET updated_at = NOW() 
      WHERE updated_at IS NULL
    `);
    
    console.log('✅ Timestamp berhasil diupdate');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

addUpdatedAtColumn();