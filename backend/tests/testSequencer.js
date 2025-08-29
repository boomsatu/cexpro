const Sequencer = require('@jest/test-sequencer').default;
const path = require('path');

class CustomTestSequencer extends Sequencer {
  /**
   * Sort test files to run in optimal order
   * Priority order:
   * 1. Database tests (setup schemas and connections)
   * 2. Authentication tests (basic auth functionality)
   * 3. Trading tests (core business logic)
   * 4. WebSocket tests (real-time functionality)
   * 5. Integration tests (end-to-end scenarios)
   */
  sort(tests) {
    // Define test priorities (lower number = higher priority)
    const testPriorities = {
      // Database tests should run first
      'database.test.js': 1,
      'models.test.js': 2,
      'migrations.test.js': 3,
      
      // Authentication tests
      'auth.test.js': 10,
      'user.test.js': 11,
      'session.test.js': 12,
      
      // Core business logic tests
      'trading.test.js': 20,
      'orders.test.js': 21,
      'matching.test.js': 22,
      'balance.test.js': 23,
      'wallet.test.js': 24,
      
      // Market data tests
      'market.test.js': 30,
      'ticker.test.js': 31,
      'orderbook.test.js': 32,
      
      // Real-time functionality
      'websocket.test.js': 40,
      'streaming.test.js': 41,
      'notifications.test.js': 42,
      
      // Security tests
      'security.test.js': 50,
      'ratelimit.test.js': 51,
      'validation.test.js': 52,
      
      // Integration tests (should run last)
      'integration.test.js': 90,
      'e2e.test.js': 91,
      'performance.test.js': 92,
      
      // Cleanup tests
      'cleanup.test.js': 99
    };
    
    // Sort tests based on priority
    const sortedTests = tests.sort((testA, testB) => {
      const fileNameA = path.basename(testA.path);
      const fileNameB = path.basename(testB.path);
      
      const priorityA = testPriorities[fileNameA] || 50; // Default priority
      const priorityB = testPriorities[fileNameB] || 50; // Default priority
      
      // Primary sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Secondary sort by file path (alphabetical)
      return testA.path.localeCompare(testB.path);
    });
    
    // Log test execution order for debugging
    if (process.env.NODE_ENV === 'test' && process.env.DEBUG_TEST_ORDER) {
      console.log('\n📋 Test execution order:');
      sortedTests.forEach((test, index) => {
        const fileName = path.basename(test.path);
        const priority = testPriorities[fileName] || 50;
        console.log(`${index + 1}. ${fileName} (priority: ${priority})`);
      });
      console.log('');
    }
    
    return sortedTests;
  }
  
  /**
   * Determine if tests should run in parallel or serial
   * Some tests need to run serially to avoid conflicts
   */
  allFailedTests(tests) {
    // Group tests that should run serially
    const serialTests = [
      'database.test.js',
      'migrations.test.js',
      'websocket.test.js',
      'integration.test.js',
      'e2e.test.js'
    ];
    
    const failedTests = tests.filter(test => {
      const fileName = path.basename(test.path);
      return serialTests.includes(fileName);
    });
    
    return failedTests;
  }
  
  /**
   * Custom logic for handling test dependencies
   */
  shard(tests, { shardIndex, shardCount }) {
    // Ensure database tests always run in the first shard
    const databaseTests = tests.filter(test => {
      const fileName = path.basename(test.path);
      return fileName.includes('database') || fileName.includes('migration');
    });
    
    const otherTests = tests.filter(test => {
      const fileName = path.basename(test.path);
      return !fileName.includes('database') && !fileName.includes('migration');
    });
    
    if (shardIndex === 0) {
      // First shard gets database tests plus some others
      const testsPerShard = Math.ceil(otherTests.length / shardCount);
      const startIndex = 0;
      const endIndex = testsPerShard;
      
      return [
        ...databaseTests,
        ...otherTests.slice(startIndex, endIndex)
      ];
    } else {
      // Other shards get remaining tests
      const testsPerShard = Math.ceil(otherTests.length / shardCount);
      const startIndex = (shardIndex - 1) * testsPerShard + testsPerShard;
      const endIndex = startIndex + testsPerShard;
      
      return otherTests.slice(startIndex, endIndex);
    }
  }
}

module.exports = CustomTestSequencer;