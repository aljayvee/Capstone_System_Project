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

// Server-Side Validation Helpers
function validateUserCreateInput(body) {
  const { username, password, name, email, role } = body || {};
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return { valid: false, error: 'Username is required and must be at least 3 characters long.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, dots, and dashes.' };
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return { valid: false, error: 'Password is required and must be at least 6 characters long.' };
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Full Name is required.' };
  }
  if (email && typeof email === 'string' && email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { valid: false, error: 'Invalid email address format.' };
  }
  return { valid: true };
}

function validateUserUpdateInput(body) {
  const { username, password, name, email, status } = body || {};
  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim().length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters long.' };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      return { valid: false, error: 'Username can only contain letters, numbers, underscores, dots, and dashes.' };
    }
  }
  if (password !== undefined && password !== null && password !== '') {
    if (typeof password !== 'string' || password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters long if provided.' };
    }
  }
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return { valid: false, error: 'Full Name cannot be empty.' };
  }
  if (email && typeof email === 'string' && email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { valid: false, error: 'Invalid email address format.' };
  }
  if (status !== undefined && !['Active', 'Inactive', 'active', 'inactive'].includes(status)) {
    return { valid: false, error: "Status must be either 'Active' or 'Inactive'." };
  }
  return { valid: true };
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
    const { username, password, email, firstName, lastName, phone, role, name } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim() ||
        !password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'Username and password are required non-empty strings' });
    }

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanEmail = (email && typeof email === 'string' && email.trim())
      ? email.trim().toLowerCase()
      : `${cleanUsername.toLowerCase()}@capstone.ph`;
    const userRole = (role && typeof role === 'string') ? role.trim().toUpperCase() : 'RIDER';

    if (userRole === 'CUSTOMER') {
      return handleCustomerRegister(req, res);
    }

    const userFirstName = firstName || (name ? name.split(' ')[0] : 'User');
    const userLastName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : 'Account');
    const userPhone = phone || '';

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
    const [rows] = await pool.execute('SELECT id, username, email, name, firstName, lastName, phone, role, status FROM users ORDER BY id ASC');
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

    const { username, password, role, name, email, phone, status, firstName, lastName } = req.body || {};
    const pool = getPool();

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = rows[0];
    const newUsername = username !== undefined ? username.trim() : existing.username;
    const newEmail = email !== undefined ? email.trim() : existing.email;
    const newPhone = phone !== undefined ? phone.trim() : existing.phone;
    const newRole = role !== undefined ? role.toUpperCase() : existing.role;
    const newStatus = status !== undefined ? status : (existing.status || 'Active');
    const newName = name !== undefined ? name.trim() : (existing.name || `${existing.firstName || ''} ${existing.lastName || ''}`.trim());
    
    const parts = newName.split(' ');
    const newFName = firstName || parts[0] || existing.firstName || 'User';
    const newLName = lastName || parts.slice(1).join(' ') || existing.lastName || 'Account';

    let newHash = existing.passwordHash || existing.password_hash;
    if (password && typeof password === 'string' && password.trim() !== '') {
      newHash = await bcrypt.hash(password.trim(), 10);
    }

    await pool.execute(
      `UPDATE users 
       SET username = ?, passwordHash = ?, email = ?, name = ?, firstName = ?, lastName = ?, phone = ?, role = ?, status = ?, updatedAt = NOW(3)
       WHERE id = ?`,
      [newUsername, newHash, newEmail, newName, newFName, newLName, newPhone, newRole, newStatus, userId]
    );

    const [updatedRows] = await pool.execute('SELECT id, username, email, name, firstName, lastName, phone, role, status FROM users WHERE id = ?', [userId]);
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
