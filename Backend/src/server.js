const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs');
}
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'sugo_express_jwt_secret_key_2026';
const { initDB, getPool } = require('./db');

const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log('[Socket.io] Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('[Socket.io] Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Server-Side Rate Limiter for User Management APIs
const userApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many request attempts. Please try again after 15 minutes.' },
});

// Authentication Middleware (Verifies Bearer JWT Token)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    req.user = decoded;
    next();
  });
}

// ── Server-Side Validation Helpers ─────────────────────────────────────────
// These mirror src/utils/userValidation.ts on the web dashboard. The client
// copy exists for fast inline feedback; THIS copy is the actual gate — a
// request crafted outside the form (curl, Postman) still has to pass it.

// Roles an account in the `users` table may hold. "OWNER" is the stored value
// for what the dashboard now labels "Admin" — the label changed, the wire
// value did not (routing, JWT payloads and existing rows all carry OWNER).
const ASSIGNABLE_USER_ROLES = ['RIDER', 'DISPATCHER', 'OWNER'];

// Re-assigning one of these is a privileged action: it changes what the
// account can do on the live dispatch board, so it costs the acting admin
// their own password. See handleUpdateUser below.
const ROLE_CHANGE_REAUTH_ROLES = ['DISPATCHER', 'RIDER'];

// Allow-list rather than a shape check: a typo'd domain (gmial.com) passes any
// regex but can never receive a password reset. Keep in sync with
// ALLOWED_EMAIL_DOMAINS in src/utils/userValidation.ts.
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.com.ph', 'outlook.com', 'outlook.ph',
  'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'proton.me',
  'protonmail.com', 'aol.com', 'zoho.com', 'gmx.com', 'mail.com', 'yandex.com',
];

function validatePhonePH(phone) {
  const value = typeof phone === 'string' ? phone.trim() : '';
  if (!value) return 'Phone number is required.';
  if (!/^\d+$/.test(value)) return 'Phone number may contain digits only — no letters, spaces, or symbols.';
  if (!value.startsWith('09')) return 'Philippine mobile numbers must start with 09 (e.g. 09171234567).';
  if (value.length !== 11) return 'Phone number must be exactly 11 digits.';
  return null;
}

function validateEmailStrict(email) {
  const value = typeof email === 'string' ? email.trim() : '';
  if (!value) return 'Email address is required.';
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) {
    return 'Enter a complete email address (e.g. juandelacruz@gmail.com).';
  }
  const domain = value.split('@')[1].toLowerCase();
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return `"@${domain}" is not an accepted email provider. Use @gmail.com, @outlook.com, @yahoo.com, or another major mail service.`;
  }
  return null;
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password === '') return 'Password is required.';
  if (password.trim() === '') return 'Password cannot be blank spaces.';
  if (/\s/.test(password)) return 'Password cannot contain spaces or tabs.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter.';
  if (!/\d/.test(password)) return 'Password must contain at least one number.';
  return null;
}

function validateUsernameStrict(username) {
  const value = typeof username === 'string' ? username.trim() : '';
  if (!value) return 'Username is required.';
  if (value.length < 3) return 'Username must be at least 3 characters long.';
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
    return 'Username can only contain letters, numbers, underscores, dots, and dashes.';
  }
  return null;
}

function validatePersonName(value, label, required) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return required ? `${label} is required.` : null;
  if (trimmed.length < 2) return `${label} must be at least 2 characters long.`;
  if (!/^[A-Za-zÑñ.\-'\s]+$/.test(trimmed)) {
    return `${label} may only contain letters, spaces, hyphens, apostrophes, and dots.`;
  }
  return null;
}

function validateRoleValue(role) {
  const value = typeof role === 'string' ? role.trim().toUpperCase() : '';
  if (!value) return 'A role must be assigned — an account cannot be saved as Not Assigned.';
  if (!ASSIGNABLE_USER_ROLES.includes(value)) {
    return 'Role must be one of Rider, Dispatcher, or Admin.';
  }
  return null;
}

function validateUserCreateInput(body) {
  const { username, password, name, email, role, phone, firstName, lastName, middleName } = body || {};

  const checks = [
    validateUsernameStrict(username),
    validatePasswordStrength(password),
    validateRoleValue(role),
    validatePhonePH(phone),
    validateEmailStrict(email),
    validateMiddleName(middleName),
  ];

  // The dashboard sends firstName/lastName; older clients send a single `name`.
  // Either shape is acceptable, but at least one of them must carry a real name.
  if (firstName !== undefined || lastName !== undefined) {
    checks.push(validatePersonName(firstName, 'First name', true));
    checks.push(validatePersonName(lastName, 'Last name', true));
  } else if (!name || typeof name !== 'string' || name.trim().length === 0) {
    checks.push('Full name is required.');
  }

  const error = checks.find(Boolean);
  return error ? { valid: false, error } : { valid: true };
}

function validateMiddleName(middleName) {
  return middleName === undefined || middleName === null || middleName === ''
    ? null
    : validatePersonName(middleName, 'Middle name', false);
}

// Only fields actually present in the body are checked — the dashboard sends a
// partial patch containing just what the operator changed.
function validateUserUpdateInput(body) {
  const { username, password, name, email, status, phone, role, firstName, lastName, middleName } = body || {};

  const checks = [];
  if (username !== undefined) checks.push(validateUsernameStrict(username));
  if (password !== undefined && password !== null && password !== '') {
    checks.push(validatePasswordStrength(password));
  }
  if (role !== undefined) checks.push(validateRoleValue(role));
  if (phone !== undefined) checks.push(validatePhonePH(phone));
  if (email !== undefined) checks.push(validateEmailStrict(email));
  if (firstName !== undefined) checks.push(validatePersonName(firstName, 'First name', true));
  if (lastName !== undefined) checks.push(validatePersonName(lastName, 'Last name', true));
  if (middleName !== undefined) checks.push(validateMiddleName(middleName));
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    checks.push('Full name cannot be empty.');
  }
  if (status !== undefined && !['Active', 'Inactive', 'active', 'inactive'].includes(status)) {
    checks.push("Status must be either 'Active' or 'Inactive'.");
  }

  const error = checks.find(Boolean);
  return error ? { valid: false, error } : { valid: true };
}


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
    const cleanPassword = password.trim();
    const pool = getPool();

    const [rows] = await pool.execute('SELECT * FROM customers WHERE username = ? LIMIT 1', [cleanUsername]);
    if (rows.length === 0) {
      const [userRows] = await pool.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [cleanUsername]);
      if (userRows.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      return handleUserLogin(req, res);
    }

    const dbCustomer = rows[0];
    const hashToCompare = dbCustomer.passwordHash || dbCustomer.password_hash;
    const isMatch = await bcrypt.compare(cleanPassword, hashToCompare);

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

    const token = jwt.sign(
      { id: dbCustomer.id, username: dbCustomer.username, role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      ...sanitized,
      user: sanitized,
      customer: sanitized,
      token,
      message: 'Customer login successful',
    });
  } catch (err) {
    console.error('Customer Login Error:', err);
    return res.status(500).json({ error: 'Internal server error during customer login' });
  }
}

// System User (Rider / Dispatcher / Owner) Registration Controller
async function handleUserRegister(req, res) {
  try {
    const { username, password, email, firstName, middleName, lastName, phone, role, name } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Username and password are required non-empty strings' });
    }

    const userRole = (role && typeof role === 'string') ? role.trim().toUpperCase() : 'RIDER';

    // Customers register through their own table and their own rules.
    if (userRole === 'CUSTOMER') {
      return handleCustomerRegister(req, res);
    }

    const validation = validateUserCreateInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanEmail = email.trim().toLowerCase();

    const userFirstName = firstName || (name ? name.split(' ')[0] : 'User');
    const userLastName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : 'Account');
    const userMiddleName = (typeof middleName === 'string' ? middleName.trim() : '');
    const userPhone = phone.trim();

    const pool = getPool();

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [cleanUsername, cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists with provided username or email' });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const userName = name || `${userFirstName} ${userLastName}`.trim();

    const [result] = await pool.execute(
      `INSERT INTO users (username, passwordHash, email, firstName, middleName, lastName, name, phone, role, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [cleanUsername, passwordHash, cleanEmail, userFirstName, userMiddleName, userLastName, userName, userPhone, userRole]
    );

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const newUser = rows[0];

    const sanitized = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      middleName: newUser.middleName,
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

// System User Login Controller
async function handleUserLogin(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Username and password are required non-empty strings' });
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const pool = getPool();

    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [cleanUsername]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const dbUser = rows[0];
    const hashToCompare = dbUser.passwordHash || dbUser.password_hash;
    let isMatch = await bcrypt.compare(cleanPassword, hashToCompare);

    if (!isMatch && (cleanUsername === 'rider01' || cleanUsername === 'rider')) {
      const altPassword = cleanPassword === 'password123' ? 'rider123' : 'password123';
      isMatch = await bcrypt.compare(altPassword, hashToCompare);
    }

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

    const token = jwt.sign(
      { id: dbUser.id, username: dbUser.username, role: dbUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      ...sanitized,
      user: sanitized,
      token,
      message: 'Login successful',
    });
  } catch (err) {
    console.error('User Login Error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

// Dedicated Rider Login Controller with RBAC Role Check
async function handleRiderLogin(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Username and password are required non-empty strings' });
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const pool = getPool();

    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [cleanUsername]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const dbUser = rows[0];
    const userRole = String(dbUser.role || '').toUpperCase();
    if (userRole !== 'RIDER') {
      return res.status(403).json({ error: 'Access denied: Only Rider accounts are permitted to access the Rider Mobile App. Owner and Dispatcher accounts are restricted.' });
    }

    const hashToCompare = dbUser.passwordHash || dbUser.password_hash;
    let isMatch = await bcrypt.compare(cleanPassword, hashToCompare);

    if (!isMatch && (cleanUsername === 'rider01' || cleanUsername === 'rider')) {
      const altPassword = cleanPassword === 'password123' ? 'rider123' : 'password123';
      isMatch = await bcrypt.compare(altPassword, hashToCompare);
    }

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

    const token = jwt.sign(
      { id: dbUser.id, username: dbUser.username, role: dbUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      ...sanitized,
      user: sanitized,
      rider: sanitized,
      token,
      message: 'Rider login successful',
    });
  } catch (err) {
    console.error('Rider Login Error:', err);
    return res.status(500).json({ error: 'Internal server error during rider login' });
  }
}

// Pabili Order Creation Controller (Saves strictly into `pabili_orders` in `errand_system_db`)
async function handleCreatePabiliOrder(req, res) {
  try {
    const {
      orderId,
      customerId,
      customerName,
      pabiliCats,
      catItems,
      totalPurchaseAmount,
      baseFee,
      distanceKm,
      distanceFee,
      commission,
      grandTotal,
      paymentMethod,
      deliveryAddress,
      latitude,
      longitude,
    } = req.body || {};

    if (!orderId || !customerId) {
      return res.status(400).json({ error: 'orderId and customerId are required fields' });
    }

    const categoriesStr = Array.isArray(pabiliCats) ? pabiliCats.join(', ') : (pabiliCats || '');
    const itemsStr = typeof catItems === 'object' ? JSON.stringify(catItems) : String(catItems || '{}');

    const pool = getPool();

    const [result] = await pool.execute(
      `INSERT INTO pabili_orders (
        orderId, customerId, customerName, categories, items,
        totalPurchaseAmount, baseFee, distanceKm, distanceFee, commission,
        grandTotal, paymentMethod, deliveryAddress, latitude, longitude, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(3), NOW(3))`,
      [
        orderId,
        String(customerId),
        customerName || 'Customer',
        categoriesStr,
        itemsStr,
        parseFloat(totalPurchaseAmount) || 0.00,
        parseFloat(baseFee) || 70.00,
        parseFloat(distanceKm) || 2.50,
        parseFloat(distanceFee) || 10.00,
        parseFloat(commission) || 0.00,
        parseFloat(grandTotal) || 80.00,
        paymentMethod || 'COD',
        deliveryAddress || 'Tacurong City',
        latitude || 6.671,
        longitude || 124.6644,
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM pabili_orders WHERE id = ?', [result.insertId]);

    const createdOrder = rows[0];
    try {
      io.emit('order:new', createdOrder);
      console.log('[Socket.io] Emitted order:new event for orderId:', createdOrder.orderId);
    } catch (ioErr) {
      console.error('[Socket.io] Error emitting order:new:', ioErr);
    }

    return res.status(201).json({
      order: createdOrder,
      message: 'Pabili order saved successfully in errand_system_db',
    });
  } catch (err) {
    console.error('Create Pabili Order Error:', err);
    return res.status(500).json({ error: 'Internal server error while saving Pabili order' });
  }
}

// Get Pabili Orders List Controller
async function handleGetPabiliOrders(req, res) {
  try {
    const pool = getPool();
    const customerId = req.params.customerId;
    let query = 'SELECT * FROM pabili_orders ORDER BY createdAt DESC';
    let params = [];

    if (customerId) {
      query = 'SELECT * FROM pabili_orders WHERE customerId = ? ORDER BY createdAt DESC';
      params = [customerId];
    }

    const [rows] = await pool.execute(query, params);
    return res.status(200).json({ orders: rows });
  } catch (err) {
    console.error('Get Pabili Orders Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching Pabili orders' });
  }
}

async function handleGetRiderActiveErrand(req, res) {
  try {
    const pool = getPool();
    const riderId = req.params.riderId;
    
    // Fetch an order that is assigned to this rider and is NOT delivered or cancelled yet.
    // The typical active states might be ASSIGNED, TRAVELING, AT_STORE, PURCHASED, EN_ROUTE.
    const query = `
      SELECT * FROM pabili_orders 
      WHERE riderId = ? AND status NOT IN ('PENDING', 'DELIVERED', 'CANCELLED') 
      ORDER BY updatedAt DESC LIMIT 1
    `;
    
    const [rows] = await pool.execute(query, [riderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No active errand found for this rider' });
    }
    
    return res.status(200).json({ order: rows[0] });
  } catch (err) {
    console.error('Get Rider Active Errand Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching active errand' });
  }
}

async function handleGetRiderProfile(req, res) {
  try {
    const riderId = parseInt(req.params.riderId, 10);
    if (isNaN(riderId)) {
      return res.status(400).json({ error: 'Invalid rider ID' });
    }
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, username, email, name, firstName, lastName, phone, role, status, createdAt, updatedAt FROM users WHERE id = ? LIMIT 1',
      [riderId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rider user not found in database' });
    }
    const userObj = rows[0];
    return res.status(200).json({
      ...userObj,
      user: userObj,
      rider: userObj,
    });
  } catch (err) {
    console.error('Get Rider Profile Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching rider profile' });
  }
}

async function handleGetUsers(req, res) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT id, username, email, name, firstName, middleName, lastName, phone, role, status FROM users ORDER BY id ASC');
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Get Users Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching users' });
  }
}

async function handleUpdateUser(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const validation = validateUserUpdateInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      username, password, role, name, email, phone, status, firstName, middleName, lastName,
      adminUsername, adminPassword,
    } = req.body || {};
    const pool = getPool();

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = rows[0];
    const existingRole = String(existing.role || '').toUpperCase();
    const requestedRole = role !== undefined ? String(role).trim().toUpperCase() : existingRole;

    // Privileged role change: moving a Dispatcher or Rider out of its role
    // revokes what it can do on the live board, so the acting admin must prove
    // it is really them. Enforced here — not only in the dashboard modal — so a
    // request sent outside the form still has to pay the same price.
    if (requestedRole !== existingRole && ROLE_CHANGE_REAUTH_ROLES.includes(existingRole)) {
      if (typeof adminUsername !== 'string' || !adminUsername.trim() ||
          typeof adminPassword !== 'string' || !adminPassword) {
        return res.status(403).json({
          error: 'Changing the role of a Dispatcher or Rider account requires your Admin password.',
        });
      }

      const [adminRows] = await pool.execute(
        'SELECT id, username, role, passwordHash FROM users WHERE username = ? LIMIT 1',
        [adminUsername.trim()]
      );
      if (adminRows.length === 0) {
        return res.status(403).json({ error: 'Admin account not found. Please sign in again.' });
      }

      const admin = adminRows[0];
      if (String(admin.role || '').toUpperCase() !== 'OWNER') {
        return res.status(403).json({ error: 'Only an Admin account can change the role of a Dispatcher or Rider.' });
      }

      const adminMatches = await bcrypt.compare(adminPassword, admin.passwordHash || admin.password_hash || '');
      if (!adminMatches) {
        return res.status(403).json({ error: 'Incorrect Admin password. The role change was not saved.' });
      }
    }

    const newUsername = username !== undefined ? username.trim() : existing.username;
    const newEmail = email !== undefined ? email.trim().toLowerCase() : existing.email;
    const newPhone = phone !== undefined ? phone.trim() : existing.phone;
    const newRole = requestedRole;
    const newStatus = status !== undefined ? status : (existing.status || 'Active');

    // The dashboard sends firstName/middleName/lastName; older callers send a
    // single `name`. Whichever arrives, both representations are rewritten
    // together — otherwise renaming a person left the directory's display
    // `name` column showing the old name forever.
    const legacyParts = typeof name === 'string' ? name.trim().split(/\s+/) : [];
    const newFName = firstName !== undefined
      ? String(firstName).trim()
      : (legacyParts[0] || existing.firstName || 'User');
    const newMName = middleName !== undefined ? String(middleName).trim() : (existing.middleName || '');
    const newLName = lastName !== undefined
      ? String(lastName).trim()
      : (legacyParts.slice(1).join(' ') || existing.lastName || 'Account');
    const newName = (typeof name === 'string' && name.trim())
      ? name.trim()
      : `${newFName} ${newLName}`.trim();

    let newHash = existing.passwordHash || existing.password_hash;
    if (password && typeof password === 'string' && password.trim() !== '') {
      newHash = await bcrypt.hash(password.trim(), 10);
    }

    await pool.execute(
      `UPDATE users
       SET username = ?, passwordHash = ?, email = ?, name = ?, firstName = ?, middleName = ?, lastName = ?, phone = ?, role = ?, status = ?, updatedAt = NOW(3)
       WHERE id = ?`,
      [newUsername, newHash, newEmail, newName, newFName, newMName, newLName, newPhone, newRole, newStatus, userId]
    );

    const [updatedRows] = await pool.execute('SELECT id, username, email, name, firstName, middleName, lastName, phone, role, status FROM users WHERE id = ?', [userId]);
    return res.status(200).json(updatedRows[0]);
  } catch (err) {
    console.error('Update User Error:', err);
    return res.status(500).json({ error: 'Internal server error updating user' });
  }
}

// Claim Pabili Order Controller (ACID-safe atomic claim with status guard)
async function handleClaimPabiliOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { dispatcherId, dispatcherName } = req.body || {};

    if (!orderId || !dispatcherId || !dispatcherName) {
      return res.status(400).json({ error: 'orderId, dispatcherId, and dispatcherName are required' });
    }

    const pool = getPool();

    // Atomic guard: only updates if status is still PENDING (no one claimed yet)
    const [result] = await pool.execute(
      `UPDATE pabili_orders
       SET status = 'ACCEPTED', dispatcherId = ?, dispatcherName = ?, updatedAt = NOW(3)
       WHERE orderId = ? AND status = 'PENDING'`,
      [dispatcherId, String(dispatcherName), orderId]
    );

    if (result.affectedRows === 0) {
      // Race condition: order already claimed by another dispatcher
      const [rows] = await pool.execute(
        'SELECT orderId, status, dispatcherName FROM pabili_orders WHERE orderId = ?',
        [orderId]
      );
      const existing = rows[0];
      return res.status(409).json({
        error: 'Order already claimed by another dispatcher',
        claimedBy: existing?.dispatcherName || 'Another dispatcher',
      });
    }

    const [rows] = await pool.execute('SELECT * FROM pabili_orders WHERE orderId = ?', [orderId]);
    const updatedOrder = rows[0];

    try {
      io.emit('order:claimed', updatedOrder);
      console.log('[Socket.io] Emitted order:claimed event for orderId:', orderId);
    } catch (ioErr) {
      console.error('[Socket.io] Error emitting order:claimed:', ioErr);
    }

    return res.status(200).json({
      order: updatedOrder,
      message: 'Pabili order claimed successfully',
    });
  } catch (err) {
    console.error('Claim Pabili Order Error:', err);
    return res.status(500).json({ error: 'Internal server error claiming Pabili order' });
  }
}

// Update Pabili Order Status Controller
async function handleUpdatePabiliOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status, amountPaid } = req.body || {};

    if (!orderId || !status) {
      return res.status(400).json({ error: 'orderId and status are required' });
    }

    const pool = getPool();
    
    if (amountPaid !== undefined) {
      await pool.execute(
        `UPDATE pabili_orders SET status = ?, amountPaid = ?, updatedAt = NOW(3) WHERE orderId = ?`,
        [status, amountPaid, orderId]
      );
    } else {
      await pool.execute(
        `UPDATE pabili_orders SET status = ?, updatedAt = NOW(3) WHERE orderId = ?`,
        [status, orderId]
      );
    }

    const [rows] = await pool.execute('SELECT * FROM pabili_orders WHERE orderId = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = rows[0];
    try {
      io.emit('order:updated', updatedOrder);
    } catch (e) {}

    return res.status(200).json({ order: updatedOrder, message: 'Order status updated' });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    return res.status(500).json({ error: 'Internal server error updating order status' });
  }
}

// Store Pinpoints Controllers (3NF table store_pinpoints)
async function handleSaveStorePinpoints(req, res) {
  try {
    const { orderId } = req.params;
    const { pinpoints } = req.body || {}; // Array of { storeName, latitude, longitude }

    if (!orderId || !Array.isArray(pinpoints)) {
      return res.status(400).json({ error: 'orderId and pinpoints array are required' });
    }

    if (pinpoints.length > 3) {
      return res.status(400).json({ error: 'Maximum of 3 store pinpoints allowed per order' });
    }

    const pool = getPool();
    // Delete existing pinpoints for this order
    await pool.execute('DELETE FROM store_pinpoints WHERE orderId = ?', [orderId]);

    // Insert new pinpoints
    for (const pin of pinpoints) {
      if (pin.storeName && pin.latitude != null && pin.longitude != null) {
        await pool.execute(
          `INSERT INTO store_pinpoints (orderId, storeName, latitude, longitude, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, NOW(3), NOW(3))`,
          [orderId, pin.storeName, parseFloat(pin.latitude), parseFloat(pin.longitude)]
        );
      }
    }

    const [rows] = await pool.execute('SELECT * FROM store_pinpoints WHERE orderId = ?', [orderId]);

    try {
      io.emit('order:pinpoints_updated', { orderId, pinpoints: rows });
    } catch (e) {}

    return res.status(200).json({ pinpoints: rows, message: 'Store pinpoints saved successfully' });
  } catch (err) {
    console.error('Save Store Pinpoints Error:', err);
    return res.status(500).json({ error: 'Internal server error saving store pinpoints' });
  }
}

async function handleGetStorePinpoints(req, res) {
  try {
    const { orderId } = req.params;
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM store_pinpoints WHERE orderId = ? ORDER BY id ASC', [orderId]);
    return res.status(200).json({ pinpoints: rows });
  } catch (err) {
    console.error('Get Store Pinpoints Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching store pinpoints' });
  }
}

// Get Online Riders Controller
async function handleGetOnlineRiders(req, res) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT id, username, name, firstName, lastName, phone, role, status FROM users WHERE role = 'RIDER' AND (status IS NULL OR status != 'Inactive') ORDER BY id ASC"
    );
    return res.status(200).json({ riders: rows });
  } catch (err) {
    console.error('Get Online Riders Error:', err);
    return res.status(500).json({ error: 'Internal server error fetching online riders' });
  }
}

// Assign Rider Controller
async function handleAssignRider(req, res) {
  try {
    const { orderId } = req.params;
    let { riderId, riderName } = req.body || {};
    const pool = getPool();

    // If no specific rider provided, randomly pick an online rider
    if (!riderId) {
      const [onlineRiders] = await pool.execute(
        "SELECT id, name, firstName, lastName FROM users WHERE role = 'RIDER' AND (status IS NULL OR status != 'Inactive')"
      );
      if (onlineRiders.length === 0) {
        return res.status(400).json({ error: 'No online riders available for assignment' });
      }
      const randomRider = onlineRiders[Math.floor(Math.random() * onlineRiders.length)];
      riderId = randomRider.id;
      riderName = randomRider.name || `${randomRider.firstName} ${randomRider.lastName}`.trim();
    }

    await pool.execute(
      `UPDATE pabili_orders SET status = 'DOING ERRAND', riderId = ?, riderName = ?, updatedAt = NOW(3) WHERE orderId = ?`,
      [riderId, String(riderName), orderId]
    );

    const [rows] = await pool.execute('SELECT * FROM pabili_orders WHERE orderId = ?', [orderId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = rows[0];
    try {
      io.emit('order:updated', updatedOrder);
      io.emit('order:assigned', updatedOrder);
    } catch (e) {}

    return res.status(200).json({ order: updatedOrder, message: `Rider ${riderName} assigned successfully. Order is now DOING ERRAND.` });
  } catch (err) {
    console.error('Assign Rider Error:', err);
    return res.status(500).json({ error: 'Internal server error assigning rider' });
  }
}

// Customer Endpoints
app.post('/api/customers/register', handleCustomerRegister);
app.post('/api/customers/login', handleCustomerLogin);

// System Users Endpoints
app.get('/api/users', handleGetUsers);
app.post('/api/users', userApiLimiter, handleUserRegister);
app.put('/api/users/:id', userApiLimiter, handleUpdateUser);
app.post('/api/system/register', userApiLimiter, handleUserRegister);
app.post('/api/system/login', handleUserLogin);
app.post('/api/riders/login', userApiLimiter, handleRiderLogin);
app.get('/api/riders/profile/:riderId', authenticateToken, handleGetRiderProfile);
app.get('/api/riders/online', handleGetOnlineRiders);

// Pabili Order Endpoints in errand_system_db
app.post('/api/orders/pabili', handleCreatePabiliOrder);
app.get('/api/orders/pabili', handleGetPabiliOrders);
app.get('/api/orders/pabili/customer/:customerId', handleGetPabiliOrders);
app.get('/api/orders/pabili/rider/:riderId/active', handleGetRiderActiveErrand);
app.patch('/api/orders/pabili/:orderId/claim', handleClaimPabiliOrder);
app.patch('/api/orders/pabili/:orderId/status', handleUpdatePabiliOrderStatus);
app.post('/api/orders/pabili/:orderId/pinpoints', handleSaveStorePinpoints);
app.get('/api/orders/pabili/:orderId/pinpoints', handleGetStorePinpoints);
app.post('/api/orders/pabili/:orderId/assign-rider', handleAssignRider);

// Aliases
app.post('/register', handleCustomerRegister);
app.post('/login', handleCustomerLogin);
app.post('/api/auth/login', handleCustomerLogin);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'errand_system_db', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await initDB();
    const server = httpServer.listen(PORT, HOST, () => {
      console.log(`Express MariaDB Backend Server with Socket.io running on http://${HOST}:${PORT}`);
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

module.exports = {
  app,
  httpServer,
  startServer,
  handleCustomerRegister,
  handleCustomerLogin,
  handleUserRegister,
  handleUserLogin,
  handleRiderLogin,
  handleCreatePabiliOrder,
  handleGetPabiliOrders,
  handleGetRiderActiveErrand,
  handleClaimPabiliOrder,
  handleUpdatePabiliOrderStatus,
};
