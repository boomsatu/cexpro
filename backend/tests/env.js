// Test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3004';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-do-not-use-in-production';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!';
process.env.BACKUP_ENCRYPTION_KEY = 'backup-test-encryption-key-32-ch!';

// Database configurations
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'cex_test';
process.env.POSTGRES_USER = 'cex_user';
process.env.POSTGRES_PASSWORD = 'cex_password_2024';

// Redis configuration
process.env.REDIS_URL = 'redis://:redis_password_2024@localhost:6379/1';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'redis_password_2024';
process.env.REDIS_DB = '1';

// MongoDB configuration
process.env.MONGODB_URI = 'mongodb://mongo_user:mongo_password_2024@localhost:27017/cex_test';
process.env.MONGODB_HOST = 'localhost';
process.env.MONGODB_PORT = '27017';
process.env.MONGODB_DB = 'cex_test';
process.env.MONGODB_USER = 'mongo_user';
process.env.MONGODB_PASSWORD = 'mongo_password_2024';

// Session configuration
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only';
process.env.COOKIE_SECRET = 'test-cookie-secret-for-testing-only';

// Email configuration (mock)
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'testpassword';
process.env.FROM_EMAIL = 'noreply@cex-test.com';

// SMS configuration (mock)
process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';

// OAuth configuration (mock)
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// Payment configuration (mock)
process.env.STRIPE_SECRET_KEY = 'sk_test_test_stripe_secret_key';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_test_stripe_publishable_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';

// Blockchain configuration (mock)
process.env.BITCOIN_RPC_URL = 'http://localhost:8332';
process.env.BITCOIN_RPC_USER = 'test_user';
process.env.BITCOIN_RPC_PASS = 'test_pass';
process.env.ETHEREUM_RPC_URL = 'http://localhost:8545';
process.env.ETHEREUM_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

// External API configuration (mock)
process.env.COINMARKETCAP_API_KEY = 'test-coinmarketcap-api-key';
process.env.BINANCE_API_KEY = 'test-binance-api-key';
process.env.BINANCE_SECRET_KEY = 'test-binance-secret-key';

// Security configuration
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.BCRYPT_ROUNDS = '10'; // Lower for faster tests

// Logging configuration
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
process.env.LOG_FILE = 'false';

// Feature flags for testing
process.env.ENABLE_2FA = 'true';
process.env.ENABLE_KYC = 'true';
process.env.ENABLE_TRADING = 'true';
process.env.ENABLE_WITHDRAWALS = 'true';
process.env.ENABLE_DEPOSITS = 'true';

// Test-specific configurations
process.env.TEST_TIMEOUT = '30000';
process.env.TEST_DB_SYNC = 'true';
process.env.TEST_CLEAR_DB = 'true';

// Disable external services in tests
process.env.DISABLE_EXTERNAL_APIS = 'true';
process.env.DISABLE_EMAIL_SENDING = 'true';
process.env.DISABLE_SMS_SENDING = 'true';
process.env.DISABLE_BLOCKCHAIN_CALLS = 'true';

// Mock service URLs
process.env.MOCK_BLOCKCHAIN_SERVICE = 'true';
process.env.MOCK_PAYMENT_SERVICE = 'true';
process.env.MOCK_NOTIFICATION_SERVICE = 'true';

// CORS configuration for tests
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:3001';
process.env.CORS_CREDENTIALS = 'true';

// WebSocket configuration
process.env.WS_PORT = '3005';
process.env.WS_HEARTBEAT_INTERVAL = '30000';
process.env.WS_MAX_CONNECTIONS = '1000';

// File upload configuration
process.env.UPLOAD_MAX_SIZE = '10485760'; // 10MB
process.env.UPLOAD_ALLOWED_TYPES = 'image/jpeg,image/png,application/pdf';

// Cache configuration
process.env.CACHE_TTL = '300'; // 5 minutes
process.env.CACHE_MAX_KEYS = '1000';

// Monitoring configuration (disabled in tests)
process.env.ENABLE_METRICS = 'false';
process.env.ENABLE_TRACING = 'false';
process.env.ENABLE_HEALTH_CHECKS = 'true';

console.log('Test environment variables loaded');