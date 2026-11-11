const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
let isConnected = false;

// Create pool if credentials or DATABASE_URL exist
const connectionString = process.env.DATABASE_URL || 
  (process.env.PGUSER && `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'attendance_db'}`);

if (connectionString) {
  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 3000
  });
} else {
  // Default localhost pool with short timeout to detect availability
  pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'attendance_db',
    password: process.env.PGPASSWORD || 'postgres',
    port: process.env.PGPORT || 5432,
    connectionTimeoutMillis: 2000
  });
}

// Table initialization schema
const initSchemaQuery = `
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(100),
  roll_no VARCHAR(100),
  photo_url TEXT,
  embedding JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id SERIAL PRIMARY KEY,
  student_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Present',
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function initDB() {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    console.log('✓ [PostgreSQL] Connected successfully to database');
    await client.query(initSchemaQuery);
    console.log('✓ [PostgreSQL] Database tables initialized (admins, users, attendance_logs)');
    client.release();
    isConnected = true;
    return true;
  } catch (err) {
    console.warn(`! [PostgreSQL] Not connected (${err.message}). Using local JSON/CSV fallback storage.`);
    isConnected = false;
    return false;
  }
}

function query(text, params) {
  if (!pool || !isConnected) {
    throw new Error('Database is not connected');
  }
  return pool.query(text, params);
}

function getStatus() {
  return {
    connected: isConnected,
    type: isConnected ? 'PostgreSQL' : 'JSON/CSV Fallback'
  };
}

module.exports = {
  pool,
  query,
  initDB,
  getStatus
};

