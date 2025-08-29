const axios = require('axios');

async function testUsersEndpoint() {
  try {
    console.log('🔍 Testing /api/v1/admin/users endpoint...');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiZW1haWwiOiJhZG1pbkBjZXguY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwidHlwZSI6ImFkbWluIiwiaWF0IjoxNzU2Mzk1MzM2LCJleHAiOjE3NTY0MjQxMzZ9.29VBNxXmF6NaKOr7zW286C6baJQbFhYmWp-9yutSPQc';
    
    const response = await axios.get('http://localhost:3001/api/v1/admin/users?page=1&limit=20', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS:', response.status);
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ ERROR:', error.response?.status || 'Network Error');
    console.log('📊 Error Response:', JSON.stringify(error.response?.data || error.message, null, 2));
    console.log('🔍 Full Error:', error.message);
    if (error.response?.data?.stack) {
      console.log('📋 Stack Trace:', error.response.data.stack);
    }
  }
}

testUsersEndpoint();