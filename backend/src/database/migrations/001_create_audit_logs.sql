-- Migration: Create audit_logs table
-- Description: Create table for storing audit logs and security events
-- Version: 001
-- Created: 2024

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    api_key_id UUID,
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    fingerprint VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_fingerprint ON audit_logs(fingerprint);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_event_time ON audit_logs(user_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level_risk_time ON audit_logs(level, risk_level, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_time ON audit_logs(ip_address, created_at);

-- GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING GIN(metadata);

-- Partial indexes for high-priority events
CREATE INDEX IF NOT EXISTS idx_audit_logs_high_risk ON audit_logs(created_at) 
    WHERE risk_level IN ('high', 'critical');
    
CREATE INDEX IF NOT EXISTS idx_audit_logs_errors ON audit_logs(created_at) 
    WHERE level IN ('error', 'critical');

-- Add constraints
ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_logs_level 
    CHECK (level IN ('info', 'warning', 'error', 'critical'));
    
ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_logs_risk_level 
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_logs_updated_at();

-- Create function for automatic cleanup of old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_logs (event_type, level, description, metadata)
    VALUES (
        'system_maintenance',
        'info',
        'Automatic cleanup of old audit logs',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'retention_days', retention_days,
            'cleanup_time', CURRENT_TIMESTAMP
        )
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    event_type VARCHAR(100),
    level VARCHAR(20),
    risk_level VARCHAR(20),
    event_count BIGINT,
    last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.event_type,
        al.level,
        al.risk_level,
        COUNT(*) as event_count,
        MAX(al.created_at) as last_occurrence
    FROM audit_logs al
    WHERE al.user_id = p_user_id 
        AND al.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days
    GROUP BY al.event_type, al.level, al.risk_level
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect suspicious patterns
CREATE OR REPLACE FUNCTION detect_suspicious_login_pattern(
    p_user_id UUID,
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    pattern_type TEXT,
    severity TEXT,
    event_count BIGINT,
    unique_ips BIGINT,
    description TEXT
) AS $$
BEGIN
    -- Multiple failed login attempts
    RETURN QUERY
    SELECT 
        'multiple_failed_logins'::TEXT as pattern_type,
        CASE 
            WHEN COUNT(*) >= 10 THEN 'critical'
            WHEN COUNT(*) >= 5 THEN 'high'
            ELSE 'medium'
        END::TEXT as severity,
        COUNT(*) as event_count,
        COUNT(DISTINCT ip_address) as unique_ips,
        CONCAT(COUNT(*), ' failed login attempts from ', COUNT(DISTINCT ip_address), ' IP addresses')::TEXT as description
    FROM audit_logs
    WHERE user_id = p_user_id
        AND event_type = 'user_login_failed'
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' * p_hours
    HAVING COUNT(*) >= 3;
    
    -- Multiple IP addresses
    RETURN QUERY
    SELECT 
        'multiple_ip_addresses'::TEXT as pattern_type,
        CASE 
            WHEN COUNT(DISTINCT ip_address) >= 10 THEN 'high'
            WHEN COUNT(DISTINCT ip_address) >= 5 THEN 'medium'
            ELSE 'low'
        END::TEXT as severity,
        COUNT(*) as event_count,
        COUNT(DISTINCT ip_address) as unique_ips,
        CONCAT('Activity from ', COUNT(DISTINCT ip_address), ' different IP addresses')::TEXT as description
    FROM audit_logs
    WHERE user_id = p_user_id
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' * p_hours
        AND ip_address IS NOT NULL
    HAVING COUNT(DISTINCT ip_address) >= 3;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for audit log statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_log_stats AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    event_type,
    level,
    risk_level,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), event_type, level, risk_level;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_log_stats_unique 
    ON audit_log_stats(hour, event_type, level, risk_level);

-- Create function to refresh audit log stats
CREATE OR REPLACE FUNCTION refresh_audit_log_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY audit_log_stats;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Stores all audit logs and security events for the application';
COMMENT ON COLUMN audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action (nullable for system events)';
COMMENT ON COLUMN audit_logs.event_type IS 'Type of event (e.g., user_login, password_change, etc.)';
COMMENT ON COLUMN audit_logs.level IS 'Log level: info, warning, error, critical';
COMMENT ON COLUMN audit_logs.risk_level IS 'Risk assessment: low, medium, high, critical';
COMMENT ON COLUMN audit_logs.description IS 'Human-readable description of the event';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional structured data about the event';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN audit_logs.session_id IS 'Session ID associated with the action';
COMMENT ON COLUMN audit_logs.api_key_id IS 'API key ID if action was performed via API';
COMMENT ON COLUMN audit_logs.admin_user_id IS 'ID of admin user if action was performed by admin';
COMMENT ON COLUMN audit_logs.fingerprint IS 'Hash fingerprint for duplicate detection';
COMMENT ON COLUMN audit_logs.created_at IS 'Timestamp when the event occurred';
COMMENT ON COLUMN audit_logs.updated_at IS 'Timestamp when the record was last updated';

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT ON audit_logs TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO app_admin;
-- GRANT EXECUTE ON FUNCTION get_user_activity_summary TO app_user;
-- GRANT EXECUTE ON FUNCTION detect_suspicious_login_pattern TO app_security;