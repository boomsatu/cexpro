-- Update transactions table with missing columns
-- This script adds all missing columns to existing transactions table

\c cex_db;

-- Add missing columns to transactions table
ALTER TABLE transactions 
    ADD COLUMN IF NOT EXISTS tx_id VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS external_tx_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS wallet_id UUID,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
    ADD COLUMN IF NOT EXISTS currency_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS block_height BIGINT,
    ADD COLUMN IF NOT EXISTS gas_price DECIMAL(36,18),
    ADD COLUMN IF NOT EXISTS gas_used DECIMAL(36,18),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payment_processor VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
    ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS aml_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS compliance_notes TEXT,
    ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS processing_notes TEXT,
    ADD COLUMN IF NOT EXISTS error_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS tags VARCHAR(255)[];

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transactions_tx_id ON transactions(tx_id) WHERE tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_external_tx_id ON transactions(external_tx_id) WHERE external_tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_processed_by ON transactions(processed_by) WHERE processed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_aml_status ON transactions(aml_status) WHERE aml_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_risk_score ON transactions(risk_score) WHERE risk_score IS NOT NULL;

-- Update existing currency_id references to use new currency column structure
-- Note: This is a data migration that should be handled carefully in production
COMMENT ON TABLE transactions IS 'Updated with enhanced transaction tracking fields for compliance and blockchain integration';