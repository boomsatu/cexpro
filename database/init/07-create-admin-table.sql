-- Create Admin Table (Fixed version)
-- This table stores admin users with enhanced security features
-- Updated to match existing table structure

\c cex_db;

-- Create admin roles enum if not exists
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM (
        'admin',
        'super_admin', 
        'moderator',
        'support',
        'compliance',
        'finance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create admin status enum if not exists
DO $$ BEGIN
    CREATE TYPE admin_status AS ENUM (
        'active',
        'inactive',
        'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create admins table (matching existing structure)
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    
    -- Basic information
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,  -- Changed from username to name
    password VARCHAR(255) NOT NULL,
    
    -- Admin specific fields
    role VARCHAR(50) DEFAULT 'admin',  -- Changed from enum to VARCHAR
    status VARCHAR(50) DEFAULT 'active',  -- Changed from enum to VARCHAR
    
    -- Security fields
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    
    -- Login tracking (matching existing column names)
    last_login TIMESTAMP WITH TIME ZONE,  -- Changed from last_login_at
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,  -- Changed from lock_until
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (matching existing structure)
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
CREATE INDEX IF NOT EXISTS idx_admins_created_at ON admins(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_admins_updated_at ON admins;
CREATE TRIGGER trigger_update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_admins_updated_at();

-- Insert default super admin (password: Admin123!@#)
-- Note: This should be changed immediately after first login
INSERT INTO admins (
    email,
    name,
    password,
    role,
    status,
    two_factor_enabled
) VALUES (
    'admin@cex.com',
    'Super Admin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoO', -- bcrypt hash of 'Admin123!@#'
    'super_admin',
    'active',
    FALSE -- Will be enabled after first login
) ON CONFLICT (email) DO NOTHING;

-- Create admin activity log table (matching admin id type)
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,  -- Changed to INTEGER
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(255),  -- Changed from UUID to VARCHAR for flexibility
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for admin activity logs
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_success ON admin_activity_logs(success);

COMMIT;

-- Display success message
\echo 'Admin table and related structures created successfully!';
\echo 'Default super admin created:';
\echo '  Email: admin@cex.com';
\echo '  Name: Super Admin';
\echo '  Password: Admin123!@# (CHANGE IMMEDIATELY!)';
\echo 'Admin activity logging enabled.';