const axios = require('axios');
const colors = require('colors');

// Base URL untuk API
const BASE_URL = 'http://localhost:3001';

// Token admin untuk testing (ganti dengan token yang valid)
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiZW1haWwiOiJhZG1pbkBjZXguY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwidHlwZSI6ImFkbWluIiwiaWF0IjoxNzU2Mzk1MzM2LCJleHAiOjE3NTY0MjQxMzZ9.29VBNxXmF6NaKOr7zW286C6baJQbFhYmWp-9yutSPQc'; // Valid admin token

// Headers untuk request
const headers = {
  'Authorization': `Bearer ${ADMIN_TOKEN}`,
  'Content-Type': 'application/json'
};

// Fungsi untuk test endpoint
async function testEndpoint(method, url, description, expectedStatus = 200) {
  try {
    console.log(`\n🧪 Testing: ${description}`.cyan);
    console.log(`📍 ${method.toUpperCase()} ${url}`.gray);
    
    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      headers,
      timeout: 10000
    });
    
    if (response.status === expectedStatus) {
      console.log(`✅ SUCCESS: ${response.status} ${response.statusText}`.green);
      if (response.data) {
        console.log(`📊 Response:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
      }
      return { success: true, status: response.status, data: response.data };
    } else {
      console.log(`⚠️  UNEXPECTED STATUS: ${response.status} (expected ${expectedStatus})`.yellow);
      return { success: false, status: response.status, data: response.data };
    }
  } catch (error) {
    if (error.response) {
      console.log(`❌ ERROR: ${error.response.status} ${error.response.statusText}`.red);
      console.log(`📝 Error details:`, error.response.data);
      return { success: false, status: error.response.status, error: error.response.data };
    } else if (error.request) {
      console.log(`❌ NETWORK ERROR: No response received`.red);
      return { success: false, error: 'Network error' };
    } else {
      console.log(`❌ REQUEST ERROR: ${error.message}`.red);
      return { success: false, error: error.message };
    }
  }
}

// Main testing function
async function runTests() {
  console.log('🚀 Starting Admin Endpoints Test'.bold.blue);
  console.log('=' * 50);
  
  const results = [];
  
  // Test 1: Users endpoint
  results.push(await testEndpoint(
    'GET',
    '/api/v1/admin/users?page=1&limit=20',
    'Admin Users List'
  ));
  
  // Test 2: Trading pairs endpoint
  results.push(await testEndpoint(
    'GET',
    '/api/v1/admin/trading/pairs',
    'Admin Trading Pairs List'
  ));
  
  // Test 3: Deposits endpoint (fix double api/v1)
  results.push(await testEndpoint(
    'GET',
    '/api/v1/admin/deposits?page=1&status=',
    'Admin Deposits List'
  ));
  
  // Test 4: Withdrawals endpoint (fix double api/v1)
  results.push(await testEndpoint(
    'GET',
    '/api/v1/admin/withdrawals?page=1&status=',
    'Admin Withdrawals List'
  ));
  
  // Test 5: Settings endpoint (fix double api/v1)
  results.push(await testEndpoint(
    'GET',
    '/api/v1/admin/settings',
    'Admin Settings'
  ));
  
  // Test 6: Trading pairs endpoint (fix double api/v1)
  results.push(await testEndpoint(
    'GET',
    '/api/v1/admin/trading-pairs',
    'Admin Trading Pairs (alternative endpoint)'
  ));
  
  // Test 7: Dashboard endpoint
  results.push(await testEndpoint(
    'GET',
    '/api/v1/admin/dashboard',
    'Admin Dashboard'
  ));
  
  // Test 8: Health check
  results.push(await testEndpoint(
    'GET',
    '/health',
    'Health Check',
    200
  ));
  
  // Summary
  console.log('\n' + '=' * 50);
  console.log('📊 TEST SUMMARY'.bold.blue);
  console.log('=' * 50);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`.green);
  console.log(`❌ Failed: ${failed}`.red);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
  
  // Detailed failure analysis
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n🔍 FAILURE ANALYSIS'.bold.red);
    failures.forEach((failure, index) => {
      console.log(`${index + 1}. Status: ${failure.status || 'N/A'} - ${failure.error || 'Unknown error'}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS'.bold.yellow);
  if (failures.some(f => f.status === 500)) {
    console.log('- Check server logs for 500 errors');
    console.log('- Verify database connections');
    console.log('- Check model associations');
  }
  if (failures.some(f => f.status === 404)) {
    console.log('- Verify route definitions in adminRoutes.js');
    console.log('- Check for duplicate /api/v1 in URLs');
    console.log('- Ensure controllers are properly exported');
  }
  if (failures.some(f => f.status === 401 || f.status === 403)) {
    console.log('- Update ADMIN_TOKEN with valid token');
    console.log('- Check authentication middleware');
  }
}

// Error handling untuk uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };