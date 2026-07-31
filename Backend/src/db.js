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

  const createPabiliOrdersTableSQL = `
    CREATE TABLE IF NOT EXISTS pabili_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orderId VARCHAR(100) NOT NULL UNIQUE,
      customerId VARCHAR(100) NOT NULL,
      customerName VARCHAR(255) NOT NULL,
      categories TEXT NOT NULL,
      items LONGTEXT NOT NULL,
      totalPurchaseAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      baseFee DECIMAL(10,2) NOT NULL DEFAULT 70.00,
      distanceKm DECIMAL(10,2) NOT NULL DEFAULT 2.50,
      distanceFee DECIMAL(10,2) NOT NULL DEFAULT 10.00,
      commission DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      grandTotal DECIMAL(10,2) NOT NULL,
      paymentMethod VARCHAR(50) NOT NULL DEFAULT 'COD',
      amountPaid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      deliveryAddress TEXT NULL,
      latitude DECIMAL(10,7) NULL,
      longitude DECIMAL(10,7) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      dispatcherId INT NULL DEFAULT NULL,
      dispatcherName VARCHAR(255) NULL DEFAULT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createStorePinpointsTableSQL = `
    CREATE TABLE IF NOT EXISTS store_pinpoints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orderId VARCHAR(100) NOT NULL,
      storeName VARCHAR(255) NOT NULL,
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_orderId (orderId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(createUsersTableSQL);
  await pool.execute(createCustomersTableSQL);
  await pool.execute(createPabiliOrdersTableSQL);
  await pool.execute(createStorePinpointsTableSQL);

  // Safely add dispatcher & rider columns if table already existed without them
  try {
    const [cols] = await pool.execute(`SHOW COLUMNS FROM pabili_orders LIKE 'dispatcherId'`);
    if (cols.length === 0) {
      await pool.execute(`ALTER TABLE pabili_orders ADD COLUMN dispatcherId INT NULL DEFAULT NULL AFTER status, ADD COLUMN dispatcherName VARCHAR(255) NULL DEFAULT NULL AFTER dispatcherId`);
    }
    const [rCols] = await pool.execute(`SHOW COLUMNS FROM pabili_orders LIKE 'riderId'`);
    if (rCols.length === 0) {
      await pool.execute(`ALTER TABLE pabili_orders ADD COLUMN riderId INT NULL DEFAULT NULL AFTER dispatcherName, ADD COLUMN riderName VARCHAR(255) NULL DEFAULT NULL AFTER riderId`);
    }
    const [amtCols] = await pool.execute(`SHOW COLUMNS FROM pabili_orders LIKE 'amountPaid'`);
    if (amtCols.length === 0) {
      await pool.execute(`ALTER TABLE pabili_orders ADD COLUMN amountPaid DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER paymentMethod`);
    }
  } catch (err) {
    console.warn('Column check warning for pabili_orders:', err.message);
  }

  // Seed initial system users and rider accounts if not present
  try {
    let bcrypt;
    try { bcrypt = require('bcrypt'); } catch (e) { bcrypt = require('bcryptjs'); }

    const seedUsers = [
      { username: 'rider01', password: 'password123', email: 'rider01@sugo.ph', role: 'RIDER', name: 'Al-Dhen Musali', firstName: 'Al-Dhen', lastName: 'Musali', phone: '09391234567' },
      { username: 'rider', password: 'rider123', email: 'rider@sugo.ph', role: 'RIDER', name: 'Demo Rider', firstName: 'Demo', lastName: 'Rider', phone: '09170000000' },
      { username: 'dispatcher', password: 'dispatch123', email: 'dispatcher@sugo.ph', role: 'DISPATCHER', name: 'Main Dispatcher', firstName: 'Main', lastName: 'Dispatcher', phone: '09170000001' },
      { username: 'owner', password: 'owner123', email: 'owner@sugo.ph', role: 'OWNER', name: 'System Owner', firstName: 'System', lastName: 'Owner', phone: '09170000002' },
    ];

    for (const u of seedUsers) {
      const [existing] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [u.username]);
      const hash = await bcrypt.hash(u.password, 10);
      if (existing.length === 0) {
        await pool.execute(
          'INSERT INTO users (username, passwordHash, email, firstName, lastName, name, phone, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))',
          [u.username, hash, u.email, u.firstName, u.lastName, u.name, u.phone, u.role]
        );
        console.log(`Seeded user '${u.username}' (${u.role}) into 'users' table.`);
      } else {
        await pool.execute(
          'UPDATE users SET passwordHash = ?, role = ? WHERE username = ?',
          [hash, u.role, u.username]
        );
        console.log(`Updated credentials for seeded user '${u.username}' (${u.role}).`);
      }
    }

    const seedCustomers = [
      { username: 'customer', password: 'customer123', email: 'customer@sugo.ph', firstName: 'Juan', lastName: 'Dela Cruz', phone: '09170000003', address: 'Tacurong City' },
    ];

    for (const c of seedCustomers) {
      const [existing] = await pool.execute('SELECT id FROM customers WHERE username = ? LIMIT 1', [c.username]);
      const hash = await bcrypt.hash(c.password, 10);
      if (existing.length === 0) {
        await pool.execute(
          'INSERT INTO customers (username, passwordHash, email, firstName, lastName, phone, address, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))',
          [c.username, hash, c.email, c.firstName, c.lastName, c.phone, c.address, 'CUSTOMER']
        );
        console.log(`Seeded customer '${c.username}' into 'customers' table.`);
      } else {
        await pool.execute(
          'UPDATE customers SET passwordHash = ? WHERE username = ?',
          [hash, c.username]
        );
      }
    }
  } catch (seedErr) {
    console.warn('Seeding warning:', seedErr.message);
  }

  console.log(`Database schema ('users', 'customers', 'pabili_orders', and 'store_pinpoints') verified/initialized in database "${DB_NAME}".`);
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
