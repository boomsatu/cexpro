const axios = require('axios');

async function testUIError() {
  try {
    console.log('🔍 Testing UI error scenario...');
    
    // Login first
    const loginRes = await axios.post('http://localhost:3001/api/v1/admin/auth/login', {
      email: 'admin@cex.com',
      password: 'Admin123!@#'
    });
    
    const token = loginRes.data.data.token;
    console.log('✅ Login successful');
    
    // Try to update user with invalid data (same as UI error)
    try {
      const updateRes = await axios.put('http://localhost:3001/api/v1/admin/users/c6c3fe8b-75fa-46bf-98f9-75ade58109bf', {
        firstName: 'Test123', // Invalid: contains numbers
        email: 'invalid-email' // Invalid: not proper email format
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Update successful:', updateRes.data);
      
    } catch (updateError) {
      console.log('❌ UPDATE ERROR:');
      console.log('Status:', updateError.response?.status);
      console.log('Response:', JSON.stringify(updateError.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ MAIN ERROR:', error.message);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testUIError();