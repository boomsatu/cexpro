-- Create wallets table for cryptocurrency wallet management
-- Supports hot, warm, cold, and multisig wallet architecture

BEGIN;

-- wallet_type enum already defined in 01-create-databases.sql
-- Available values: 'HOT', 'WARM', 'COLD'

-- Create wallet_status enum
CREATE TYPE wallet_status AS ENUM ('active', 'inactive', 'frozen', 'compromised', 'deprecated');

-- Create backup_status enum
CREATE TYPE backup_status AS ENUM ('none', 'partial', 'complete');

-- Create wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Wallet identification
    wallet_type wallet_type NOT NULL,
    currency VARCHAR(10) NOT NULL,
    network VARCHAR(20) NOT NULL,
    
    -- Address information
    address VARCHAR(255) NOT NULL UNIQUE,
    public_key TEXT,
    
    -- HD Wallet information
    derivation_path VARCHAR(100),
    address_index INTEGER,
    parent_wallet_id UUID REFERENCES wallets(id),
    
    -- Multi-signature configuration
    multisig_config JSONB,
    required_signatures INTEGER,
    total_signers INTEGER,
    
    -- Wallet status
    status wallet_status DEFAULT 'active' NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Balance tracking
    balance DECIMAL(20,8) DEFAULT 0 NOT NULL CHECK (balance >= 0),
    pending_balance DECIMAL(20,8) DEFAULT 0 NOT NULL,
    last_balance_update TIMESTAMP WITH TIME ZONE,
    
    -- Transaction tracking
    last_transaction_hash VARCHAR(255),
    last_block_height BIGINT,
    transaction_count INTEGER DEFAULT 0,
    
    -- Security features
    encryption_key_id VARCHAR(255),
    backup_status backup_status DEFAULT 'none',
    backup_locations JSONB,
    
    -- Compliance and monitoring
    risk_score DECIMAL(3,2) DEFAULT 0.00,
    monitoring_enabled BOOLEAN DEFAULT TRUE,
    alert_thresholds JSONB,
    
    -- Operational limits
    daily_withdrawal_limit DECIMAL(20,8),
    daily_withdrawal_used DECIMAL(20,8) DEFAULT 0,
    last_withdrawal_reset TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[],
    metadata JSONB,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE UNIQUE INDEX idx_wallets_address ON wallets(address);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);
CREATE INDEX idx_wallets_network ON wallets(network);
CREATE INDEX idx_wallets_wallet_type ON wallets(wallet_type);
CREATE INDEX idx_wallets_status ON wallets(status);
CREATE INDEX idx_wallets_is_primary ON wallets(is_primary);
CREATE INDEX idx_wallets_parent_wallet_id ON wallets(parent_wallet_id);
CREATE INDEX idx_wallets_last_balance_update ON wallets(last_balance_update);

-- Create unique constraint for primary wallets per user per currency
CREATE UNIQUE INDEX idx_wallets_user_currency_primary 
ON wallets(user_id, currency) 
WHERE is_primary = TRUE;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_wallets_updated_at();

-- Add comments for documentation
COMMENT ON TABLE wallets IS 'Cryptocurrency wallet management table supporting hot, warm, cold, and multisig architectures';
COMMENT ON COLUMN wallets.user_id IS 'User who owns this wallet';
COMMENT ON COLUMN wallets.wallet_type IS 'Type of wallet for security classification';
COMMENT ON COLUMN wallets.currency IS 'Cryptocurrency symbol (e.g., BTC, ETH, USDT)';
COMMENT ON COLUMN wallets.network IS 'Blockchain network (e.g., mainnet, testnet, polygon)';
COMMENT ON COLUMN wallets.address IS 'Wallet address';
COMMENT ON COLUMN wallets.public_key IS 'Public key (if applicable)';
COMMENT ON COLUMN wallets.derivation_path IS 'HD wallet derivation path (e.g., m/44/0/0/0/0)';
COMMENT ON COLUMN wallets.address_index IS 'Address index in HD wallet';
COMMENT ON COLUMN wallets.parent_wallet_id IS 'Parent wallet for HD wallet hierarchy';
COMMENT ON COLUMN wallets.multisig_config IS 'Multi-signature configuration (m-of-n, signers, etc.)';
COMMENT ON COLUMN wallets.required_signatures IS 'Required signatures for multisig wallet';
COMMENT ON COLUMN wallets.total_signers IS 'Total number of signers for multisig wallet';
COMMENT ON COLUMN wallets.status IS 'Wallet status';
COMMENT ON COLUMN wallets.is_primary IS 'Whether this is the primary wallet for the currency';
COMMENT ON COLUMN wallets.balance IS 'Current wallet balance';
COMMENT ON COLUMN wallets.pending_balance IS 'Pending balance (unconfirmed transactions)';
COMMENT ON COLUMN wallets.last_balance_update IS 'Last balance update timestamp';
COMMENT ON COLUMN wallets.last_transaction_hash IS 'Last transaction hash';
COMMENT ON COLUMN wallets.last_block_height IS 'Last processed block height';
COMMENT ON COLUMN wallets.transaction_count IS 'Total number of transactions';
COMMENT ON COLUMN wallets.encryption_key_id IS 'Reference to encryption key for private key storage';
COMMENT ON COLUMN wallets.backup_status IS 'Backup status of wallet';
COMMENT ON COLUMN wallets.backup_locations IS 'Backup storage locations';
COMMENT ON COLUMN wallets.risk_score IS 'Risk score for compliance monitoring';
COMMENT ON COLUMN wallets.monitoring_enabled IS 'Whether monitoring is enabled for this wallet';
COMMENT ON COLUMN wallets.alert_thresholds IS 'Alert thresholds for various metrics';
COMMENT ON COLUMN wallets.daily_withdrawal_limit IS 'Daily withdrawal limit';
COMMENT ON COLUMN wallets.daily_withdrawal_used IS 'Daily withdrawal amount used';
COMMENT ON COLUMN wallets.last_withdrawal_reset IS 'Last daily withdrawal limit reset';
COMMENT ON COLUMN wallets.tags IS 'Wallet tags for organization';
COMMENT ON COLUMN wallets.metadata IS 'Additional wallet metadata';
COMMENT ON COLUMN wallets.notes IS 'Internal notes about the wallet';
COMMENT ON COLUMN wallets.last_used_at IS 'Last time wallet was used for transaction';

COMMIT;