const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          duration,
        });
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        status: 0,
        error: err.message,
        duration,
      });
    });

    if (body !== null) {
      if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log(`====================================================`);
  console.log(`Starting Backend API Functional & Performance Stress Tests`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`====================================================\n`);

  const results = {
    healthCheck: null,
    validationTests: [],
    duplicateTests: [],
    authTests: [],
    concurrencyTest: null,
  };

  // 1. Health Check
  console.log('[1/5] Checking Server Health...');
  const healthRes = await makeRequest('/api/health');
  results.healthCheck = healthRes;
  console.log(`Health Status: ${healthRes.status}, Response:`, healthRes.data);
  if (healthRes.status !== 200) {
    console.error('Server is not healthy or running! Aborting tests.');
    process.exit(1);
  }

  // 2. Input Validation Tests
  console.log('\n[2/5] Testing Input Validation & Edge Cases...');
  const validationCases = [
    {
      name: 'Missing password field',
      endpoint: '/register',
      method: 'POST',
      body: { username: 'testuser_val1', email: 'val1@example.com' },
      expectedStatus: 400
    },
    {
      name: 'Missing username field',
      endpoint: '/register',
      method: 'POST',
      body: { password: 'password123', email: 'val2@example.com' },
      expectedStatus: 400
    },
    {
      name: 'Missing email field',
      endpoint: '/register',
      method: 'POST',
      body: { username: 'testuser_val3', password: 'password123' },
      expectedStatus: 400
    },
    {
      name: 'Empty string username',
      endpoint: '/register',
      method: 'POST',
      body: { username: '   ', password: 'password123', email: 'val4@example.com' },
      expectedStatus: 400
    },
    {
      name: 'Empty string password',
      endpoint: '/register',
      method: 'POST',
      body: { username: 'testuser_val5', password: '  ', email: 'val5@example.com' },
      expectedStatus: 400
    },
    {
      name: 'Login missing username',
      endpoint: '/login',
      method: 'POST',
      body: { password: 'password123' },
      expectedStatus: 400
    },
    {
      name: 'Login missing password',
      endpoint: '/login',
      method: 'POST',
      body: { username: 'someuser' },
      expectedStatus: 400
    },
    {
      name: 'Invalid JSON payload string',
      endpoint: '/register',
      method: 'POST',
      body: '{ invalid_json: ',
      expectedStatus: 400
    }
  ];

  for (const tc of validationCases) {
    const res = await makeRequest(tc.endpoint, tc.method, tc.body);
    const pass = res.status === tc.expectedStatus;
    results.validationTests.push({ ...tc, actualStatus: res.status, pass, duration: res.duration });
    console.log(`  - [${pass ? 'PASS' : 'FAIL'}] ${tc.name} | Status: ${res.status} (Expected: ${tc.expectedStatus}) | ${res.duration}ms`);
  }

  // 3. Duplicate User / Email Collisions
  console.log('\n[3/5] Testing Duplicate Username & Email Handling...');
  const timestamp = Date.now();
  const baseUser = {
    username: `perf_user_${timestamp}`,
    password: `password_${timestamp}`,
    email: `perf_${timestamp}@example.com`,
    firstName: 'Perf',
    lastName: 'Tester'
  };

  // Initial Registration
  const reg1 = await makeRequest('/register', 'POST', baseUser);
  console.log(`  - Primary Registration: Status ${reg1.status} | ${reg1.duration}ms`);

  if (reg1.status === 201) {
    // Duplicate Username
    const dupUsername = await makeRequest('/register', 'POST', {
      username: baseUser.username,
      password: 'newpassword123',
      email: `diff_${timestamp}@example.com`
    });
    const dupUserPass = dupUsername.status === 400;
    results.duplicateTests.push({ name: 'Duplicate Username Collision', status: dupUsername.status, expected: 400, pass: dupUserPass });
    console.log(`  - [${dupUserPass ? 'PASS' : 'FAIL'}] Duplicate Username | Status: ${dupUsername.status} (Expected: 400)`);

    // Duplicate Email
    const dupEmail = await makeRequest('/register', 'POST', {
      username: `diff_${timestamp}`,
      password: 'newpassword123',
      email: baseUser.email.toUpperCase() // test case insensitivity
    });
    const dupEmailPass = dupEmail.status === 400;
    results.duplicateTests.push({ name: 'Duplicate Email Collision (Case Insensitive)', status: dupEmail.status, expected: 400, pass: dupEmailPass });
    console.log(`  - [${dupEmailPass ? 'PASS' : 'FAIL'}] Duplicate Email Collision | Status: ${dupEmail.status} (Expected: 400)`);
  } else {
    console.log('  - Initial registration failed, skipping collision tests.');
  }

  // 4. Incorrect Password & Invalid Login Attempts
  console.log('\n[4/5] Testing Authentication Failure Scenarios...');
  if (reg1.status === 201) {
    const wrongPass = await makeRequest('/login', 'POST', {
      username: baseUser.username,
      password: 'wrong_password_xyz'
    });
    const wrongPassOk = wrongPass.status === 401;
    results.authTests.push({ name: 'Incorrect Password Login', status: wrongPass.status, expected: 401, pass: wrongPassOk });
    console.log(`  - [${wrongPassOk ? 'PASS' : 'FAIL'}] Incorrect Password Login | Status: ${wrongPass.status} (Expected: 401)`);

    const nonExistent = await makeRequest('/login', 'POST', {
      username: `nonexistent_${timestamp}`,
      password: 'somepassword123'
    });
    const nonExistOk = nonExistent.status === 401;
    results.authTests.push({ name: 'Non-existent Username Login', status: nonExistent.status, expected: 401, pass: nonExistOk });
    console.log(`  - [${nonExistOk ? 'PASS' : 'FAIL'}] Non-existent Username Login | Status: ${nonExistent.status} (Expected: 401)`);

    const correctLogin = await makeRequest('/login', 'POST', {
      username: baseUser.username,
      password: baseUser.password
    });
    const correctOk = correctLogin.status === 200;
    results.authTests.push({ name: 'Valid Credentials Login', status: correctLogin.status, expected: 200, pass: correctOk });
    console.log(`  - [${correctOk ? 'PASS' : 'FAIL'}] Valid Credentials Login | Status: ${correctLogin.status} (Expected: 200)`);
  }

  // 5. Concurrency Stress Test
  console.log('\n[5/5] Running Concurrent Load & Latency Stress Test...');
  const CONCURRENCY = 50;
  console.log(`Sending ${CONCURRENCY} concurrent POST requests to /login and /register...`);

  const requests = [];
  const startTime = Date.now();

  for (let i = 0; i < CONCURRENCY; i++) {
    if (i % 2 === 0) {
      // Register request
      requests.push(makeRequest('/register', 'POST', {
        username: `load_user_${timestamp}_${i}`,
        password: `password_${i}`,
        email: `load_${timestamp}_${i}@example.com`
      }));
    } else {
      // Login request
      requests.push(makeRequest('/login', 'POST', {
        username: baseUser.username,
        password: baseUser.password
      }));
    }
  }

  const responses = await Promise.all(requests);
  const totalDuration = Date.now() - startTime;

  const latencies = responses.map(r => r.duration).sort((a, b) => a - b);
  const totalLatencies = latencies.reduce((acc, l) => acc + l, 0);
  const avgLatency = (totalLatencies / latencies.length).toFixed(2);
  const minLatency = latencies[0];
  const maxLatency = latencies[latencies.length - 1];
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
  const throughput = ((CONCURRENCY / totalDuration) * 1000).toFixed(2);

  const statusCounts = {};
  responses.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });

  const successCount = (statusCounts[200] || 0) + (statusCounts[201] || 0);

  results.concurrencyTest = {
    totalRequests: CONCURRENCY,
    totalTimeMs: totalDuration,
    throughputRps: parseFloat(throughput),
    avgLatencyMs: parseFloat(avgLatency),
    minLatencyMs: minLatency,
    maxLatencyMs: maxLatency,
    p95LatencyMs: p95Latency,
    statusCounts,
    successRatePct: parseFloat(((successCount / CONCURRENCY) * 100).toFixed(2))
  };

  console.log(`  - Total Requests: ${CONCURRENCY}`);
  console.log(`  - Total Time: ${totalDuration} ms`);
  console.log(`  - Throughput: ${throughput} req/sec`);
  console.log(`  - Average Latency: ${avgLatency} ms`);
  console.log(`  - Min/Max Latency: ${minLatency} ms / ${maxLatency} ms`);
  console.log(`  - P95 Latency: ${p95Latency} ms`);
  console.log(`  - Status Breakdown:`, statusCounts);
  console.log(`  - Success Rate: ${results.concurrencyTest.successRatePct}%`);

  console.log('\n====================================================');
  console.log('Stress Test Execution Completed.');
  console.log('====================================================\n');

  console.log(JSON.stringify(results, null, 2));
}

runTests().catch(err => {
  console.error('Fatal Error during stress test:', err);
});
