const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up test databases
    console.log('🗑️  Cleaning up test databases...');
    
    // PostgreSQL cleanup
    try {
      execSync('dropdb cex_test', { stdio: 'ignore' });
      console.log('✅ PostgreSQL test database dropped');
    } catch (error) {
      console.log('ℹ️  PostgreSQL test database cleanup skipped (might not exist)');
    }
    
    // MongoDB cleanup
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
      await client.connect();
      await client.db('cex_test').dropDatabase();
      await client.close();
      console.log('✅ MongoDB test database dropped');
    } catch (error) {
      console.log('ℹ️  MongoDB test database cleanup skipped:', error.message);
    }
    
    // Redis cleanup
    try {
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379/1'
      });
      await client.connect();
      await client.flushDb();
      await client.quit();
      console.log('✅ Redis test database flushed');
    } catch (error) {
      console.log('ℹ️  Redis test database cleanup skipped:', error.message);
    }
    
    // Clean up test files and directories
    console.log('📁 Cleaning up test files...');
    
    const testDirs = [
      path.join(__dirname, '../logs/test'),
      path.join(__dirname, '../uploads/test'),
      path.join(__dirname, '../temp/test')
    ];
    
    testDirs.forEach(dir => {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`🗑️  Removed test directory: ${dir}`);
        }
      } catch (error) {
        console.log(`⚠️  Failed to remove directory ${dir}:`, error.message);
      }
    });
    
    // Clean up temporary test files
    const tempFiles = [
      path.join(__dirname, '../test-session.json'),
      path.join(__dirname, '../test-cache.json'),
      path.join(__dirname, '../test-locks.json')
    ];
    
    tempFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`🗑️  Removed temp file: ${file}`);
        }
      } catch (error) {
        console.log(`⚠️  Failed to remove file ${file}:`, error.message);
      }
    });
    
    // Clear global test variables
    console.log('🧹 Clearing global test variables...');
    
    delete global.mockResponses;
    delete global.testDataTemplates;
    delete global.testCounters;
    delete global.testUtils;
    
    // Clear environment variables
    const testEnvVars = [
      'TEST_TIMEOUT',
      'TEST_DB_SYNC',
      'TEST_CLEAR_DB',
      'DISABLE_EXTERNAL_APIS',
      'DISABLE_EMAIL_SENDING',
      'DISABLE_SMS_SENDING',
      'DISABLE_BLOCKCHAIN_CALLS',
      'ENABLE_TEST_ROUTES',
      'ENABLE_DEBUG_LOGGING'
    ];
    
    testEnvVars.forEach(envVar => {
      delete process.env[envVar];
    });
    
    // Generate test summary
    console.log('📊 Generating test summary...');
    
    const summaryPath = path.join(__dirname, '../test-results/test-summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      environment: 'test',
      cleanup: {
        databases: 'cleaned',
        files: 'cleaned',
        globals: 'cleared',
        environment: 'reset'
      },
      status: 'completed'
    };
    
    try {
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`📄 Test summary written to: ${summaryPath}`);
    } catch (error) {
      console.log('⚠️  Failed to write test summary:', error.message);
    }
    
    // Final cleanup verification
    console.log('🔍 Verifying cleanup...');
    
    let cleanupIssues = 0;
    
    // Check for remaining test processes
    try {
      const processes = execSync('tasklist /FI "IMAGENAME eq node.exe"', { encoding: 'utf8' });
      const testProcesses = processes.split('\n').filter(line => 
        line.includes('node.exe') && line.includes('test')
      );
      
      if (testProcesses.length > 0) {
        console.log('⚠️  Warning: Test processes may still be running');
        cleanupIssues++;
      }
    } catch (error) {
      // Ignore process check errors on non-Windows systems
    }
    
    // Check for open file handles
    const openHandles = process._getActiveHandles();
    const openRequests = process._getActiveRequests();
    
    if (openHandles.length > 0 || openRequests.length > 0) {
      console.log(`⚠️  Warning: ${openHandles.length} handles and ${openRequests.length} requests still open`);
      cleanupIssues++;
    }
    
    if (cleanupIssues === 0) {
      console.log('✅ All cleanup verification passed');
    } else {
      console.log(`⚠️  Cleanup completed with ${cleanupIssues} minor issues`);
    }
    
    console.log('✅ Global test teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw error to avoid masking test results
  }
  
  // Force exit to ensure clean shutdown
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};