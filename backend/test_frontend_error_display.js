const axios = require('axios');

async function testFrontendErrorDisplay() {
  try {
    console.log('🔍 Testing frontend error display...');
    
    // Login first
    const loginRes = await axios.post('http://localhost:3001/api/v1/admin/auth/login', {
      email: 'admin@cex.com',
      password: 'Admin123!@#'
    });
    
    const token = loginRes.data.data.token;
    console.log('✅ Login successful');
    
    // Test the exact same scenario that would happen from UI
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
      
      console.log('❌ Unexpected success - this should have failed');
      
    } catch (updateError) {
      console.log('\n📋 ERROR DETAILS FOR FRONTEND:');
      console.log('Status Code:', updateError.response?.status);
      console.log('Error Response:', JSON.stringify(updateError.response?.data, null, 2));
      
      // Simulate what frontend should extract
      const errorData = updateError.response?.data;
      if (errorData?.details && Array.isArray(errorData.details)) {
        const errorMessage = errorData.details.map(err => err.msg).join(', ');
        console.log('\n✅ EXTRACTED ERROR MESSAGE FOR USER:');
        console.log(`"${errorMessage}"`);
        console.log('\n📝 Individual error details:');
        errorData.details.forEach((err, index) => {
          console.log(`${index + 1}. Field: ${err.path} - ${err.msg}`);
        });
      } else {
        console.log('❌ Error format not recognized by frontend');
      }
    }
    
  } catch (error) {
    console.error('❌ MAIN ERROR:', error.message);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFrontendErrorDisplay();