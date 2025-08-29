-- CEX Database Initialization Script
-- Creates multiple databases for different services

-- Create additional databases
CREATE DATABASE cex_trading;
CREATE DATABASE cex_wallet;
CREATE DATABASE cex_compliance;
CREATE DATABASE cex_analytics;

-- Create users for different services
CREATE USER cex_trading_user WITH ENCRYPTED PASSWORD 'trading_password_2024';
CREATE USER cex_wallet_user WITH ENCRYPTED PASSWORD 'wallet_password_2024';
CREATE USER cex_compliance_user WITH ENCRYPTED PASSWORD 'compliance_password_2024';
CREATE USER cex_analytics_user WITH ENCRYPTED PASSWORD 'analytics_password_2024';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE cex_trading TO cex_trading_user;
GRANT ALL PRIVILEGES ON DATABASE cex_wallet TO cex_wallet_user;
GRANT ALL PRIVILEGES ON DATABASE cex_compliance TO cex_compliance_user;
GRANT ALL PRIVILEGES ON DATABASE cex_analytics TO cex_analytics_user;

-- Grant main user access to all databases
GRANT ALL PRIVILEGES ON DATABASE cex_trading TO cex_user;
GRANT ALL PRIVILEGES ON DATABASE cex_wallet TO cex_user;
GRANT ALL PRIVILEGES ON DATABASE cex_compliance TO cex_user;
GRANT ALL PRIVILEGES ON DATABASE cex_analytics TO cex_user;

-- Create extensions
\c cex_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c cex_trading;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c cex_wallet;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c cex_compliance;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\c cex_analytics;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create custom types
\c cex_db;

-- Order status enum
CREATE TYPE order_status AS ENUM (
    'NEW',
    'PENDING',
    'PARTIALLY_FILLED',
    'FILLED',
    'CANCELLED',
    'REJECTED',
    'EXPIRED'
);

-- Order type enum
CREATE TYPE order_type AS ENUM (
    'MARKET',
    'LIMIT',
    'STOP_LOSS',
    'STOP_LIMIT',
    'TAKE_PROFIT',
    'ICEBERG',
    'OCO'
);

-- Order side enum
CREATE TYPE order_side AS ENUM ('BUY', 'SELL');

-- Time in force enum
CREATE TYPE time_in_force AS ENUM (
    'GTC',  -- Good Till Cancelled
    'IOC',  -- Immediate Or Cancel
    'FOK',  -- Fill Or Kill
    'GTD'   -- Good Till Date
);

-- Transaction status enum
CREATE TYPE transaction_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);

-- Transaction type enum
CREATE TYPE transaction_type AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'TRADE',
    'FEE',
    'BONUS',
    'ADJUSTMENT'
);

-- KYC status enum
CREATE TYPE kyc_status AS ENUM (
    'UNVERIFIED',
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'EXPIRED'
);

-- KYC level enum
CREATE TYPE kyc_level AS ENUM (
    'LEVEL_0',  -- No verification
    'LEVEL_1',  -- Basic verification
    'LEVEL_2',  -- Enhanced verification
    'LEVEL_3'   -- Premium verification
);

-- Wallet type enum
CREATE TYPE wallet_type AS ENUM ('HOT', 'WARM', 'COLD');

-- User role enum
CREATE TYPE user_role AS ENUM (
    'USER',
    'VIP',
    'ADMIN',
    'SUPER_ADMIN',
    'SUPPORT',
    'COMPLIANCE',
    'FINANCE'
);

-- Account status enum
CREATE TYPE account_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'BANNED',
    'PENDING_VERIFICATION'
);

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
    'EMAIL',
    'SMS',
    'PUSH',
    'IN_APP'
);

-- Risk level enum
CREATE TYPE risk_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

COMMIT;