const express = require('express');
const cors = require('cors');
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs');
}
const { initDB, getPool } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Customer Registration Controller (stores in `customers` table)
async function handleCustomerRegister(req, res) {
  try {
    const { username, password, email, firstName, lastName, phone, address, name } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim() ||
        !email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Username, password, and email are required non-empty strings' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const customerFirstName = firstName || (name ? name.split(' ')[0] : 'Customer');
    const customerLastName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : '');
    const customerPhone = phone || '';
    const customerAddress = address || '';

    const pool = getPool();

    // Check duplicate in `customers` table
    const [existing] = await pool.execute(
      'SELECT id FROM customers WHERE username = ? OR email = ? LIMIT 1',
      [cleanUsername, cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Customer already exists with provided username or email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO customers (username, passwordHash, email, firstName, lastName, phone, address, role, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CUSTOMER', NOW(3), NOW(3))`,
      [cleanUsername, passwordHash, cleanEmail, customerFirstName, customerLastName, customerPhone, customerAddress]
    );

    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    const newCustomer = rows[0];

    const sanitized = {
      id: newCustomer.id,
      username: newCustomer.username,
      email: newCustomer.email,
      firstName: newCustomer.firstName,
      lastName: newCustomer.lastName,
      phone: newCustomer.phone,
      address: newCustomer.address,
      role: 'CUSTOMER',
      createdAt: newCustomer.createdAt,
      updatedAt: newCustomer.updatedAt,
    };

    return res.status(201).json({
      ...sanitized,
      user: sanitized,
      customer: sanitized,
      message: 'Customer registered successfully',
    });
  } catch (err) {
    console.error('Customer Registration Error:', err);
    return res.status(500).json({ error: 'Internal server error during customer registration' });
  }
}

// Customer Login Controller (queries `customers` table)
async function handleCustomerLogin(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Username and password are required non-empty strings' });
    }

    const cleanUsername = username.trim();
    const pool = getPool();

    // Check `customers` table
    const [rows] = await pool.execute('SELECT * FROM customers WHERE username = ? LIMIT 1', [cleanUsername]);
    if (rows.length === 0) {
      // Fallback check `users` table if registered there
      const [userRows] = await pool.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [cleanUsername]);
      if (userRows.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      return handleUserLogin(req, res);
    }

    const dbCustomer = rows[0];
    const hashToCompare = dbCustomer.passwordHash || dbCustomer.password_hash;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const sanitized = {
      id: dbCustomer.id,
      username: dbCustomer.username,
      email: dbCustomer.email,
      firstName: dbCustomer.firstName,
      lastName: dbCustomer.lastName,
      phone: dbCustomer.phone,
      address: dbCustomer.address,
      role: 'CUSTOMER',
      createdAt: dbCustomer.createdAt,
      updatedAt: dbCustomer.updatedAt,
    };

    return res.status(200).json({
      ...sanitized,
      user: sanitized,
      customer: sanitized,
      token: 'sugo-jwt-customer-token-12345',
      message: 'Customer login successful',
    });
  } catch (err) {
    console.error('Customer Login Error:', err);
    return res.status(500).json({ error: 'Internal server error during customer login' });
  }
}

// System User (Rider / Dispatcher / Owner) Registration Controller (stores in `users` table)
async function handleUserRegister(req, res) {
  try {
    const { username, password, email, firstName, lastName, phone, role, name } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim() ||
        !email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Username, password, and email are required non-empty strings' });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const userRole = (role && typeof role === 'string') ? role.trim().toUpperCase() : 'RIDER';

    // If role is explicitly CUSTOMER, route to customer registration table
    if (userRole === 'CUSTOMER') {
      return handleCustomerRegister(req, res);
    }

    const userFirstName = firstName || (name ? name.split(' ')[0] : 'User');
    const userLastName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : 'Account');
    const userPhone = phone || '';

    const pool = getPool();

    // Check duplicate in `users`
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [cleanUsername, cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists with provided username or email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userName = name || `${userFirstName} ${userLastName}`.trim();

    const [result] = await pool.execute(
      `INSERT INTO users (username, passwordHash, email, firstName, lastName, name, phone, role, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [cleanUsername, passwordHash, cleanEmail, userFirstName, userLastName, userName, userPhone, userRole]
    );

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const newUser = rows[0];

    const sanitized = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return res.status(201).json({
      ...sanitized,
      user: sanitized,
      message: 'User registered successfully',
    });
  } catch (err) {
    console.error('User Registration Error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}

// System User (Rider / Dispatcher / Owner) Login Controller
async function handleUserLogin(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Username and password are required non-empty strings' });
    }

    const cleanUsername = username.trim();
    const pool = getPool();

    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [cleanUsername]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const dbUser = rows[0];
    const hashToCompare = dbUser.passwordHash || dbUser.password_hash;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const sanitized = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      phone: dbUser.phone,
      role: dbUser.role,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    return res.status(200).json({
      ...sanitized,
      user: sanitized,
      token: 'sugo-jwt-session-token-12345',
      message: 'Login successful',
    });
  } catch (err) {
    console.error('User Login Error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

// Customer Endpoints (Explicit)
app.post('/api/customers/register', handleCustomerRegister);
app.post('/api/customers/login', handleCustomerLogin);

// CustomerApp default routes (Routes to Customer handler)
app.post('/register', handleCustomerRegister);
app.post('/api/users', handleCustomerRegister);

// System Users (Rider/Dispatcher/Owner) Endpoints
app.post('/api/system/register', handleUserRegister);
app.post('/api/system/login', handleUserLogin);

// Login routes (checks customers first, then users)
app.post('/login', handleCustomerLogin);
app.post('/api/auth/login', handleCustomerLogin);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'errand_system_db', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await initDB();
    const server = app.listen(PORT, HOST, () => {
      console.log(`Express MariaDB Backend Server running on http://${HOST}:${PORT}`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, handleCustomerRegister, handleCustomerLogin, handleUserRegister, handleUserLogin };
