const axios = require('axios');

async function testUserUpdate() {
  try {
    console.log('🔍 Testing PUT /api/v1/admin/users/:id endpoint...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiZW1haWwiOiJhZG1pbkBjZXguY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwidHlwZSI6ImFkbWluIiwiaWF0IjoxNzU2Mzk1MzM2LCJleHAiOjE3NTY0MjQxMzZ9.29VBNxXmF6NaKOr7zW286C6baJQbFhYmWp-9yutSPQc';
    
    // First, get a user to update
    console.log('📋 Getting user list...');
    const usersResponse = await axios.get('http://localhost:3001/api/v1/admin/users?page=1&limit=5', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (usersResponse.data.data.users.length === 0) {
      console.log('❌ No users found to test update');
      return;
    }
    
    const testUser = usersResponse.data.data.users[0];
    console.log('👤 Testing with user:', testUser.id, testUser.email);
    
    // Test update user data
    console.log('\n🔄 Testing user update...');
    const updateData = {
      firstName: 'Updated First Name',
      lastName: 'Updated Last Name',
      phoneNumber: '+1234567890',
      country: 'US'
    };
    
    const updateResponse = await axios.put(`http://localhost:3001/api/v1/admin/users/${testUser.id}`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ UPDATE SUCCESS:', updateResponse.status);
    console.log('📊 Response:', JSON.stringify(updateResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ ERROR:', error.response?.status || 'Network Error');
    console.log('📊 Error Response:', JSON.stringify(error.response?.data || error.message, null, 2));
    console.log('🔍 Full Error:', error.message);
    if (error.response?.data?.stack) {
      console.log('📋 Stack Trace:', error.response.data.stack);
    }
  }
}

testUserUpdate();