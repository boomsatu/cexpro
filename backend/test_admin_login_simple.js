const axios = require('axios');

/**
 * Script sederhana untuk test login admin
 * Untuk memverifikasi apakah rate limiting sudah teratasi
 */

async function testAdminLogin() {
  try {
    console.log('🔐 Testing admin login...');
    
    const loginData = {
      email: 'admin@cex.com',
      password: 'Admin123!@#'
    };
    
    console.log('📤 Mengirim request login ke:', 'http://localhost:3001/api/v1/admin/auth/login');
    console.log('📋 Data login:', { email: loginData.email, password: '***' });
    
    const response = await axios.post('http://localhost:3001/api/v1/admin/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      },
      timeout: 10000
    });
    
    console.log('✅ Login berhasil!');
    console.log('📊 Status:', response.status);
    console.log('🎫 Token diterima:', response.data.data?.token ? 'Ya' : 'Tidak');
    console.log('👤 Admin data:', response.data.data?.admin?.email || 'Tidak ada');
    
    // Test verifikasi token
    if (response.data.data?.token) {
      console.log('\n🔍 Testing token verification...');
      
      const verifyResponse = await axios.get('http://localhost:3001/api/v1/admin/auth/verify', {
        headers: {
          'Authorization': `Bearer ${response.data.data.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('✅ Token verification berhasil!');
      console.log('📊 Verify status:', verifyResponse.status);
      console.log('👤 Verified admin:', verifyResponse.data.data?.email || 'Tidak ada');
    }
    
  } catch (error) {
    console.error('❌ Error saat testing login:');
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Status Text:', error.response.statusText);
      console.error('💬 Error Message:', error.response.data?.error || error.response.data?.message || 'Tidak ada pesan error');
      console.error('🔢 Error Code:', error.response.data?.code || 'Tidak ada kode error');
      
      // Tampilkan rate limit headers jika ada
      const headers = error.response.headers;
      if (headers['x-ratelimit-limit']) {
        console.error('\n📈 Rate Limit Info:');
        console.error('   - Limit:', headers['x-ratelimit-limit']);
        console.error('   - Remaining:', headers['x-ratelimit-remaining']);
        console.error('   - Reset:', headers['x-ratelimit-reset']);
      }
      
      if (headers['retry-after']) {
        console.error('   - Retry After:', headers['retry-after'], 'seconds');
      }
    } else if (error.request) {
      console.error('📡 Tidak ada response dari server');
      console.error('🔗 Request URL:', error.config?.url);
    } else {
      console.error('⚠️  Error:', error.message);
    }
  }
}

// Jalankan test
if (require.main === module) {
  testAdminLogin();
}

module.exports = { testAdminLogin };