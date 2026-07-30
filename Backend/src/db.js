const mysql = require('mysql2/promise');
require('dotenv').config();

function parseDatabaseUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : null;
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '3306', 10),
      user: parsed.username || 'root',
      password: parsed.password || '',
      database: database || 'errand_system_db',
    };
  } catch (e) {
    return null;
  }
}

const dbUrlConfig = parseDatabaseUrl(process.env.DATABASE_URL);

const DB_HOST = dbUrlConfig?.host || process.env.DB_HOST || 'localhost';
const DB_PORT = dbUrlConfig?.port || parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = dbUrlConfig?.user || process.env.DB_USER || 'root';
const DB_NAME = dbUrlConfig?.database || process.env.DB_NAME || 'errand_system_db';

const POSSIBLE_PASSWORDS = Array.from(new Set([
  dbUrlConfig?.password,
  process.env.DB_PASSWORD,
  'root',
  'password',
  ''
].filter((p) => p !== undefined)));

let pool = null;
let activePassword = '';

async function findWorkingPassword() {
  let lastErr = null;
  for (const pwd of POSSIBLE_PASSWORDS) {
    try {
      const conn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: pwd,
      });
      console.log(`MariaDB connected successfully with password: "${pwd}"`);
      activePassword = pwd;
      await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
      await conn.end();
      return pwd;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Unable to connect to MariaDB on ${DB_HOST}:${DB_PORT} as ${DB_USER}. Last error: ${lastErr ? lastErr.message : 'Unknown'}`);
}

async function initDB() {
  const pwd = await findWorkingPassword();
  
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: pwd,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const createUsersTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      passwordHash VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      firstName VARCHAR(255) NOT NULL DEFAULT 'User',
      middleName VARCHAR(255) NOT NULL DEFAULT '',
      lastName VARCHAR(255) NOT NULL DEFAULT 'Account',
      name VARCHAR(255) NOT NULL DEFAULT '',
      phone VARCHAR(50) NOT NULL DEFAULT '',
      role VARCHAR(50) NOT NULL DEFAULT 'RIDER',
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createCustomersTableSQL = `
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      passwordHash VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      firstName VARCHAR(255) NOT NULL DEFAULT 'Customer',
      middleName VARCHAR(255) NOT NULL DEFAULT '',
      lastName VARCHAR(255) NOT NULL DEFAULT '',
      phone VARCHAR(50) NOT NULL DEFAULT '',
      address TEXT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(createUsersTableSQL);
  await pool.execute(createCustomersTableSQL);
  console.log(`Database schema ('users' and 'customers') verified/initialized in database "${DB_NAME}".`);
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDB() first.');
  }
  return pool;
}

module.exports = {
  initDB,
  getPool,
  getDBConfig: () => ({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: activePassword,
    database: DB_NAME,
  }),
};
