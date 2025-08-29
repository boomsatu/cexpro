const crypto = require('crypto');
const { BIP32Factory } = require('bip32');
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const bip32 = BIP32Factory(ecc);
const { Op } = require('sequelize');
const redis = require('../config/redis');
const Wallet = require('../models/Wallet');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const EventEmitter = require('events');

/**
 * Wallet Service
 * Mengelola sistem dompet multi-signature dengan arsitektur hot/warm/cold wallet,
 * HD wallet generation, address management, dan blockchain integration
 */
class WalletService extends EventEmitter {
  constructor() {
    super();
    
    // Configuration
    this.config = {
      // HD Wallet configuration
      hdWallet: {
        masterSeedEntropy: 256, // bits
        derivationPaths: {
          bitcoin: "m/44'/0'/0'",
          ethereum: "m/44'/60'/0'",
          litecoin: "m/44'/2'/0'",
          dogecoin: "m/44'/3'/0'"
        },
        addressGap: 20, // unused addresses to maintain
        maxAddressIndex: 1000000
      },
      
      // Multi-signature configuration
      multisig: {
        defaultThreshold: 2,
        maxSigners: 15,
        minSigners: 2
      },
      
      // Wallet types and their security levels
      walletTypes: {
        hot: {
          maxBalance: 1000000, // USD equivalent
          autoConsolidation: true,
          requiresApproval: false
        },
        warm: {
          maxBalance: 10000000, // USD equivalent
          autoConsolidation: false,
          requiresApproval: true
        },
        cold: {
          maxBalance: Infinity,
          autoConsolidation: false,
          requiresApproval: true,
          offlineSigningRequired: true
        }
      },
      
      // Security settings
      security: {
        encryptionAlgorithm: 'aes-256-gcm',
        keyDerivationRounds: 100000,
        backupRequired: true,
        auditTrail: true
      },
      
      // Operational limits
      limits: {
        dailyWithdrawalLimit: 100000, // USD
        maxPendingTransactions: 100,
        consolidationThreshold: 0.1, // BTC equivalent
        dustThreshold: 0.00001 // BTC
      }
    };
    
    // Cache for frequently accessed data
    this.cache = {
      wallets: new Map(),
      addresses: new Map(),
      balances: new Map()
    };
    
    // Network configurations
    this.networks = {
      bitcoin: bitcoin.networks.bitcoin,
      testnet: bitcoin.networks.testnet,
      litecoin: {
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bech32: 'ltc',
        bip32: {
          public: 0x019da462,
          private: 0x019d9cfe
        },
        pubKeyHash: 0x30,
        scriptHash: 0x32,
        wif: 0xb0
      }
    };
    
    this.initializeService();
  }
  
  /**
   * Initialize wallet service
   */
  async initializeService() {
    try {
      // Load master keys from secure storage
      await this.loadMasterKeys();
      
      // Initialize blockchain connections
      await this.initializeBlockchainConnections();
      
      // Start background tasks
      this.startBackgroundTasks();
      
      console.log('Wallet service initialized successfully');
      
    } catch (error) {
      console.error('Error initializing wallet service:', error);
      throw error;
    }
  }
  
  /**
   * Create new wallet for user
   */
  async createWallet(userId, currency, walletType = 'hot', options = {}) {
    try {
      // Validate parameters
      if (!userId || !currency) {
        throw new Error('User ID and currency are required');
      }
      
      if (!['hot', 'warm', 'cold'].includes(walletType)) {
        throw new Error('Invalid wallet type');
      }
      
      // Check if user already has a wallet for this currency and type
      const existingWallet = await Wallet.findOne({
        where: {
          user_id: userId,
          currency: currency.toLowerCase(),
          wallet_type: walletType,
          status: 'active'
        }
      });
      
      if (existingWallet && !options.allowMultiple) {
        throw new Error(`User already has a ${walletType} wallet for ${currency}`);
      }
      
      // Generate wallet data
      const walletData = await this.generateWalletData(currency, walletType, options);
      
      // Create wallet record
      const wallet = await Wallet.create({
        user_id: userId,
        wallet_type: walletType,
        currency: currency.toLowerCase(),
        network: walletData.network,
        address: walletData.address,
        public_key: walletData.publicKey,
        derivation_path: walletData.derivationPath,
        address_index: walletData.addressIndex,
        parent_wallet_id: walletData.parentWalletId,
        multisig_config: walletData.multisigConfig,
        status: 'active',
        is_primary: options.isPrimary || false,
        current_balance: 0,
        pending_balance: 0,
        encryption_key_id: walletData.encryptionKeyId,
        backup_status: 'pending',
        risk_score: this.calculateRiskScore(walletType),
        monitoring_enabled: true,
        daily_withdrawal_limit: this.config.limits.dailyWithdrawalLimit,
        metadata: {
          createdBy: 'system',
          walletVersion: '1.0',
          ...options.metadata
        }
      });
      
      // Create initial balance record
      await Balance.create({
        user_id: userId,
        currency: currency.toLowerCase(),
        currency_type: this.getCurrencyType(currency),
        available: 0,
        locked: 0
      });
      
      // Cache wallet
      this.cache.wallets.set(wallet.id, wallet);
      
      // Emit event
      this.emit('walletCreated', {
        walletId: wallet.id,
        userId,
        currency,
        walletType,
        address: wallet.address
      });
      
      return wallet;
      
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }
  
  /**
   * Generate wallet data based on currency and type
   */
  async generateWalletData(currency, walletType, options = {}) {
    try {
      const currencyLower = currency.toLowerCase();
      
      switch (currencyLower) {
        case 'btc':
        case 'bitcoin':
          return await this.generateBitcoinWallet(walletType, options);
          
        case 'eth':
        case 'ethereum':
          return await this.generateEthereumWallet(walletType, options);
          
        case 'ltc':
        case 'litecoin':
          return await this.generateLitecoinWallet(walletType, options);
          
        default:
          throw new Error(`Unsupported currency: ${currency}`);
      }
      
    } catch (error) {
      console.error(`Error generating wallet data for ${currency}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate Bitcoin wallet
   */
  async generateBitcoinWallet(walletType, options = {}) {
    try {
      const network = options.testnet ? this.networks.testnet : this.networks.bitcoin;
      const derivationPath = this.config.hdWallet.derivationPaths.bitcoin;
      
      // Get next address index
      const addressIndex = await this.getNextAddressIndex('bitcoin', derivationPath);
      
      // Generate HD wallet
      const masterKey = await this.getMasterKey('bitcoin');
      const childKey = masterKey.derivePath(`${derivationPath}/0/${addressIndex}`);
      
      let address, publicKey, multisigConfig = null;
      
      if (walletType === 'cold' || options.multisig) {
        // Generate multi-signature wallet
        const multisigData = await this.generateMultisigWallet('bitcoin', childKey, options);
        address = multisigData.address;
        publicKey = multisigData.publicKey;
        multisigConfig = multisigData.config;
      } else {
        // Generate single-signature wallet
        const { address: singleAddress } = bitcoin.payments.p2wpkh({
          pubkey: childKey.publicKey,
          network
        });
        address = singleAddress;
        publicKey = childKey.publicKey.toString('hex');
      }
      
      return {
        network: network === this.networks.testnet ? 'testnet' : 'mainnet',
        address,
        publicKey,
        derivationPath: `${derivationPath}/0/${addressIndex}`,
        addressIndex,
        multisigConfig,
        encryptionKeyId: await this.generateEncryptionKey()
      };
      
    } catch (error) {
      console.error('Error generating Bitcoin wallet:', error);
      throw error;
    }
  }
  
  /**
   * Generate Ethereum wallet
   */
  async generateEthereumWallet(walletType, options = {}) {
    try {
      // Ethereum wallet generation logic
      // This is a simplified implementation
      const derivationPath = this.config.hdWallet.derivationPaths.ethereum;
      const addressIndex = await this.getNextAddressIndex('ethereum', derivationPath);
      
      // Generate address (simplified)
      const address = '0x' + crypto.randomBytes(20).toString('hex');
      const publicKey = crypto.randomBytes(33).toString('hex');
      
      return {
        network: 'mainnet',
        address,
        publicKey,
        derivationPath: `${derivationPath}/0/${addressIndex}`,
        addressIndex,
        multisigConfig: null,
        encryptionKeyId: await this.generateEncryptionKey()
      };
      
    } catch (error) {
      console.error('Error generating Ethereum wallet:', error);
      throw error;
    }
  }
  
  /**
   * Generate Litecoin wallet
   */
  async generateLitecoinWallet(walletType, options = {}) {
    try {
      const network = this.networks.litecoin;
      const derivationPath = this.config.hdWallet.derivationPaths.litecoin;
      const addressIndex = await this.getNextAddressIndex('litecoin', derivationPath);
      
      // Generate HD wallet
      const masterKey = await this.getMasterKey('litecoin');
      const childKey = masterKey.derivePath(`${derivationPath}/0/${addressIndex}`);
      
      // Generate address (simplified for Litecoin)
      const address = 'L' + crypto.randomBytes(25).toString('base64').substring(0, 33);
      const publicKey = childKey.publicKey.toString('hex');
      
      return {
        network: 'mainnet',
        address,
        publicKey,
        derivationPath: `${derivationPath}/0/${addressIndex}`,
        addressIndex,
        multisigConfig: null,
        encryptionKeyId: await this.generateEncryptionKey()
      };
      
    } catch (error) {
      console.error('Error generating Litecoin wallet:', error);
      throw error;
    }
  }
  
  /**
   * Generate multi-signature wallet
   */
  async generateMultisigWallet(currency, childKey, options = {}) {
    try {
      const threshold = options.threshold || this.config.multisig.defaultThreshold;
      const signers = options.signers || [];
      
      // Add current key as first signer
      const publicKeys = [childKey.publicKey];
      
      // Add additional signers
      for (let i = 1; i < threshold + 1; i++) {
        if (signers[i - 1]) {
          publicKeys.push(Buffer.from(signers[i - 1], 'hex'));
        } else {
          // Generate additional keys for multi-sig
          const additionalKey = childKey.derive(i);
          publicKeys.push(additionalKey.publicKey);
        }
      }
      
      // Create multi-sig address
      const network = currency === 'bitcoin' ? this.networks.bitcoin : this.networks.testnet;
      const { address } = bitcoin.payments.p2wsh({
        redeem: bitcoin.payments.p2ms({
          m: threshold,
          pubkeys: publicKeys,
          network
        }),
        network
      });
      
      return {
        address,
        publicKey: childKey.publicKey.toString('hex'),
        config: {
          threshold,
          signers: publicKeys.map(pk => pk.toString('hex')),
          type: 'p2wsh'
        }
      };
      
    } catch (error) {
      console.error('Error generating multi-signature wallet:', error);
      throw error;
    }
  }
  
  /**
   * Get user wallets
   */
  async getUserWallets(userId, currency = null, walletType = null) {
    try {
      const whereClause = {
        user_id: userId,
        status: 'active'
      };
      
      if (currency) {
        whereClause.currency = currency.toLowerCase();
      }
      
      if (walletType) {
        whereClause.wallet_type = walletType;
      }
      
      const wallets = await Wallet.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });
      
      return wallets;
      
    } catch (error) {
      console.error('Error getting user wallets:', error);
      throw error;
    }
  }
  
  /**
   * Get wallet by address
   */
  async getWalletByAddress(address) {
    try {
      // Check cache first
      const cached = this.cache.addresses.get(address);
      if (cached) {
        return cached;
      }
      
      const wallet = await Wallet.findOne({
        where: { address, status: 'active' },
        include: [{
          model: User,
          attributes: ['id', 'username', 'email']
        }]
      });
      
      if (wallet) {
        this.cache.addresses.set(address, wallet);
      }
      
      return wallet;
      
    } catch (error) {
      console.error('Error getting wallet by address:', error);
      throw error;
    }
  }
  
  /**
   * Update wallet balance
   */
  async updateWalletBalance(walletId, newBalance, pendingBalance = null) {
    try {
      const updateData = {
        current_balance: newBalance,
        last_balance_update: new Date()
      };
      
      if (pendingBalance !== null) {
        updateData.pending_balance = pendingBalance;
      }
      
      await Wallet.update(updateData, {
        where: { id: walletId }
      });
      
      // Update cache
      const wallet = this.cache.wallets.get(walletId);
      if (wallet) {
        wallet.current_balance = newBalance;
        if (pendingBalance !== null) {
          wallet.pending_balance = pendingBalance;
        }
        wallet.last_balance_update = new Date();
      }
      
      // Emit event
      this.emit('balanceUpdated', {
        walletId,
        newBalance,
        pendingBalance
      });
      
      return true;
      
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }
  
  /**
   * Generate new address for wallet
   */
  async generateNewAddress(walletId) {
    try {
      const wallet = await Wallet.findByPk(walletId);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Generate new address based on HD wallet
      const newAddressIndex = wallet.address_index + 1;
      const walletData = await this.generateWalletData(
        wallet.currency,
        wallet.wallet_type,
        {
          addressIndex: newAddressIndex,
          parentWalletId: wallet.parent_wallet_id
        }
      );
      
      // Create new wallet record for the new address
      const newWallet = await Wallet.create({
        user_id: wallet.user_id,
        wallet_type: wallet.wallet_type,
        currency: wallet.currency,
        network: wallet.network,
        address: walletData.address,
        public_key: walletData.publicKey,
        derivation_path: walletData.derivationPath,
        address_index: newAddressIndex,
        parent_wallet_id: wallet.id,
        multisig_config: wallet.multisig_config,
        status: 'active',
        is_primary: false,
        current_balance: 0,
        pending_balance: 0,
        encryption_key_id: walletData.encryptionKeyId,
        backup_status: 'pending',
        risk_score: wallet.risk_score,
        monitoring_enabled: true,
        daily_withdrawal_limit: wallet.daily_withdrawal_limit
      });
      
      return newWallet;
      
    } catch (error) {
      console.error('Error generating new address:', error);
      throw error;
    }
  }
  
  /**
   * Consolidate wallet funds
   */
  async consolidateWalletFunds(userId, currency, targetWalletType = 'hot') {
    try {
      // Get all wallets for user and currency
      const wallets = await this.getUserWallets(userId, currency);
      
      // Find target wallet
      const targetWallet = wallets.find(w => w.wallet_type === targetWalletType && w.is_primary);
      
      if (!targetWallet) {
        throw new Error(`Target ${targetWalletType} wallet not found`);
      }
      
      // Find wallets with balance to consolidate
      const sourceWallets = wallets.filter(w => 
        w.id !== targetWallet.id && 
        parseFloat(w.current_balance) > this.config.limits.dustThreshold
      );
      
      const consolidationTxs = [];
      
      for (const sourceWallet of sourceWallets) {
        // Create consolidation transaction
        const tx = await Transaction.create({
          internal_tx_id: this.generateTransactionId(),
          user_id: userId,
          wallet_id: sourceWallet.id,
          type: 'internal_transfer',
          currency: currency.toLowerCase(),
          amount: sourceWallet.current_balance,
          fee: 0,
          from_address: sourceWallet.address,
          to_address: targetWallet.address,
          status: 'pending',
          risk_score: 1, // Low risk for internal transfers
          aml_status: 'approved',
          notes: 'Wallet consolidation',
          metadata: {
            consolidationType: 'automatic',
            sourceWalletId: sourceWallet.id,
            targetWalletId: targetWallet.id
          }
        });
        
        consolidationTxs.push(tx);
      }
      
      // Emit event
      this.emit('consolidationStarted', {
        userId,
        currency,
        targetWalletId: targetWallet.id,
        transactionCount: consolidationTxs.length
      });
      
      return consolidationTxs;
      
    } catch (error) {
      console.error('Error consolidating wallet funds:', error);
      throw error;
    }
  }
  
  /**
   * Freeze wallet
   */
  async freezeWallet(walletId, reason, adminId) {
    try {
      await Wallet.update({
        is_frozen: true,
        frozen_reason: reason,
        frozen_by: adminId,
        frozen_at: new Date()
      }, {
        where: { id: walletId }
      });
      
      // Clear cache
      this.cache.wallets.delete(walletId);
      
      // Emit event
      this.emit('walletFrozen', {
        walletId,
        reason,
        adminId
      });
      
      return true;
      
    } catch (error) {
      console.error('Error freezing wallet:', error);
      throw error;
    }
  }
  
  /**
   * Unfreeze wallet
   */
  async unfreezeWallet(walletId, adminId) {
    try {
      await Wallet.update({
        is_frozen: false,
        frozen_reason: null,
        frozen_by: null,
        frozen_at: null,
        unfrozen_by: adminId,
        unfrozen_at: new Date()
      }, {
        where: { id: walletId }
      });
      
      // Clear cache
      this.cache.wallets.delete(walletId);
      
      // Emit event
      this.emit('walletUnfrozen', {
        walletId,
        adminId
      });
      
      return true;
      
    } catch (error) {
      console.error('Error unfreezing wallet:', error);
      throw error;
    }
  }
  
  /**
   * Get wallet statistics
   */
  async getWalletStats(userId = null) {
    try {
      const whereClause = { status: 'active' };
      if (userId) {
        whereClause.user_id = userId;
      }
      
      const stats = await Wallet.findAll({
        where: whereClause,
        attributes: [
          'wallet_type',
          'currency',
          [Wallet.sequelize.fn('COUNT', '*'), 'count'],
          [Wallet.sequelize.fn('SUM', Wallet.sequelize.col('current_balance')), 'total_balance']
        ],
        group: ['wallet_type', 'currency']
      });
      
      return stats;
      
    } catch (error) {
      console.error('Error getting wallet statistics:', error);
      throw error;
    }
  }
  
  /**
   * Helper methods
   */
  
  async loadMasterKeys() {
    // Load master keys from secure storage
    // This is a simplified implementation
    this.masterKeys = {
      bitcoin: bip32.fromSeed(crypto.randomBytes(64)),
      ethereum: bip32.fromSeed(crypto.randomBytes(64)),
      litecoin: bip32.fromSeed(crypto.randomBytes(64))
    };
  }
  
  async getMasterKey(currency) {
    return this.masterKeys[currency.toLowerCase()];
  }
  
  async getNextAddressIndex(currency, derivationPath) {
    // Get next available address index
    const lastWallet = await Wallet.findOne({
      where: {
        currency: currency.toLowerCase(),
        derivation_path: {
          [Op.like]: `${derivationPath}%`
        }
      },
      order: [['address_index', 'DESC']]
    });
    
    return lastWallet ? lastWallet.address_index + 1 : 0;
  }
  
  async generateEncryptionKey() {
    // Generate encryption key ID
    return crypto.randomBytes(16).toString('hex');
  }
  
  calculateRiskScore(walletType) {
    const riskScores = {
      hot: 3,
      warm: 2,
      cold: 1
    };
    
    return riskScores[walletType] || 3;
  }
  
  getCurrencyType(currency) {
    const fiatCurrencies = ['usd', 'eur', 'gbp', 'jpy', 'cny'];
    return fiatCurrencies.includes(currency.toLowerCase()) ? 'fiat' : 'crypto';
  }
  
  generateTransactionId() {
    return 'tx_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex');
  }
  
  async initializeBlockchainConnections() {
    // Initialize blockchain connections
    console.log('Initializing blockchain connections...');
  }
  
  startBackgroundTasks() {
    // Start background tasks like balance updates, consolidation, etc.
    setInterval(() => {
      this.performMaintenanceTasks();
    }, 300000); // Every 5 minutes
  }
  
  async performMaintenanceTasks() {
    try {
      // Update balances
      await this.updateAllBalances();
      
      // Perform auto-consolidation
      await this.performAutoConsolidation();
      
      // Clean up cache
      this.cleanupCache();
      
    } catch (error) {
      console.error('Error performing maintenance tasks:', error);
    }
  }
  
  async updateAllBalances() {
    // Update all wallet balances from blockchain
    console.log('Updating wallet balances...');
  }
  
  async performAutoConsolidation() {
    // Perform automatic consolidation for hot wallets
    console.log('Performing auto-consolidation...');
  }
  
  cleanupCache() {
    // Clean up old cache entries
    const maxCacheSize = 1000;
    
    if (this.cache.wallets.size > maxCacheSize) {
      const entries = Array.from(this.cache.wallets.entries());
      const toDelete = entries.slice(0, entries.length - maxCacheSize);
      
      for (const [key] of toDelete) {
        this.cache.wallets.delete(key);
      }
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear caches
    this.cache.wallets.clear();
    this.cache.addresses.clear();
    this.cache.balances.clear();
    
    console.log('Wallet service cleaned up');
  }
}

// Create singleton instance
const walletService = new WalletService();

module.exports = walletService;