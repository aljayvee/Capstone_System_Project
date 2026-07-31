/**
 * Backend & MariaDB Verification Test Suite
 * Executed via: node verify-backend.js (or npm test)
 */

const mysql = require('mysql2/promise');
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  bcrypt = require('bcryptjs');
}

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';
const { startServer } = require('./src/server');
const { getDBConfig } = require('./src/db');

async function ensureServerRunning() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Server is already running on port 5000. Connected to database "${data.database || 'errand_system_db'}".`);
      return null;
    }
  } catch (err) {
    console.log('Starting server in verification process...');
    const server = await startServer();
    return server;
  }
}

async function runVerification() {
  console.log("==================================================");
  console.log("Backend & MariaDB Integration Verification Suite");
  console.log("Database: errand_system_db (PORT: 5000)");
  console.log("==================================================");

  const serverInstance = await ensureServerRunning();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  async function postJSON(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      return { status: response.status, body };
    } catch (err) {
      return { status: 0, error: err.message };
    }
  }

  const timestamp = Date.now();
  
  // Customer test record
  const testCustomer = {
    username: `customer_${timestamp}`,
    password: 'CustomerPassword123!',
    email: `customer_${timestamp}@example.com`,
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '09178889900',
    address: '123 Main Street, Manila',
    role: 'CUSTOMER',
  };

  // System User test record (Rider/Dispatcher/Owner)
  const testSystemUser = {
    username: `rider_${timestamp}`,
    password: 'RiderPassword456!',
    email: `rider_${timestamp}@example.com`,
    firstName: 'Speedy',
    lastName: 'Rider',
    phone: '09171112233',
    role: 'RIDER',
  };

  // ----------------------------------------------------
  // Test 1: Customer Registration POST (/api/customers/register and /register)
  // ----------------------------------------------------
  console.log("\n1. Testing Customer Registration POST...");
  
  const regRes1 = await postJSON('/api/customers/register', testCustomer);
  assert(
    regRes1.status === 201 || regRes1.status === 200,
    `POST /api/customers/register returns 201/200 HTTP status (got ${regRes1.status})`
  );
  assert(
    regRes1.body && (regRes1.body.username === testCustomer.username || regRes1.body.customer?.username === testCustomer.username),
    "POST /api/customers/register response returns matching customer username"
  );
  assert(
    regRes1.body && (regRes1.body.role === 'CUSTOMER' || regRes1.body.customer?.role === 'CUSTOMER'),
    "Customer record has role set to CUSTOMER"
  );

  // ----------------------------------------------------
  // Test 2: System User Registration POST (/api/system/register)
  // ----------------------------------------------------
  console.log("\n2. Testing System User (Rider/Dispatcher/Owner) Registration POST...");
  
  const sysRegRes = await postJSON('/api/system/register', testSystemUser);
  assert(
    sysRegRes.status === 201 || sysRegRes.status === 200,
    `POST /api/system/register returns 201/200 HTTP status (got ${sysRegRes.status})`
  );
  assert(
    sysRegRes.body && (sysRegRes.body.username === testSystemUser.username || sysRegRes.body.user?.username === testSystemUser.username),
    "POST /api/system/register response returns matching system user username"
  );

  // ----------------------------------------------------
  // Test 3: Database Persistence in `errand_system_db` (`customers` and `users` tables)
  // ----------------------------------------------------
  console.log("\n3. Testing Database Table Separation in `errand_system_db`...");
  let connection;
  try {
    const dbConfig = getDBConfig();
    connection = await mysql.createConnection(dbConfig);
    
    // Verify customer is in `customers` table
    const [custRows] = await connection.execute(
      'SELECT * FROM customers WHERE username = ?',
      [testCustomer.username]
    );

    assert(custRows.length > 0, "Customer record is stored in dedicated `customers` table");
    if (custRows.length > 0) {
      const dbCust = custRows[0];
      assert(dbCust.role === 'CUSTOMER', "Database role column is CUSTOMER in `customers` table");
      const isBcryptMatch = await bcrypt.compare(testCustomer.password, dbCust.passwordHash);
      assert(isBcryptMatch === true, "bcrypt.compare validates customer password against DB hash");
    }

    // Verify system user is in `users` table
    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [testSystemUser.username]
    );

    assert(userRows.length > 0, "System user (Rider/Dispatcher/Owner) record is stored in `users` table");
    if (userRows.length > 0) {
      const dbUser = userRows[0];
      assert(dbUser.role === 'RIDER', "System user record role is RIDER in `users` table");
    }

    // Ensure customer is NOT in users table
    const [custInUsers] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [testCustomer.username]
    );
    assert(custInUsers.length === 0, "Customer data is separate and NOT stored in `users` table");

  } catch (dbErr) {
    console.error(`  [FAIL] MariaDB Connection / Query Error: ${dbErr.message}`);
    failed++;
  } finally {
    if (connection) await connection.end();
  }

  // ----------------------------------------------------
  // Test 4: Customer Login POST 200 OK
  // ----------------------------------------------------
  console.log("\n4. Testing Customer Login POST...");
  
  const loginRes = await postJSON('/api/customers/login', {
    username: testCustomer.username,
    password: testCustomer.password,
  });
  assert(loginRes.status === 200, `POST /api/customers/login returns HTTP 200 OK (got ${loginRes.status})`);
  assert(
    loginRes.body && (loginRes.body.username === testCustomer.username || loginRes.body.customer?.username === testCustomer.username),
    "POST /api/customers/login returns customer profile"
  );

  // ----------------------------------------------------
  // Test 5: System User Login POST 200 OK
  // ----------------------------------------------------
  console.log("\n5. Testing System User Login POST...");
  
  const sysLoginRes = await postJSON('/api/system/login', {
    username: testSystemUser.username,
    password: testSystemUser.password,
  });
  assert(sysLoginRes.status === 200, `POST /api/system/login returns HTTP 200 OK (got ${sysLoginRes.status})`);

  // ----------------------------------------------------
  // Test 6: Pabili Order Creation POST /api/orders/pabili in `errand_system_db`
  // ----------------------------------------------------
  console.log("\n6. Testing Pabili Order Creation POST in `pabili_orders` table...");
  const pabiliOrderData = {
    orderId: `PABILI-${timestamp}`,
    customerId: testCustomer.username,
    customerName: `${testCustomer.firstName} ${testCustomer.lastName}`,
    pabiliCats: ['Pharmacy', 'Grocery'],
    catItems: { Pharmacy: ['Aspirin'], Grocery: ['Milk'] },
    totalPurchaseAmount: 450.00,
    baseFee: 70.00,
    distanceKm: 2.5,
    distanceFee: 10.00,
    commission: 50.00,
    grandTotal: 580.00,
    paymentMethod: 'COD',
    deliveryAddress: 'Tacurong City',
    latitude: 6.671,
    longitude: 124.6644,
  };

  const orderRes = await postJSON('/api/orders/pabili', pabiliOrderData);
  assert(orderRes.status === 201, `POST /api/orders/pabili returns HTTP 201 Created (got ${orderRes.status})`);
  assert(orderRes.body && orderRes.body.order?.orderId === pabiliOrderData.orderId, "Pabili order returns saved orderId");

  try {
    const dbConfig = getDBConfig();
    connection = await mysql.createConnection(dbConfig);
    const [pabiliRows] = await connection.execute(
      'SELECT * FROM pabili_orders WHERE orderId = ?',
      [pabiliOrderData.orderId]
    );

    assert(pabiliRows.length > 0, "Pabili order is persisted in `pabili_orders` table in `errand_system_db`");
  } catch (dbErr) {
    console.error(`  [FAIL] Pabili Orders Table Query Error: ${dbErr.message}`);
    failed++;
  } finally {
    if (connection) await connection.end();
  }

  console.log("\n==================================================");
  console.log(`Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (serverInstance && serverInstance.close) {
    serverInstance.close();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error("Unhandled error during verification:", err);
  process.exit(1);
});
