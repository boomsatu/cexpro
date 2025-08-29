-- Database Indexes for Performance Optimization
-- Adds comprehensive indexes for better query performance

\c cex_db;

-- Enhanced indexes for existing tables

-- Trading pairs enhanced indexes
CREATE INDEX IF NOT EXISTS idx_trading_pairs_status_active ON trading_pairs(trading_status, is_active);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_leverage ON trading_pairs(max_leverage);

-- Orders enhanced indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_status_side ON orders(user_id, status, side);
CREATE INDEX IF NOT EXISTS idx_orders_trading_pair_status ON orders(trading_pair_id, status) WHERE status IN ('NEW', 'PARTIALLY_FILLED');
CREATE INDEX IF NOT EXISTS idx_orders_price_side ON orders(price, side) WHERE status IN ('NEW', 'PARTIALLY_FILLED');
CREATE INDEX IF NOT EXISTS idx_orders_created_status ON orders(created_at, status);
CREATE INDEX IF NOT EXISTS idx_orders_order_source ON orders(order_source);
CREATE INDEX IF NOT EXISTS idx_orders_leverage ON orders(leverage) WHERE leverage > 1;
CREATE INDEX IF NOT EXISTS idx_orders_client_order_id ON orders(client_order_id) WHERE client_order_id IS NOT NULL;

-- Trades enhanced indexes
CREATE INDEX IF NOT EXISTS idx_trades_pair_time_desc ON trades(trading_pair_id, trade_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_buyer_time ON trades(buyer_id, trade_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_seller_time ON trades(seller_id, trade_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_price_time ON trades(price, trade_time);
CREATE INDEX IF NOT EXISTS idx_trades_trade_type ON trades(trade_type);
CREATE INDEX IF NOT EXISTS idx_trades_liquidity_type ON trades(liquidity_type);
CREATE INDEX IF NOT EXISTS idx_trades_group_id ON trades(trade_group_id) WHERE trade_group_id IS NOT NULL;

-- Users enhanced indexes
CREATE INDEX IF NOT EXISTS idx_users_trading_level ON users(trading_level);
CREATE INDEX IF NOT EXISTS idx_users_api_enabled ON users(api_trading_enabled) WHERE api_trading_enabled = true;
CREATE INDEX IF NOT EXISTS idx_users_margin_enabled ON users(margin_trading_enabled) WHERE margin_trading_enabled = true;
CREATE INDEX IF NOT EXISTS idx_users_vip_level ON users(vip_level) WHERE vip_level > 0;
CREATE INDEX IF NOT EXISTS idx_users_kyc_status_level ON users(kyc_status, kyc_level);

-- User balances enhanced indexes
CREATE INDEX IF NOT EXISTS idx_user_balances_available ON user_balances(user_id, available_balance) WHERE available_balance > 0;
CREATE INDEX IF NOT EXISTS idx_user_balances_margin ON user_balances(user_id, margin_balance) WHERE margin_balance > 0;
CREATE INDEX IF NOT EXISTS idx_user_balances_total ON user_balances(user_id, total_balance) WHERE total_balance > 0;

-- Transactions enhanced indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_status ON transactions(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_id ON transactions(tx_id) WHERE tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_external_tx_id ON transactions(external_tx_id) WHERE external_tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_currency_status ON transactions(currency, status);
CREATE INDEX IF NOT EXISTS idx_transactions_amount_desc ON transactions(amount DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_processed_by ON transactions(processed_by) WHERE processed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_aml_status ON transactions(aml_status) WHERE aml_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_risk_score ON transactions(risk_score) WHERE risk_score IS NOT NULL;

-- New tables indexes

-- Market data indexes
CREATE INDEX IF NOT EXISTS idx_market_data_pair_timeframe_time ON market_data(trading_pair_id, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_volume ON market_data(volume DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_timeframe ON market_data(timeframe);

-- Order book snapshots indexes
CREATE INDEX IF NOT EXISTS idx_order_book_pair_time ON order_book_snapshots(trading_pair_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_book_sequence ON order_book_snapshots(sequence_number DESC);

-- Risk limits indexes
CREATE INDEX IF NOT EXISTS idx_risk_limits_user_active ON risk_limits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_risk_limits_pair_active ON risk_limits(trading_pair_id, is_active) WHERE trading_pair_id IS NOT NULL;

-- Fee structures indexes
CREATE INDEX IF NOT EXISTS idx_fee_structures_user_active ON fee_structures(user_id, is_active) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fee_structures_pair_active ON fee_structures(trading_pair_id, is_active) WHERE trading_pair_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fee_structures_volume_tier ON fee_structures(volume_tier, is_active);
CREATE INDEX IF NOT EXISTS idx_fee_structures_effective ON fee_structures(effective_from, effective_until);

-- IP whitelist indexes
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_user_active ON ip_whitelist(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_ip ON ip_whitelist(ip_address);

-- Suspicious activity indexes
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user ON suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_type_status ON suspicious_activity(activity_type, status);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_risk_score ON suspicious_activity(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_created ON suspicious_activity(created_at DESC);

-- Compliance reports indexes
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type_status ON compliance_reports(report_type, status);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_user ON compliance_reports(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_reports_transaction ON compliance_reports(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_reports_created ON compliance_reports(created_at DESC);

-- Cold storage tracking indexes
CREATE INDEX IF NOT EXISTS idx_cold_storage_currency_active ON cold_storage_tracking(currency_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cold_storage_wallet_type ON cold_storage_tracking(wallet_type, is_active);
CREATE INDEX IF NOT EXISTS idx_cold_storage_balance ON cold_storage_tracking(balance DESC) WHERE balance > 0;

-- Trading pair stats indexes
CREATE INDEX IF NOT EXISTS idx_trading_pair_stats_pair_date ON trading_pair_stats(trading_pair_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_trading_pair_stats_volume ON trading_pair_stats(volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_trading_pair_stats_change ON trading_pair_stats(price_change_percent_24h DESC);

-- User trading stats indexes
CREATE INDEX IF NOT EXISTS idx_user_trading_stats_user_date ON user_trading_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_trading_stats_pair_date ON user_trading_stats(trading_pair_id, date DESC) WHERE trading_pair_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_trading_stats_volume ON user_trading_stats(total_volume DESC);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_active ON api_keys(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Partial indexes for better performance on specific queries
CREATE INDEX IF NOT EXISTS idx_orders_active_by_price ON orders(trading_pair_id, side, price, created_at) 
    WHERE status IN ('NEW', 'PARTIALLY_FILLED');

-- Removed idx_trades_recent_by_pair due to NOW() function not being IMMUTABLE
-- CREATE INDEX IF NOT EXISTS idx_trades_recent_by_pair ON trades(trading_pair_id, trade_time DESC, price, quantity) 
--     WHERE trade_time > NOW() - INTERVAL '24 hours';

CREATE INDEX IF NOT EXISTS idx_user_balances_non_zero ON user_balances(user_id, currency_id, available_balance) 
    WHERE available_balance > 0;

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_orders_matching ON orders(trading_pair_id, side, status, price, created_at) 
    WHERE status IN ('NEW', 'PARTIALLY_FILLED');

CREATE INDEX IF NOT EXISTS idx_trades_user_pair_time ON trades(buyer_id, seller_id, trading_pair_id, trade_time DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_currency_time ON transactions(user_id, currency, created_at DESC, status);

COMMIT;