/**
 * Empirical Network Resilience & Boundary Condition Verification Script for CustomerApp
 * 
 * Target: CustomerApp/src/config/api.ts and authentication network request handling
 * Author: Challenger 2 (teamwork_preview_challenger_m1_2)
 */

import http from 'node:http';

// Colors for terminal output
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

let testCount = 0;
let passCount = 0;
let failCount = 0;
const testResults = [];

function recordTest(suite, name, passed, details) {
  testCount++;
  if (passed) {
    passCount++;
    console.log(`  ${GREEN}✓ PASS${RESET}: [${suite}] ${name}`);
  } else {
    failCount++;
    console.log(`  ${RED}✗ FAIL${RESET}: [${suite}] ${name}`);
  }
  if (details) {
    console.log(`    ${CYAN}Details:${RESET} ${details}`);
  }
  testResults.push({ suite, name, passed, details });
}

/**
 * ----------------------------------------------------------------------
 * SUITE 1: API Configuration Verification (CustomerApp/src/config/api.ts)
 * ----------------------------------------------------------------------
 */
function runApiConfigTests() {
  console.log(`\n${BOLD}=== SUITE 1: API Configuration Verification ===${RESET}`);

  // Helper to evaluate API configuration logic cleanly
  function getApiConfig(envUrl, platformOs) {
    const processEnv = envUrl !== undefined ? { EXPO_PUBLIC_API_BASE_URL: envUrl } : {};
    const platform = { OS: platformOs };

    const API_BASE_URL =
      (processEnv.EXPO_PUBLIC_API_BASE_URL) ||
      (platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

    const ENDPOINTS = {
      LOGIN: `${API_BASE_URL}/api/auth/login`,
      REGISTER: `${API_BASE_URL}/api/users`,
      LOGIN_DIRECT: `${API_BASE_URL}/login`,
      REGISTER_DIRECT: `${API_BASE_URL}/register`,
    };

    return { API_BASE_URL, ENDPOINTS };
  }

  // 1.1 Android Default Base URL
  const androidConfig = getApiConfig(undefined, 'android');
  recordTest(
    'Config',
    'Android Default Base URL Fallback',
    androidConfig.API_BASE_URL === 'http://10.0.2.2:5000',
    `Expected 'http://10.0.2.2:5000', got '${androidConfig.API_BASE_URL}'`
  );

  // 1.2 iOS Default Base URL
  const iosConfig = getApiConfig(undefined, 'ios');
  recordTest(
    'Config',
    'iOS Default Base URL Fallback',
    iosConfig.API_BASE_URL === 'http://localhost:5000',
    `Expected 'http://localhost:5000', got '${iosConfig.API_BASE_URL}'`
  );

  // 1.3 Web Default Base URL
  const webConfig = getApiConfig(undefined, 'web');
  recordTest(
    'Config',
    'Web Default Base URL Fallback',
    webConfig.API_BASE_URL === 'http://localhost:5000',
    `Expected 'http://localhost:5000', got '${webConfig.API_BASE_URL}'`
  );

  // 1.4 Custom Environment Variable URL
  const customConfig = getApiConfig('http://api.sugoexpress.com:8080', 'android');
  recordTest(
    'Config',
    'Custom Environment Variable Override',
    customConfig.API_BASE_URL === 'http://api.sugoexpress.com:8080' &&
    customConfig.ENDPOINTS.LOGIN === 'http://api.sugoexpress.com:8080/api/auth/login',
    `Base URL: '${customConfig.API_BASE_URL}', Login: '${customConfig.ENDPOINTS.LOGIN}'`
  );

  // 1.5 Endpoint Structure Completeness
  recordTest(
    'Config',
    'Endpoint Structure Completeness',
    Boolean(iosConfig.ENDPOINTS.LOGIN && iosConfig.ENDPOINTS.REGISTER && iosConfig.ENDPOINTS.LOGIN_DIRECT && iosConfig.ENDPOINTS.REGISTER_DIRECT),
    `LOGIN=${iosConfig.ENDPOINTS.LOGIN}, REGISTER=${iosConfig.ENDPOINTS.REGISTER}`
  );

  // 1.6 Trailing Slash Vulnerability in API_BASE_URL
  const trailingSlashConfig = getApiConfig('http://localhost:5000/', 'web');
  const hasDoubleSlash = trailingSlashConfig.ENDPOINTS.LOGIN.includes('5000//api');
  recordTest(
    'Config Edge Case',
    'Trailing Slash Double-Slash Vulnerability',
    !hasDoubleSlash,
    hasDoubleSlash
      ? `FINDING: Base URL with trailing slash results in double slashes: '${trailingSlashConfig.ENDPOINTS.LOGIN}'`
      : `Normalized cleanly: '${trailingSlashConfig.ENDPOINTS.LOGIN}'`
  );
}

/**
 * ----------------------------------------------------------------------
 * SUITE 2: Special Characters in Usernames & Passwords
 * ----------------------------------------------------------------------
 */
function runSpecialCharTests() {
  console.log(`\n${BOLD}=== SUITE 2: Special Characters & Input Encoding ===${RESET}`);

  const testPayloads = [
    {
      name: 'ASCII Punctuation & Symbols',
      username: 'user_!@#$%^&*()',
      password: 'pass_+{}[]|\\:;"\'<>,.?/~`',
    },
    {
      name: 'Unicode Emojis & Non-Latin Chars',
      username: 'user_🚀_🎉_ñandú',
      password: '🔒_🔑_Passwd_123',
    },
    {
      name: 'Control Characters & Whitespace',
      username: 'user\n\r\tname',
      password: 'pass\0word',
    },
    {
      name: 'SQL Injection Vectors',
      username: "' OR '1'='1",
      password: "admin'--; DROP TABLE users;",
    },
    {
      name: 'XSS HTML Script Tags',
      username: "<script>alert('xss')</script>",
      password: "<img src=x onerror=alert(1)>",
    },
    {
      name: 'Backslashes and Double Quotes',
      username: 'user\\"name',
      password: 'pass\\\\"word',
    },
  ];

  for (const item of testPayloads) {
    try {
      const jsonString = JSON.stringify({ username: item.username, password: item.password });
      const parsed = JSON.parse(jsonString);

      const isIntact = parsed.username === item.username && parsed.password === item.password;
      recordTest(
        'Special Chars',
        `JSON Serialization: ${item.name}`,
        isIntact,
        isIntact ? 'Payload survived JSON roundtrip intact' : 'Payload corrupted during JSON roundtrip'
      );
    } catch (err) {
      recordTest('Special Chars', `JSON Serialization: ${item.name}`, false, `Threw error: ${err.message}`);
    }
  }
}

/**
 * ----------------------------------------------------------------------
 * SUITE 3: Extra Long Strings (Boundary Limits)
 * ----------------------------------------------------------------------
 */
function runLongStringTests() {
  console.log(`\n${BOLD}=== SUITE 3: Extra Long Strings (Boundary & Memory Limits) ===${RESET}`);

  const stringSizes = [
    { name: '10,000 chars username', size: 10000 },
    { name: '100,000 chars password', size: 100000 },
    { name: '1,000,000 chars payload field', size: 1000000 },
  ];

  for (const item of stringSizes) {
    const longString = 'A'.repeat(item.size);
    const start = Date.now();
    try {
      const jsonString = JSON.stringify({ username: longString, password: 'secure_password' });
      const elapsed = Date.now() - start;
      const parsed = JSON.parse(jsonString);
      const isOk = parsed.username.length === item.size;

      recordTest(
        'Boundary Limits',
        `Long String Handling (${item.name})`,
        isOk,
        `Serialized size: ${jsonString.length} bytes, stringify time: ${elapsed}ms`
      );
    } catch (err) {
      recordTest('Boundary Limits', `Long String Handling (${item.name})`, false, `Failed: ${err.message}`);
    }
  }
}

/**
 * ----------------------------------------------------------------------
 * SUITE 4, 5, 6: Network Response Resilience (500, 401, Malformed Payloads)
 * ----------------------------------------------------------------------
 */
async function runNetworkResponseTests() {
  console.log(`\n${BOLD}=== SUITE 4, 5 & 6: Network Response Resilience & HTTP Statuses ===${RESET}`);

  // Create a local mock server to simulate API responses
  let currentResponseHandler = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Default OK' }));
  };

  const server = http.createServer((req, res) => {
    currentResponseHandler(req, res);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Helper simulating CustomerApp LoginScreen/RegisterScreen response handling logic
  async function simulateCustomerAppLogin(username, password) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    // CustomerApp implementation:
    // const data = await response.json();
    // if (!response.ok) {
    //   throw new Error(data.error || 'Login failed');
    // }
    // return data;

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    return data;
  }

  // Helper simulating CustomerApp RegisterScreen response handling logic
  async function simulateCustomerAppRegister(formData) {
    const response = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, role: 'CUSTOMER' }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  }

  try {
    // 4.1 Malformed Response: Non-JSON HTML 502 Bad Gateway
    currentResponseHandler = (req, res) => {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end('<html><body>502 Bad Gateway</body></html>');
    };
    try {
      await simulateCustomerAppLogin('testuser', 'testpass');
      recordTest('Network Error', '502 HTML Payload handling', false, 'Should have thrown an error');
    } catch (err) {
      const isSyntaxError = err instanceof SyntaxError || err.message.includes('JSON') || err.message.includes('token');
      recordTest(
        'Network Error',
        '502 HTML Payload throws SyntaxError',
        isSyntaxError,
        `FINDING: CustomerApp throws SyntaxError before checking status: "${err.message}"`
      );
    }

    // 4.2 Malformed Response: Truncated JSON
    currentResponseHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"user": {"id": 1, "username": "test"'); // Truncated
    };
    try {
      await simulateCustomerAppLogin('testuser', 'testpass');
      recordTest('Network Error', 'Truncated JSON payload handling', false, 'Should have thrown JSON parse error');
    } catch (err) {
      recordTest(
        'Network Error',
        'Truncated JSON payload handling',
        true,
        `Caught expected JSON parse failure: "${err.message}"`
      );
    }

    // 4.3 Malformed Response: Empty 200 OK Body
    currentResponseHandler = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('');
    };
    try {
      await simulateCustomerAppLogin('testuser', 'testpass');
      recordTest('Network Error', 'Empty 200 OK body handling', false, 'Should have thrown error on empty JSON');
    } catch (err) {
      recordTest(
        'Network Error',
        'Empty 200 OK body handling',
        true,
        `Caught expected error on empty body: "${err.message}"`
      );
    }

    // 5.1 HTTP 500 with standard { error: "Database failure" }
    currentResponseHandler = (req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Database connection failed' }));
    };
    try {
      await simulateCustomerAppLogin('testuser', 'testpass');
      recordTest('HTTP 500', '500 Internal Error with { error } payload', false, 'Should have thrown Error');
    } catch (err) {
      const matchedMessage = err.message === 'Database connection failed';
      recordTest(
        'HTTP 500',
        '500 Internal Error with { error } payload',
        matchedMessage,
        `Extracted error message: "${err.message}"`
      );
    }

    // 5.2 HTTP 500 with alternative message property { message: "Internal server error" }
    currentResponseHandler = (req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Internal server error' }));
    };
    try {
      await simulateCustomerAppLogin('testuser', 'testpass');
      recordTest('HTTP 500', '500 Internal Error with { message } payload', false, 'Should have thrown Error');
    } catch (err) {
      const isGenericFallback = err.message === 'Login failed';
      recordTest(
        'HTTP 500 Degradation',
        '500 Internal Error message extraction fallback',
        !isGenericFallback,
        isGenericFallback
          ? `FINDING: Backend message '{ message: "Internal server error" }' was lost! CustomerApp fell back to generic '${err.message}' because it only checks data.error.`
          : `Extracted: "${err.message}"`
      );
    }

    // 6.1 HTTP 401 Unauthorized with standard { error: "Invalid credentials" }
    currentResponseHandler = (req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid credentials' }));
    };
    try {
      await simulateCustomerAppLogin('testuser', 'wrongpass');
      recordTest('HTTP 401', '401 Unauthorized with { error } payload', false, 'Should have thrown Error');
    } catch (err) {
      const matchedMessage = err.message === 'Invalid credentials';
      recordTest(
        'HTTP 401',
        '401 Unauthorized with { error } payload',
        matchedMessage,
        `Extracted error message: "${err.message}"`
      );
    }

    // 6.2 HTTP 401 Unauthorized with empty 401 body
    currentResponseHandler = (req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end('');
    };
    try {
      await simulateCustomerAppLogin('testuser', 'wrongpass');
      recordTest('HTTP 401', '401 Unauthorized with empty body', false, 'Should have thrown Error');
    } catch (err) {
      recordTest(
        'HTTP 401',
        '401 Unauthorized with empty body handling',
        true,
        `Caught syntax error on empty 401: "${err.message}"`
      );
    }

    // 6.3 HTTP 400 Register Duplicate User
    currentResponseHandler = (req, res) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Username already taken' }));
    };
    try {
      await simulateCustomerAppRegister({ username: 'existing', password: 'password', firstName: 'John', email: 'j@a.com' });
      recordTest('HTTP 400 Register', '400 Duplicate Username', false, 'Should have thrown Error');
    } catch (err) {
      const matched = err.message === 'Username already taken';
      recordTest(
        'HTTP 400 Register',
        '400 Duplicate Username handling',
        matched,
        `Extracted error message: "${err.message}"`
      );
    }

  } finally {
    server.close();
  }
}

async function main() {
  console.log(`${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN} CustomerApp Network Resilience & Boundary Condition Verification ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}`);

  runApiConfigTests();
  runSpecialCharTests();
  runLongStringTests();
  await runNetworkResponseTests();

  console.log(`\n${BOLD}=== SUMMARY RESULTS ===${RESET}`);
  console.log(`Total Tests Run : ${testCount}`);
  console.log(`Total Passed    : ${GREEN}${passCount}${RESET}`);
  console.log(`Total Failed    : ${failCount > 0 ? RED : GREEN}${failCount}${RESET}`);

  if (failCount > 0) {
    console.log(`\n${YELLOW}${BOLD}ATTENTION: ${failCount} tests identified edge-case vulnerabilities or error degradation!${RESET}`);
  } else {
    console.log(`\n${GREEN}${BOLD}SUCCESS: All empirical tests completed successfully.${RESET}`);
  }
}

main().catch((err) => {
  console.error('Fatal error in test execution:', err);
  process.exit(1);
});
