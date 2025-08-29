const axios = require('axios');

async function testEndpoints() {
  try {
    console.log('🔐 Getting admin token...');
    
    // Login to get valid token
    const loginResponse = await axios.post('http://localhost:3001/api/v1/admin/auth/login', {
      email: 'admin@cex.com',
      password: 'Admin123!@#'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, got token');
    
    console.log('\n🔍 Testing dashboard endpoints...');
    
    // Test activities endpoint
    console.log('\n📊 Testing activities endpoint...');
    const activities = await axios.get('http://localhost:3001/api/v1/admin/dashboard/activities', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Activities endpoint:', activities.status);
    console.log('Data count:', activities.data.data?.length || 0);
    
    // Test market endpoint
    console.log('\n📈 Testing market endpoint...');
    const market = await axios.get('http://localhost:3001/api/v1/admin/dashboard/market', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Market endpoint:', market.status);
    console.log('Data count:', market.data.data?.length || 0);
    
    // Test transactions endpoint
    console.log('\n💰 Testing transactions endpoint...');
    const transactions = await axios.get('http://localhost:3001/api/v1/admin/dashboard/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Transactions endpoint:', transactions.status);
    console.log('Data count:', transactions.data.data?.length || 0);
    
    console.log('\n🎉 All endpoints working successfully!');
    
  } catch (error) {
    console.error('❌ Error testing endpoints:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testEndpoints();