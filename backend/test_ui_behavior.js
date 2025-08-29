const fetch = require('node-fetch');

async function testUIBehavior() {
  try {
    console.log('🔍 Testing UI behavior and routing...');
    
    // Step 1: Test accessing root without authentication
    console.log('\n1️⃣ Testing root access without authentication...');
    const rootResponse = await fetch('http://localhost:3000/', {
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    console.log('📍 Root path status:', rootResponse.status);
    console.log('📍 Root path headers:', {
      location: rootResponse.headers.get('location'),
      contentType: rootResponse.headers.get('content-type')
    });
    
    // Step 2: Test signin page
    console.log('\n2️⃣ Testing signin page...');
    const signinResponse = await fetch('http://localhost:3000/signin');
    console.log('🔐 Signin page status:', signinResponse.status);
    
    // Step 3: Test with valid token (simulate authenticated access)
    console.log('\n3️⃣ Getting valid admin token...');
    const loginResponse = await fetch('http://localhost:3001/api/v1/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@cex.com',
        password: 'Admin123!@#'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      const token = loginData.data.token;
      console.log('✅ Got valid token for testing');
      
      // Test token verification
      const verifyResponse = await fetch('http://localhost:3001/api/v1/admin/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (verifyResponse.ok) {
        console.log('✅ Token is valid and can be used for authentication');
      } else {
        console.log('❌ Token verification failed');
      }
    } else {
      console.log('❌ Could not get valid token for testing');
    }
    
    // Step 4: Test various paths
    console.log('\n4️⃣ Testing various UI paths...');
    const paths = [
      { path: '/', name: 'Root (Dashboard)' },
      { path: '/signin', name: 'Sign In' },
      { path: '/users', name: 'Users Management' },
      { path: '/trading', name: 'Trading Management' },
      { path: '/dashboard', name: 'Dashboard Direct (should 404)' },
      { path: '/nonexistent', name: 'Non-existent Path (should 404)' }
    ];
    
    for (const test of paths) {
      try {
        const response = await fetch(`http://localhost:3000${test.path}`, {
          redirect: 'manual'
        });
        const status = response.status;
        const location = response.headers.get('location');
        const statusIcon = status === 200 ? '✅' : status === 404 ? '⚠️' : status >= 300 && status < 400 ? '🔄' : '❌';
        
        let statusText = `${status}`;
        if (location) {
          statusText += ` → ${location}`;
        }
        
        console.log(`${statusIcon} ${test.name}: ${statusText}`);
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
      }
    }
    
    console.log('\n🎯 Analysis:');
    console.log('📋 Expected behavior for admin panel:');
    console.log('  1. Root path (/) should show dashboard for authenticated users');
    console.log('  2. Root path (/) should redirect to /signin for unauthenticated users');
    console.log('  3. /signin should always be accessible (status 200)');
    console.log('  4. /dashboard should return 404 (not a valid route in app router)');
    console.log('  5. AuthGuard should handle token validation client-side');
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('  - If root path always redirects to signin, check AuthGuard logic');
    console.log('  - If token expiry alerts appear on first visit, check token validation');
    console.log('  - If 404 appears after login, check redirect path in SignInForm');
    console.log('  - Clear localStorage and try fresh login if issues persist');
    
  } catch (error) {
    console.error('❌ Error in UI behavior test:', error.message);
  }
}

testUIBehavior();