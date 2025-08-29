const fetch = require('node-fetch');

async function testUIAccess() {
  try {
    console.log('🔍 Testing admin panel UI access...');
    
    // Test root path
    const rootResponse = await fetch('http://localhost:3000/');
    console.log('✅ Root path (/) status:', rootResponse.status);
    
    // Test signin path
    const signinResponse = await fetch('http://localhost:3000/signin');
    console.log('✅ Signin path (/signin) status:', signinResponse.status);
    
    // Test dashboard path (should redirect to signin if not authenticated)
    try {
      const dashboardResponse = await fetch('http://localhost:3000/dashboard');
      console.log('📊 Dashboard path (/dashboard) status:', dashboardResponse.status);
    } catch (error) {
      console.log('❌ Dashboard path error:', error.message);
    }
    
    console.log('\n🎯 Summary:');
    console.log('- Admin panel UI is running on http://localhost:3000');
    console.log('- Root path (/) should show the dashboard for authenticated users');
    console.log('- /signin path is available for login');
    console.log('- /dashboard might not exist as a direct route in Next.js app router');
    console.log('- In app router, (admin) group routes are accessible at root level');
    
  } catch (error) {
    console.error('❌ Error testing UI access:', error.message);
  }
}

testUIAccess();