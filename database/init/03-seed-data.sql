-- CEX Database Seed Data
-- Initial data for development and testing

\c cex_db;

-- Insert cryptocurrencies (removed sample data)
-- Add your own cryptocurrency data here if needed

-- Insert trading pairs (removed sample data)
-- Add your own trading pairs here if needed

-- Insert admin user
INSERT INTO users (email, username, password, first_name, last_name, role, status, kyc_level, email_verified, referral_code)
VALUES (
    'admin@cexexchange.com',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', -- password: admin123
    'Admin',
    'User',
    'admin',
    'active',
    3,
    TRUE,
    'ADMIN001'
);

-- Insert test users
INSERT INTO users (email, username, password, first_name, last_name, role, status, kyc_level, email_verified, referral_code)
VALUES 
(
    'trader1@example.com',
    'trader1',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', -- password: trader123
    'John',
    'Trader',
    'user',
    'active',
    2,
    TRUE,
    'TRADER001'
),
(
    'trader2@example.com',
    'trader2',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', -- password: trader123
    'Jane',
    'Smith',
    'user',
    'active',
    3,
    TRUE,
    'TRADER002'
),
(
    'support@cexexchange.com',
    'support',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', -- password: support123
    'Support',
    'Team',
    'support',
    'active',
    1,
    TRUE,
    'SUPPORT001'
),
(
    'compliance@cexexchange.com',
    'compliance',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', -- password: compliance123
    'Compliance',
    'Officer',
    'moderator',
    'active',
    2,
    TRUE,
    'COMPLIANCE001'
);

-- Insert initial balances for test users (removed sample data)
-- Add your own user balances here if needed

-- Insert system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('exchange_name', 'CEX Exchange', 'Name of the exchange', TRUE),
('exchange_version', '1.0.0', 'Current version of the exchange', TRUE),
('maintenance_mode', 'false', 'Whether the exchange is in maintenance mode', FALSE),
('trading_enabled', 'true', 'Whether trading is enabled', TRUE),
('deposits_enabled', 'true', 'Whether deposits are enabled', TRUE),
('withdrawals_enabled', 'true', 'Whether withdrawals are enabled', TRUE),
('kyc_required', 'true', 'Whether KYC verification is required', TRUE),
('max_daily_withdrawal_unverified', '1000', 'Maximum daily withdrawal for unverified users', FALSE),
('max_daily_withdrawal_level1', '10000', 'Maximum daily withdrawal for Level 1 verified users', FALSE),
('max_daily_withdrawal_level2', '100000', 'Maximum daily withdrawal for Level 2 verified users', FALSE),
('max_daily_withdrawal_level3', '1000000', 'Maximum daily withdrawal for Level 3 verified users', FALSE),
('default_maker_fee', '0.001', 'Default maker fee percentage', TRUE),
('default_taker_fee', '0.002', 'Default taker fee percentage', TRUE),
('min_password_length', '8', 'Minimum password length', TRUE),
('session_timeout', '86400', 'Session timeout in seconds (24 hours)', FALSE),
('max_login_attempts', '5', 'Maximum failed login attempts before lockout', FALSE),
('lockout_duration', '1800', 'Account lockout duration in seconds (30 minutes)', FALSE),
('email_verification_required', 'true', 'Whether email verification is required', TRUE),
('two_factor_required', 'false', 'Whether 2FA is required for all users', TRUE),
('api_rate_limit', '100', 'API rate limit per minute', FALSE),
('websocket_max_connections', '10000', 'Maximum WebSocket connections', FALSE);

-- Insert sample deposit addresses for test users (removed sample data)
-- Add your own user addresses here if needed

-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, message, data)
SELECT 
    u.id as user_id,
    'IN_APP' as type,
    'Welcome to CEX Exchange!' as title,
    'Thank you for joining CEX Exchange. Start trading now!' as message,
    '{"action": "welcome", "redirect": "/trading"}' as data
FROM users u
WHERE u.username IN ('trader1', 'trader2');

-- Insert audit log for user creation
INSERT INTO audit_logs (event_id, event_type, category, action, description, user_id, actor_type, resource_type, resource_id, new_values, ip_address)
SELECT 
    'USER_INIT_' || u.id::text as event_id,
    'user_action' as event_type,
    'user_management' as category,
    'USER_CREATED' as action,
    'Initial user account created during database setup' as description,
    u.id as user_id,
    'system' as actor_type,
    'user' as resource_type,
    u.id::text as resource_id,
    jsonb_build_object(
        'email', u.email,
        'username', u.username,
        'role', u.role,
        'status', u.status
    ) as new_values,
    '127.0.0.1'::inet as ip_address
FROM users u;

-- Create views for common queries (removed sample views)
-- Add your own database views here if needed

COMMIT;

-- Display summary
SELECT 'Database seeded successfully!' as message;
SELECT COUNT(*) as total_users FROM users;