-- New Tables for Enhanced Trading System
-- Creates additional tables for advanced trading features

\c cex_db;

-- Market Data (OHLCV) table
CREATE TABLE market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    timeframe VARCHAR(10) NOT NULL, -- 1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M
    open_price DECIMAL(36,18) NOT NULL,
    high_price DECIMAL(36,18) NOT NULL,
    low_price DECIMAL(36,18) NOT NULL,
    close_price DECIMAL(36,18) NOT NULL,
    volume DECIMAL(36,18) NOT NULL DEFAULT 0,
    quote_volume DECIMAL(36,18) NOT NULL DEFAULT 0,
    trades_count INTEGER DEFAULT 0,
    taker_buy_volume DECIMAL(36,18) DEFAULT 0,
    taker_buy_quote_volume DECIMAL(36,18) DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trading_pair_id, timeframe, timestamp)
);

-- Order Book Snapshots table
CREATE TABLE order_book_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    bids JSONB NOT NULL, -- Array of [price, quantity]
    asks JSONB NOT NULL, -- Array of [price, quantity]
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    sequence_number BIGINT NOT NULL,
    checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Limits table
CREATE TABLE risk_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    trading_pair_id UUID REFERENCES trading_pairs(id),
    max_position_size DECIMAL(36,18),
    max_order_size DECIMAL(36,18),
    max_open_orders INTEGER DEFAULT 100,
    daily_loss_limit DECIMAL(36,18),
    daily_volume_limit DECIMAL(36,18),
    max_leverage INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee Structures table
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    trading_pair_id UUID REFERENCES trading_pairs(id),
    volume_tier VARCHAR(20),
    maker_fee DECIMAL(10,6) NOT NULL,
    taker_fee DECIMAL(10,6) NOT NULL,
    min_volume DECIMAL(36,18) DEFAULT 0,
    max_volume DECIMAL(36,18),
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IP Whitelist table
CREATE TABLE ip_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    ip_address INET NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, ip_address)
);

-- Suspicious Activity table
CREATE TABLE suspicious_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    risk_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    investigated_by UUID REFERENCES users(id),
    investigated_at TIMESTAMP WITH TIME ZONE,
    resolution TEXT,
    ip_address INET,
    user_agent TEXT,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Reports table
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    transaction_id UUID REFERENCES transactions(id),
    report_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    submitted_to VARCHAR(100),
    submitted_at TIMESTAMP WITH TIME ZONE,
    response_data JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cold Storage Tracking table
CREATE TABLE cold_storage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
    wallet_address VARCHAR(255) NOT NULL,
    wallet_type wallet_type DEFAULT 'COLD',
    balance DECIMAL(36,18) NOT NULL DEFAULT 0,
    last_audit_balance DECIMAL(36,18),
    last_audit_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    security_level INTEGER DEFAULT 5,
    access_requirements JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading Pairs Statistics table
CREATE TABLE trading_pair_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
    date DATE NOT NULL,
    volume_24h DECIMAL(36,18) DEFAULT 0,
    quote_volume_24h DECIMAL(36,18) DEFAULT 0,
    high_24h DECIMAL(36,18),
    low_24h DECIMAL(36,18),
    open_24h DECIMAL(36,18),
    close_24h DECIMAL(36,18),
    price_change_24h DECIMAL(36,18),
    price_change_percent_24h DECIMAL(10,6),
    trades_count_24h INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trading_pair_id, date)
);

-- User Trading Statistics table
CREATE TABLE user_trading_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    trading_pair_id UUID REFERENCES trading_pairs(id),
    date DATE NOT NULL,
    total_volume DECIMAL(36,18) DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    maker_volume DECIMAL(36,18) DEFAULT 0,
    taker_volume DECIMAL(36,18) DEFAULT 0,
    total_fees_paid DECIMAL(36,18) DEFAULT 0,
    pnl DECIMAL(36,18) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, trading_pair_id, date)
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    api_secret_hash VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL, -- {"spot": true, "margin": false, "futures": false}
    ip_restrictions JSONB, -- Array of allowed IPs
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMIT;