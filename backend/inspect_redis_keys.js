const redis = require('redis');
require('dotenv').config();

/**
 * Script untuk melihat semua keys di Redis
 * Untuk mencari pattern rate limiting yang tepat
 */

async function inspectRedisKeys() {
  let redisClient;
  
  try {
    console.log('🔍 Inspecting Redis keys...');
    
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
    
    redisClient = redis.createClient(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
    console.log('✅ Terhubung ke Redis');
    
    // Ambil semua keys
    console.log('\n📋 Mencari semua keys di Redis...');
    const allKeys = await redisClient.keys('*');
    
    console.log(`\n📊 Total keys ditemukan: ${allKeys.length}`);
    
    if (allKeys.length === 0) {
      console.log('ℹ️  Tidak ada keys di Redis');
      return;
    }
    
    // Kelompokkan keys berdasarkan prefix
    const keyGroups = {};
    const rateLimitKeys = [];
    
    allKeys.forEach(key => {
      const prefix = key.split(':')[0];
      if (!keyGroups[prefix]) {
        keyGroups[prefix] = [];
      }
      keyGroups[prefix].push(key);
      
      // Cari keys yang mungkin terkait rate limiting
      if (key.toLowerCase().includes('rate') || 
          key.toLowerCase().includes('limit') ||
          key.toLowerCase().includes('login') ||
          key.toLowerCase().includes('auth') ||
          key.includes('::1') || // IPv6 localhost
          key.includes('127.0.0.1')) { // IPv4 localhost
        rateLimitKeys.push(key);
      }
    });
    
    console.log('\n📂 Keys dikelompokkan berdasarkan prefix:');
    Object.keys(keyGroups).sort().forEach(prefix => {
      console.log(`   ${prefix}: ${keyGroups[prefix].length} keys`);
    });
    
    if (rateLimitKeys.length > 0) {
      console.log('\n🚨 Keys yang mungkin terkait rate limiting:');
      for (const key of rateLimitKeys) {
        try {
          const ttl = await redisClient.ttl(key);
          const value = await redisClient.get(key);
          console.log(`   📌 ${key}`);
          console.log(`      Value: ${value}`);
          console.log(`      TTL: ${ttl} seconds (${ttl > 0 ? Math.ceil(ttl/60) + ' minutes' : 'no expiry'})`);
        } catch (error) {
          console.log(`   📌 ${key} (error reading: ${error.message})`);
        }
      }
      
      // Tanya apakah ingin menghapus keys ini
      console.log('\n❓ Keys di atas akan dihapus untuk mereset rate limit...');
      
      // Hapus semua rate limit keys
      if (rateLimitKeys.length > 0) {
        const deleted = await redisClient.del(...rateLimitKeys);
        console.log(`\n✅ Berhasil menghapus ${deleted} rate limit keys`);
        console.log('🚀 Rate limit sudah direset!');
      }
    } else {
      console.log('\nℹ️  Tidak ada keys rate limiting yang ditemukan');
      
      // Tampilkan beberapa keys untuk debugging
      if (allKeys.length > 0) {
        console.log('\n🔍 Sample keys (first 10):');
        allKeys.slice(0, 10).forEach(key => {
          console.log(`   - ${key}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error saat inspecting Redis:', error);
  } finally {
    // Tutup koneksi Redis dengan aman
    if (redisClient) {
      try {
        await redisClient.quit();
        console.log('\n🔌 Koneksi Redis ditutup');
      } catch (closeError) {
        console.log('ℹ️  Koneksi Redis sudah tertutup');
      }
    }
    process.exit(0);
  }
}

// Jalankan script
if (require.main === module) {
  inspectRedisKeys();
}

module.exports = { inspectRedisKeys };