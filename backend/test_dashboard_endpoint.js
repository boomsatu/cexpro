const axios = require('axios');

async function testDashboardEndpoint() {
  try {
    console.log('🔐 Melakukan login admin...');
    
    // Login admin
    const loginResponse = await axios.post('http://localhost:3001/api/v1/admin/auth/login', {
      email: 'admin@cex.com',
      password: 'Admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login berhasil');
    
    // Test dashboard stats endpoint
    console.log('📊 Mengambil statistik dashboard...');
    const statsResponse = await axios.get('http://localhost:3001/api/v1/admin/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Dashboard stats berhasil diambil:');
    console.log('Status:', statsResponse.status);
    console.log('Data:', JSON.stringify(statsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status Code:', error.response.status);
      console.error('Status Text:', error.response.statusText);
    }
  }
}

testDashboardEndpoint();