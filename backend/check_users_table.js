require('dotenv').config();
const { sequelize } = require('./src/models');

async function checkUsersTable() {
  try {
    console.log('Checking users table structure...');
    
    const columns = await sequelize.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Columns in users table:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
    // Check if createdAt and updatedAt columns exist
    const hasCreatedAt = columns.some(col => col.column_name === 'createdAt' || col.column_name === 'created_at');
    const hasUpdatedAt = columns.some(col => col.column_name === 'updatedAt' || col.column_name === 'updated_at');
    
    console.log('\nTimestamp columns:');
    console.log(`- createdAt/created_at: ${hasCreatedAt}`);
    console.log(`- updatedAt/updated_at: ${hasUpdatedAt}`);
    
  } catch (error) {
    console.error('Error checking users table:', error);
  } finally {
    process.exit(0);
  }
}

checkUsersTable();