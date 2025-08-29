-- CEX Main Database Schema
-- Core tables for the cryptocurrency exchange

\c cex_db;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic information
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255) NOT NULL, -- renamed from password_hash for Sequelize compatibility
    first_name VARCHAR(100), -- mapped to firstName in model
    last_name VARCHAR(100), -- mapped to lastName in model
    phone_number VARCHAR(20), -- mapped to phoneNumber in model
    date_of_birth DATE, -- mapped to dateOfBirth in model
    country VARCHAR(2), -- country code
    
    -- Account settings
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'support')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'banned')),
    
    -- Verification status
    email_verified BOOLEAN DEFAULT FALSE, -- mapped to emailVerified in model
    phone_verified BOOLEAN DEFAULT FALSE, -- mapped to phoneVerified in model
    kyc_level INTEGER DEFAULT 0 CHECK (kyc_level >= 0 AND kyc_level <= 3), -- mapped to kycLevel in model
    
    -- Two-factor authentication
    two_factor_enabled BOOLEAN DEFAULT FALSE, -- mapped to twoFactorEnabled in model
    two_factor_secret VARCHAR(255), -- mapped to twoFactorSecret in model
    backup_codes JSONB, -- mapped to backupCodes in model
    
    -- Login tracking
    last_login_at TIMESTAMP WITH TIME ZONE, -- mapped to lastLoginAt in model
    last_login_ip INET, -- mapped to lastLoginIp in model
    login_attempts INTEGER DEFAULT 0, -- mapped to loginAttempts in model
    lock_until TIMESTAMP WITH TIME ZONE, -- mapped to lockUntil in model
    
    -- Password reset
    password_reset_token VARCHAR(255), -- mapped to passwordResetToken in model
    password_reset_expires TIMESTAMP WITH TIME ZONE, -- mapped to passwordResetExpires in model
    
    -- Email verification
    email_verification_token VARCHAR(255), -- mapped to emailVerificationToken in model
    email_verification_expires TIMESTAMP WITH TIME ZONE, -- mapped to emailVerificationExpires in model
    
    -- User preferences
    preferences JSONB DEFAULT '{
        "language": "en",
        "timezone": "UTC",
        "currency": "USD",
        "notifications": {
            "email": true,
            "sms": false,
            "push": true,
            "trading": true,
            "security": true,
            "marketing": false
        }
    }',
    metadata JSONB DEFAULT '{}',
    
    -- Enhanced trading fields
    trading_level VARCHAR(20) DEFAULT 'beginner' CHECK (trading_level IN ('beginner', 'intermediate', 'advanced', 'professional')), -- mapped to tradingLevel in model
    risk_tolerance VARCHAR(10) DEFAULT 'medium' CHECK (risk_tolerance IN ('low', 'medium', 'high')), -- mapped to riskTolerance in model
    max_daily_trading_volume DECIMAL(20,8), -- mapped to maxDailyTradingVolume in model
    max_position_size DECIMAL(20,8), -- mapped to maxPositionSize in model
    margin_trading_enabled BOOLEAN DEFAULT FALSE, -- mapped to marginTradingEnabled in model
    api_trading_enabled BOOLEAN DEFAULT FALSE, -- mapped to apiTradingEnabled in model
    
    -- Referral system
    referral_code VARCHAR(20) UNIQUE, -- mapped to referralCode in model
    referred_by UUID REFERENCES users(id), -- mapped to referredBy in model
    
    -- Trading statistics
    total_trading_volume DECIMAL(30,8) DEFAULT 0, -- mapped to totalTradingVolume in model
    total_trades INTEGER DEFAULT 0, -- mapped to totalTrades in model
    last_trade_at TIMESTAMP WITH TIME ZONE, -- mapped to lastTradeAt in model
    
    -- VIP and fee structure
    vip_level INTEGER DEFAULT 0 CHECK (vip_level >= 0 AND vip_level <= 10), -- mapped to vipLevel in model
    maker_fee_rate DECIMAL(5,4) DEFAULT 0.001, -- mapped to makerFeeRate in model
    taker_fee_rate DECIMAL(5,4) DEFAULT 0.001, -- mapped to takerFeeRate in model
    
    -- Legacy fields for backward compatibility
    country_code VARCHAR(3),
    phone VARCHAR(20),
    kyc_status kyc_status DEFAULT 'UNVERIFIED',
    google_id VARCHAR(255),
    apple_id VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- for soft delete (paranoid)
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cryptocurrencies table
CREATE TABLE cryptocurrencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255),
    decimals INTEGER DEFAULT 8,
    contract_address VARCHAR(255),
    blockchain VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    is_fiat BOOLEAN DEFAULT FALSE,
    min_deposit DECIMAL(36,18) DEFAULT 0,
    min_withdrawal DECIMAL(36,18) DEFAULT 0,
    withdrawal_fee DECIMAL(36,18) DEFAULT 0,
    confirmation_blocks INTEGER DEFAULT 6,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    explorer_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading pairs table
CREATE TABLE trading_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
    quote_currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
    symbol VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'BTCUSDT'
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Trading limits
    min_order_size DECIMAL(36,18) DEFAULT 0.000000000000000001,
    max_order_size DECIMAL(36,18),
    
    -- Price and quantity precision
    price_precision INTEGER DEFAULT 8,
    quantity_precision INTEGER DEFAULT 8,
    
    -- Fee structure
    maker_fee DECIMAL(10,6) DEFAULT 0.001,
    taker_fee DECIMAL(10,6) DEFAULT 0.002,
    
    -- Enhanced trading parameters
    tick_size DECIMAL(36,18) DEFAULT 0.000000000000000001,
    lot_size DECIMAL(36,18) DEFAULT 0.000000000000000001,
    price_filter_min DECIMAL(36,18),
    price_filter_max DECIMAL(36,18),
    min_notional DECIMAL(36,18) DEFAULT 10,
    max_notional DECIMAL(36,18),
    
    -- Market status and configuration
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'delisted')),
    trading_enabled BOOLEAN DEFAULT TRUE,
    margin_trading_enabled BOOLEAN DEFAULT FALSE,
    
    -- Market statistics
    volume_24h DECIMAL(36,18) DEFAULT 0,
    quote_volume_24h DECIMAL(36,18) DEFAULT 0,
    high_24h DECIMAL(36,18),
    low_24h DECIMAL(36,18),
    last_price DECIMAL(36,18),
    price_change_24h DECIMAL(36,18) DEFAULT 0,
    price_change_percent_24h DECIMAL(10,6) DEFAULT 0,
    trades_count_24h INTEGER DEFAULT 0,
    
    -- Liquidity and market making
    market_maker_program BOOLEAN DEFAULT FALSE,
    liquidity_score DECIMAL(5,2) DEFAULT 0 CHECK (liquidity_score >= 0 AND liquidity_score <= 100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(base_currency_id, quote_currency_id)
);

-- User balances table
CREATE TABLE user_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
    available_balance DECIMAL(36,18) DEFAULT 0,
    locked_balance DECIMAL(36,18) DEFAULT 0,
    total_balance DECIMAL(36,18) GENERATED ALWAYS AS (available_balance + locked_balance) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency_id)
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    order_type order_type NOT NULL,
    side order_side NOT NULL,
    status order_status DEFAULT 'NEW',
    time_in_force time_in_force DEFAULT 'GTC',
    quantity DECIMAL(36,18) NOT NULL,
    price DECIMAL(36,18),
    stop_price DECIMAL(36,18),
    filled_quantity DECIMAL(36,18) DEFAULT 0,
    remaining_quantity DECIMAL(36,18) GENERATED ALWAYS AS (quantity - filled_quantity) STORED,
    average_price DECIMAL(36,18) DEFAULT 0,
    total_fee DECIMAL(36,18) DEFAULT 0,
    client_order_id VARCHAR(50),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Trades table
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    buyer_order_id UUID NOT NULL REFERENCES orders(id),
    seller_order_id UUID NOT NULL REFERENCES orders(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    price DECIMAL(36,18) NOT NULL,
    quantity DECIMAL(36,18) NOT NULL,
    total_amount DECIMAL(36,18) GENERATED ALWAYS AS (price * quantity) STORED,
    buyer_fee DECIMAL(36,18) DEFAULT 0,
    seller_fee DECIMAL(36,18) DEFAULT 0,
    trade_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trade_type VARCHAR(20) DEFAULT 'spot' CHECK (trade_type IN ('spot', 'margin', 'futures', 'options')),
    liquidity_type VARCHAR(10) NOT NULL CHECK (liquidity_type IN ('maker', 'taker')),
    buyer_commission DECIMAL(36,18) DEFAULT 0,
    seller_commission DECIMAL(36,18) DEFAULT 0,
    buyer_commission_asset VARCHAR(10),
    seller_commission_asset VARCHAR(10),
    is_buyer_maker BOOLEAN NOT NULL,
    trade_sequence BIGINT NOT NULL,
    settlement_status VARCHAR(20) DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled', 'failed')),
    settlement_time TIMESTAMP WITH TIME ZONE,
    market_price DECIMAL(36,18),
    price_deviation DECIMAL(10,6)
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_id VARCHAR(100) UNIQUE,
    external_tx_id VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID,
    type transaction_type NOT NULL,
    currency VARCHAR(10),
    currency_type VARCHAR(20),
    status transaction_status DEFAULT 'PENDING',
    amount DECIMAL(36,18) NOT NULL,
    fee DECIMAL(36,18) DEFAULT 0,
    net_amount DECIMAL(36,18) GENERATED ALWAYS AS (amount - fee) STORED,
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    tx_hash VARCHAR(255),
    block_number BIGINT,
    block_height BIGINT,
    confirmations INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 6,
    gas_price DECIMAL(36,18),
    gas_used DECIMAL(36,18),
    payment_method VARCHAR(50),
    payment_processor VARCHAR(50),
    payment_reference VARCHAR(255),
    risk_score DECIMAL(5,2),
    aml_status VARCHAR(20),
    compliance_notes TEXT,
    processed_by UUID REFERENCES users(id),
    processing_notes TEXT,
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    tags VARCHAR(255)[],
    reference_id VARCHAR(100),
    notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deposits table
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
    transaction_id UUID REFERENCES transactions(id),
    amount DECIMAL(36,18) NOT NULL,
    fee DECIMAL(36,18) DEFAULT 0,
    status transaction_status DEFAULT 'PENDING',
    from_address VARCHAR(255),
    to_address VARCHAR(255) NOT NULL,
    tx_hash VARCHAR(255),
    block_number BIGINT,
    confirmations INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 6,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
    transaction_id UUID REFERENCES transactions(id),
    amount DECIMAL(36,18) NOT NULL,
    fee DECIMAL(36,18) NOT NULL,
    net_amount DECIMAL(36,18) GENERATED ALWAYS AS (amount - fee) STORED,
    status transaction_status DEFAULT 'PENDING',
    from_address VARCHAR(255),
    to_address VARCHAR(255) NOT NULL,
    tx_hash VARCHAR(255),
    block_number BIGINT,
    two_factor_verified BOOLEAN DEFAULT FALSE,
    admin_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User addresses table (for deposits)
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
    address VARCHAR(255) NOT NULL,
    tag VARCHAR(100), -- for currencies that require memo/tag
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency_id, address)
);

-- KYC documents table
CREATE TABLE kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    document_type VARCHAR(50) NOT NULL, -- 'passport', 'id_card', 'driver_license', 'utility_bill'
    document_number VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64),
    status kyc_status DEFAULT 'PENDING',
    rejection_reason TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'user_action', 'system_event', 'security_event', 'admin_action', 'api_call',
        'database_change', 'authentication', 'authorization', 'trading_activity',
        'wallet_operation', 'compliance_event', 'error_event', 'configuration_change',
        'backup_operation', 'maintenance_event'
    )),
    category VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    
    -- Actor information
    user_id UUID REFERENCES users(id),
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'system', 'admin', 'api', 'service', 'cron', 'external')),
    actor_identifier VARCHAR(255),
    
    -- Target information
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    target_identifier VARCHAR(255),
    
    -- Event details
    description TEXT NOT NULL,
    details JSONB,
    
    -- Request information
    request_id VARCHAR(100),
    session_id VARCHAR(100),
    correlation_id VARCHAR(100),
    
    -- Network information
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Geographic information
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),
    
    -- Status and outcome
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'error', 'warning', 'info', 'pending')),
    result VARCHAR(20) CHECK (result IN ('allowed', 'denied', 'blocked', 'flagged', 'completed', 'failed')),
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Security and risk
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    security_flags TEXT[],
    is_suspicious BOOLEAN DEFAULT FALSE,
    requires_review BOOLEAN DEFAULT FALSE,
    
    -- Data changes (legacy compatibility)
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    before_data JSONB,
    after_data JSONB,
    changed_fields TEXT[],
    
    -- Performance metrics
    duration_ms INTEGER,
    response_size INTEGER,
    
    -- Compliance and retention
    retention_period INTEGER DEFAULT 2555,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_pii_data BOOLEAN DEFAULT FALSE,
    compliance_tags TEXT[],
    
    -- Review and investigation
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    investigation_status VARCHAR(20) DEFAULT 'none' CHECK (investigation_status IN ('none', 'pending', 'in_progress', 'completed', 'closed')),
    
    -- Additional metadata
    source_system VARCHAR(50),
    source_version VARCHAR(20),
    environment VARCHAR(20) DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development', 'testing')),
    tags TEXT[],
    metadata JSONB,
    
    -- Timestamps
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_cryptocurrencies_symbol ON cryptocurrencies(symbol);
CREATE INDEX idx_cryptocurrencies_is_active ON cryptocurrencies(is_active);

CREATE INDEX idx_trading_pairs_symbol ON trading_pairs(symbol);
CREATE INDEX idx_trading_pairs_is_active ON trading_pairs(is_active);
CREATE INDEX idx_trading_pairs_base_currency ON trading_pairs(base_currency_id);
CREATE INDEX idx_trading_pairs_quote_currency ON trading_pairs(quote_currency_id);

CREATE INDEX idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX idx_user_balances_currency_id ON user_balances(currency_id);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_trading_pair_id ON orders(trading_pair_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_side_status ON orders(side, status);

CREATE INDEX idx_trades_trading_pair_id ON trades(trading_pair_id);
CREATE INDEX idx_trades_buyer_id ON trades(buyer_id);
CREATE INDEX idx_trades_seller_id ON trades(seller_id);
CREATE INDEX idx_trades_trade_time ON trades(trade_time);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_currency ON transactions(currency);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);

CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_currency_id ON deposits(currency_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_deposits_tx_hash ON deposits(tx_hash);
CREATE INDEX idx_deposits_to_address ON deposits(to_address);

CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_currency_id ON withdrawals(currency_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_tx_hash ON withdrawals(tx_hash);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_currency_id ON user_addresses(currency_id);
CREATE INDEX idx_user_addresses_address ON user_addresses(address);

CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

COMMIT;