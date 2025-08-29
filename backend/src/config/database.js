const { Pool } = require('pg');
const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');
const { promisify } = require('util');

// PostgreSQL configuration
const pgConfig = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'cex_db',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'cex_user',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'cex_password_2024',
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // how long to wait when connecting a client
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

// Create PostgreSQL pool
const pgPool = new Pool(pgConfig);

// Create Sequelize instance
const sequelize = new Sequelize(
  pgConfig.database,
  pgConfig.user,
  pgConfig.password,
  {
    host: pgConfig.host,
    port: pgConfig.port,
    dialect: 'postgres',
    logging: console.log, // Enable SQL query logging to see slow queries
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    ssl: pgConfig.ssl
  }
);

// MongoDB configuration
const mongoConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cex_exchange',
  options: {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    bufferCommands: false, // Disable mongoose buffering
  }
};

// PostgreSQL connection test
pgPool.on('connect', (client) => {
  console.log('PostgreSQL client connected');
});

pgPool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// MongoDB connection events will be set up after connection
// This prevents issues during test initialization

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(mongoConfig.uri, mongoConfig.options);
    console.log('MongoDB connection established');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Database query helpers
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pgPool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Database health check
const healthCheck = async () => {
  const checks = {
    postgresql: false,
    mongodb: false
  };

  try {
    // PostgreSQL health check
    const pgResult = await pgPool.query('SELECT NOW()');
    checks.postgresql = !!pgResult.rows[0];
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }

  try {
    // MongoDB health check
    const mongoResult = await mongoose.connection.db.admin().ping();
    checks.mongodb = mongoResult.ok === 1;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
  }

  return checks;
};

// Graceful shutdown
const closeConnections = async () => {
  try {
    await pgPool.end();
    console.log('PostgreSQL pool closed');
  } catch (error) {
    console.error('Error closing PostgreSQL pool:', error);
  }

  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};

// Initialize database connections
const initializeDatabase = async () => {
  try {
    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    console.log('PostgreSQL connection successful');

    // Connect to MongoDB
    await connectMongoDB();

    console.log('All database connections established successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

// Export database utilities
module.exports = {
  pgPool,
  mongoose,
  sequelize,
  query,
  transaction,
  healthCheck,
  closeConnections,
  initializeDatabase
};

// Initialize connections when module is loaded
initializeDatabase();