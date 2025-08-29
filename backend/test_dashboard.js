const { User, Transaction, TradingPair } = require('./src/models');
const { Op } = require('sequelize');

async function testDashboardStats() {
  try {
    console.log('🧪 Testing dashboard stats components...');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log('\n1. Testing User.count()...');
    const totalUsers = await User.count();
    console.log('✅ Total users:', totalUsers);
    
    console.log('\n2. Testing User.count() with conditions...');
    const activeUsers = await User.count({ where: { status: 'active' } });
    console.log('✅ Active users:', activeUsers);
    
    console.log('\n3. Testing new users today...');
    const newUsersToday = await User.count({
      where: {
        created_at: { [Op.gte]: today }
      }
    });
    console.log('✅ New users today:', newUsersToday);
    
    console.log('\n4. Testing Transaction model...');
    try {
      const totalTransactions = await Transaction.count();
      console.log('✅ Total transactions:', totalTransactions);
    } catch (error) {
      console.log('❌ Transaction error:', error.message);
    }
    
    console.log('\n5. Testing TradingPair model...');
    try {
      const totalTradingPairs = await TradingPair.count();
      console.log('✅ Total trading pairs:', totalTradingPairs);
    } catch (error) {
      console.log('❌ TradingPair error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testDashboardStats();