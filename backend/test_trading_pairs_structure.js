const axios = require('axios');

async function testTradingPairsStructure() {
  try {
    console.log('🔍 Testing Trading Pairs Data Structure');
    console.log('=' .repeat(50));
    
    // Use existing admin token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiZW1haWwiOiJhZG1pbkBjZXguY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwidHlwZSI6ImFkbWluIiwiaWF0IjoxNzU2Mzk1MzM2LCJleHAiOjE3NTY0MjQxMzZ9.29VBNxXmF6NaKOr7zW286C6baJQbFhYmWp-9yutSPQc';
    console.log('✅ Using existing admin token');
    
    // Test trading pairs endpoint
    const response = await axios.get('http://localhost:3001/api/v1/admin/trading/pairs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n📊 Trading Pairs Response:');
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    
    if (response.data.data && response.data.data.trading_pairs) {
      const pairs = response.data.data.trading_pairs;
      console.log('\n📈 Number of trading pairs:', pairs.length);
      
      if (pairs.length > 0) {
        console.log('\n🔍 First Trading Pair Structure:');
        console.log(JSON.stringify(pairs[0], null, 2));
        
        console.log('\n📋 Available Properties:');
        Object.keys(pairs[0]).forEach(key => {
          const value = pairs[0][key];
          const type = typeof value;
          console.log(`  ${key}: ${type} = ${value}`);
        });
        
        // Check for missing properties that frontend expects
        const expectedProps = [
          'lastPrice', 'volume24h', 'priceChange24h', 
          'makerFee', 'takerFee', 'baseAsset', 'quoteAsset'
        ];
        
        console.log('\n❌ Missing Properties (causing NaN):');
        expectedProps.forEach(prop => {
          if (!(prop in pairs[0])) {
            console.log(`  - ${prop}`);
          }
        });
        
        console.log('\n✅ Available Properties:');
        expectedProps.forEach(prop => {
          if (prop in pairs[0]) {
            console.log(`  - ${prop}: ${pairs[0][prop]}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTradingPairsStructure();