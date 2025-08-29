const axios = require('axios');

async function testSimpleError() {
  try {
    console.log('🔍 Testing error messages...');
    
    // Get fresh token
    const loginResponse = await axios.post('http://localhost:3001/api/v1/admin/auth/login', {
      email: 'admin@cex.com',
      password: 'Admin123!@#'
    });
    
    console.log('✅ Login successful');
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.data.token;
    
    // Get a user to test with
    const usersResponse = await axios.get('http://localhost:3001/api/v1/admin/users?page=1&limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const testUser = usersResponse.data.data.users[0];
    console.log(`👤 Testing with user: ${testUser.id}`);
    
    // Test 1: Valid update (should succeed)
    console.log('\n✅ Test 1: Valid update...');
    try {
      const validResponse = await axios.put(`http://localhost:3001/api/v1/admin/users/${testUser.id}`, {
        firstName: 'ValidName'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('SUCCESS:', validResponse.data.message || 'User updated successfully');
    } catch (error) {
      console.log('UNEXPECTED ERROR:', error.response?.data || error.message);
    }
    
    // Test 2: Invalid firstName (should fail with clear message)
    console.log('\n❌ Test 2: Invalid firstName (with numbers)...');
    try {
      const invalidResponse = await axios.put(`http://localhost:3001/api/v1/admin/users/${testUser.id}`, {
        firstName: 'Invalid123'  // Contains numbers
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('UNEXPECTED SUCCESS:', invalidResponse.data);
    } catch (error) {
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log('ERROR STATUS:', error.response.status);
        console.log('ERROR MESSAGE:', errorData.message || errorData.error);
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          console.log('VALIDATION ERRORS:');
          errorData.errors.forEach(err => {
            console.log(`  - ${err.field}: ${err.message}`);
          });
        }
        
        if (errorData.details && Array.isArray(errorData.details)) {
          console.log('ERROR DETAILS:');
          errorData.details.forEach(detail => {
            console.log(`  - ${detail.path}: ${detail.msg}`);
          });
        }
      } else {
        console.log('NETWORK ERROR:', error.message);
      }
    }
    
    // Test 3: Invalid email format (should fail with clear message)
    console.log('\n❌ Test 3: Invalid email format...');
    try {
      const invalidEmailResponse = await axios.put(`http://localhost:3001/api/v1/admin/users/${testUser.id}`, {
        email: 'invalid-email-format'  // Invalid email
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('UNEXPECTED SUCCESS:', invalidEmailResponse.data);
    } catch (error) {
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log('ERROR STATUS:', error.response.status);
        console.log('ERROR MESSAGE:', errorData.message || errorData.error);
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          console.log('VALIDATION ERRORS:');
          errorData.errors.forEach(err => {
            console.log(`  - ${err.field}: ${err.message}`);
          });
        }
        
        if (errorData.details && Array.isArray(errorData.details)) {
          console.log('ERROR DETAILS:');
          errorData.details.forEach(detail => {
            console.log(`  - ${detail.path}: ${detail.msg}`);
          });
        }
      } else {
        console.log('NETWORK ERROR:', error.message);
      }
    }
    
    console.log('\n🎯 Error message testing completed!');
    
  } catch (error) {
    console.log('❌ MAIN ERROR:', error.response?.data || error.message);
  }
}

testSimpleError();