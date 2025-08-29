const { sequelize } = require('./src/config/database');
const Cryptocurrency = require('./src/models/Cryptocurrency');

/**
 * Script untuk menambahkan data cryptocurrency default
 */

const defaultCryptocurrencies = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    full_name: 'Bitcoin',
    decimals: 8,
    blockchain: 'bitcoin',
    is_active: true,
    is_fiat: false,
    min_deposit: 0.0001,
    min_withdrawal: 0.001,
    withdrawal_fee: 0.0005,
    confirmation_blocks: 6,
    logo_url: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    website_url: 'https://bitcoin.org',
    explorer_url: 'https://blockstream.info/tx/'
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    full_name: 'Ethereum',
    decimals: 18,
    blockchain: 'ethereum',
    is_active: true,
    is_fiat: false,
    min_deposit: 0.01,
    min_withdrawal: 0.01,
    withdrawal_fee: 0.005,
    confirmation_blocks: 12,
    logo_url: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    website_url: 'https://ethereum.org',
    explorer_url: 'https://etherscan.io/tx/'
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    full_name: 'Tether USD',
    decimals: 6,
    contract_address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    blockchain: 'ethereum',
    is_active: true,
    is_fiat: false,
    min_deposit: 1,
    min_withdrawal: 10,
    withdrawal_fee: 1,
    confirmation_blocks: 12,
    logo_url: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    website_url: 'https://tether.to',
    explorer_url: 'https://etherscan.io/tx/'
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    full_name: 'BNB',
    decimals: 18,
    blockchain: 'binance-smart-chain',
    is_active: true,
    is_fiat: false,
    min_deposit: 0.01,
    min_withdrawal: 0.01,
    withdrawal_fee: 0.005,
    confirmation_blocks: 15,
    logo_url: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    website_url: 'https://www.binance.com',
    explorer_url: 'https://bscscan.com/tx/'
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    full_name: 'Cardano',
    decimals: 6,
    blockchain: 'cardano',
    is_active: true,
    is_fiat: false,
    min_deposit: 1,
    min_withdrawal: 5,
    withdrawal_fee: 1,
    confirmation_blocks: 15,
    logo_url: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
    website_url: 'https://cardano.org',
    explorer_url: 'https://cardanoscan.io/transaction/'
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    full_name: 'Solana',
    decimals: 9,
    blockchain: 'solana',
    is_active: true,
    is_fiat: false,
    min_deposit: 0.01,
    min_withdrawal: 0.01,
    withdrawal_fee: 0.005,
    confirmation_blocks: 1,
    logo_url: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    website_url: 'https://solana.com',
    explorer_url: 'https://solscan.io/tx/'
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    full_name: 'Polkadot',
    decimals: 10,
    blockchain: 'polkadot',
    is_active: true,
    is_fiat: false,
    min_deposit: 0.1,
    min_withdrawal: 1,
    withdrawal_fee: 0.1,
    confirmation_blocks: 6,
    logo_url: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png',
    website_url: 'https://polkadot.network',
    explorer_url: 'https://polkascan.io/polkadot/transaction/'
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    full_name: 'Polygon',
    decimals: 18,
    blockchain: 'polygon',
    is_active: true,
    is_fiat: false,
    min_deposit: 1,
    min_withdrawal: 10,
    withdrawal_fee: 1,
    confirmation_blocks: 128,
    logo_url: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    website_url: 'https://polygon.technology',
    explorer_url: 'https://polygonscan.com/tx/'
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    full_name: 'Avalanche',
    decimals: 18,
    blockchain: 'avalanche',
    is_active: true,
    is_fiat: false,
    min_deposit: 0.01,
    min_withdrawal: 0.01,
    withdrawal_fee: 0.005,
    confirmation_blocks: 1,
    logo_url: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
    website_url: 'https://www.avax.network',
    explorer_url: 'https://snowtrace.io/tx/'
  },
  {
    symbol: 'LTC',
    name: 'Litecoin',
    full_name: 'Litecoin',
    decimals: 8,
    blockchain: 'litecoin',
    is_active: true,
    is_fiat: false,
    min_deposit: 0.001,
    min_withdrawal: 0.01,
    withdrawal_fee: 0.001,
    confirmation_blocks: 6,
    logo_url: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
    website_url: 'https://litecoin.org',
    explorer_url: 'https://blockchair.com/litecoin/transaction/'
  }
];

async function seedCryptocurrencies() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('🔄 Syncing Cryptocurrency model...');
    await Cryptocurrency.sync();
    console.log('✅ Cryptocurrency model synced');

    console.log('🔄 Seeding cryptocurrencies...');
    
    for (const cryptoData of defaultCryptocurrencies) {
      const [cryptocurrency, created] = await Cryptocurrency.findOrCreate({
        where: { symbol: cryptoData.symbol },
        defaults: cryptoData
      });
      
      if (created) {
        console.log(`✅ Created cryptocurrency: ${cryptoData.symbol} - ${cryptoData.name}`);
      } else {
        console.log(`ℹ️  Cryptocurrency already exists: ${cryptoData.symbol} - ${cryptoData.name}`);
      }
    }

    console.log('🎉 Cryptocurrency seeding completed successfully!');
    console.log(`📊 Total cryptocurrencies in database: ${await Cryptocurrency.count()}`);
    
  } catch (error) {
    console.error('❌ Error seeding cryptocurrencies:', error);
    console.error('❌ Error stack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding function
if (require.main === module) {
  seedCryptocurrencies();
}

module.exports = { seedCryptocurrencies, defaultCryptocurrencies };