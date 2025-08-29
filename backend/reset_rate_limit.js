const redis = require('redis');
require('dotenv').config();

/**
 * Script untuk mereset rate limit admin login
 * Digunakan ketika terlalu banyak percobaan login yang gagal
 */

async function resetAdminLoginRateLimit() {
  let redisClient;
  
  try {
    console.log('🔄 Mereset rate limit untuk admin login...');
    
    // Buat koneksi Redis baru dengan konfigurasi yang benar
    const redisConfig = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379
      },
      database: parseInt(process.env.REDIS_DB) || 0
    };
    
    // Tambahkan password jika ada
    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }
    
    console.log('🔧 Redis config:', {
      host: redisConfig.socket.host,
      port: redisConfig.socket.port,
      database: redisConfig.database,
      hasPassword: !!redisConfig.password
    });
    
    redisClient = redis.createClient(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
    console.log('✅ Terhubung ke Redis');
    
    // Pattern untuk mencari semua key rate limit admin login
    const patterns = [
      'rate_limit:*', // General rate limit keys
      'auth:*', // Auth rate limit keys
      'admin:*', // Admin rate limit keys
      'login:*' // Login rate limit keys
    ];
    
    let totalDeleted = 0;
    
    for (const pattern of patterns) {
      try {
        // Scan untuk mencari keys yang match dengan pattern
        const keys = await redisClient.keys(pattern);
        
        if (keys.length > 0) {
          console.log(`📋 Ditemukan ${keys.length} keys untuk pattern: ${pattern}`);
          
          // Delete semua keys yang ditemukan
          const deleted = await redisClient.del(...keys);
          totalDeleted += deleted;
          
          console.log(`🗑️  Berhasil menghapus ${deleted} keys untuk pattern: ${pattern}`);
        } else {
          console.log(`ℹ️  Tidak ada keys ditemukan untuk pattern: ${pattern}`);
        }
      } catch (error) {
        console.error(`❌ Error saat memproses pattern ${pattern}:`, error.message);
      }
    }
    
    // Juga reset specific IP-based rate limits
    const ipPatterns = [
      'rate_limit:::1*', // IPv6 localhost
      'rate_limit:127.0.0.1*', // IPv4 localhost
      'rate_limit:localhost*' // localhost
    ];
    
    for (const pattern of ipPatterns) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          const deleted = await redisClient.del(...keys);
          totalDeleted += deleted;
          console.log(`🗑️  Berhasil menghapus ${deleted} IP-based rate limit keys`);
        }
      } catch (error) {
        console.error(`❌ Error saat memproses IP pattern ${pattern}:`, error.message);
      }
    }
    
    console.log(`\n✅ Selesai! Total ${totalDeleted} rate limit keys berhasil dihapus`);
    console.log('🚀 Sekarang Anda bisa mencoba login admin lagi');
    
    // Tampilkan info rate limit yang aktif
    console.log('\n📊 Info Rate Limit Admin Login:');
    console.log('   - Window: 15 menit');
    console.log('   - Max attempts: 5 per window');
    console.log('   - Setelah reset ini, counter dimulai dari 0');
    
  } catch (error) {
    console.error('❌ Error saat mereset rate limit:', error);
  } finally {
    // Tutup koneksi Redis dengan aman
    if (redisClient) {
      try {
        await redisClient.quit();
        console.log('🔌 Koneksi Redis ditutup');
      } catch (closeError) {
        console.log('ℹ️  Koneksi Redis sudah tertutup');
      }
    }
    process.exit(0);
  }
}

// Jalankan script
if (require.main === module) {
  resetAdminLoginRateLimit();
}

module.exports = { resetAdminLoginRateLimit };