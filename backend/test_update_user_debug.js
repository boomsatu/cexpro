const axios = require('axios');

// Test update user dengan data yang sama seperti di UI
async function testUpdateUser() {
  try {
    // Login admin dulu dengan fresh request
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:3001/api/v1/admin/auth/login', {
      email: 'admin@cex.com',
      password: 'Admin123!@#'
    }, {
      timeout: 10000
    });
    
    console.log('📥 Login Response Status:', loginResponse.status);
    console.log('📥 Login Response Data:', JSON.stringify(loginResponse.data, null, 2));
    
    if (!loginResponse.data || !loginResponse.data.data || !loginResponse.data.data.token) {
      throw new Error('Login failed - no token received');
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token length:', token.length);
    
    // Test update user dengan data yang valid
    const userId = 'c6c3fe8b-75fa-46bf-98f9-75ade58109bf';
    const updateData = {
      email: 'updated20250830903350@example.com',
      firstName: 'Updated',  // Hanya huruf
      lastName: 'User',      // Nama belakang yang valid
      username: 'trader2',
      phoneNumber: '+6281234567890',  // Format nomor telepon yang valid
      country: 'ID',         // Kode negara 2 huruf
      role: 'user',          // Role yang valid (lowercase)
      status: 'active',      // Status yang valid (lowercase)
      kycStatus: 'approved',  // Change to approved
      kycLevel: 3            // Test sending kycLevel directly (Level 3 - Advanced)
    };
    
    console.log('📤 Sending update request with data:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.put(
      `http://localhost:3001/api/v1/admin/users/${userId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Update successful:', response.data);
    
  } catch (error) {
    console.log('❌ Error occurred:');
    
    if (error.response) {
      // Server responded with error status
      console.log('Status:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request was made but no response received
      console.log('No response received from server');
      console.log('Request:', error.request);
    } else {
      // Something else happened
      console.log('Error Message:', error.message);
    }
    
    console.log('Full Error:', error.code || error.message);
    
    if (error.response?.data?.details) {
      console.log('\n📋 Validation Details:');
      error.response.data.details.forEach((detail, index) => {
        console.log(`${index + 1}. Field: ${detail.path || detail.param}`);
        console.log(`   Message: ${detail.msg}`);
        console.log(`   Value: ${detail.value}`);
        console.log('');
      });
    }
  }
}

testUpdateUser();