import bcrypt from 'bcryptjs';
import express from 'express';
import dotenv from 'dotenv';

// Comprehensive Edge Case & Stress Test Generator for Backend Auth API
// Author: Challenger 1 (Milestone 1)

async function runTestSuite() {
  console.log("================================================================================");
  console.log("CHALLENGER 1: BACKEND AUTH API EMPIRICAL VERIFICATION & STRESS TEST HARNESS");
  console.log("================================================================================\n");

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    findings: []
  };

  function assert(testName, passed, description, details = "") {
    results.total++;
    if (passed) {
      results.passed++;
      console.log(`[PASS] Test ${results.total}: ${testName}`);
    } else {
      results.failed++;
      console.log(`[FAIL] Test ${results.total}: ${testName}`);
      console.log(`       Description: ${description}`);
      if (details) console.log(`       Details: ${details}`);
      results.findings.push({ testName, description, details });
    }
  }

  // --------------------------------------------------------------------------
  // 1. Bcrypt Password Hashing & Special Characters Test Matrix
  // --------------------------------------------------------------------------
  console.log("--- 1. BCRYPT HASHING & SPECIAL CHARACTER ORACLE TESTS ---");

  const testPasswords = [
    { name: "Standard Alphanumeric", pass: "owner123" },
    { name: "Complex Special Chars", pass: "P@ssw0rd!#$&*()_+~|}{[]:;?<>,./" },
    { name: "Unicode & Emojis", pass: "Password🔑🚀✨123" },
    { name: "Spaces in Password", pass: "  pass word 123  " },
    { name: "Long Password (72+ chars)", pass: "A".repeat(100) },
    { name: "Newlines & Tabs", pass: "Line1\nLine2\tTabbed" },
  ];

  for (const item of testPasswords) {
    try {
      const hash = await bcrypt.hash(item.pass, 10);
      const isMatch = await bcrypt.compare(item.pass, hash);
      const isWrongMatch = await bcrypt.compare(item.pass + "_wrong", hash);

      assert(
        `Bcrypt Hashing: ${item.name}`,
        isMatch === true && isWrongMatch === false,
        `Verifies bcrypt accurately hashes and compares '${item.name}'`,
        `Pass length: ${item.pass.length}`
      );
    } catch (err) {
      assert(
        `Bcrypt Hashing: ${item.name}`,
        false,
        `Bcrypt threw an error for '${item.name}'`,
        err.message
      );
    }
  }

  // --------------------------------------------------------------------------
  // 2. Express Auth Handler Empirical Logic & Edge Case Simulation
  // --------------------------------------------------------------------------
  console.log("\n--- 2. EXPRESS / API HANDLER INPUT VALIDATION MATRIX ---");

  // Mock Prisma client behavior simulating server/src/index.ts
  const mockDatabase = [
    {
      id: 1,
      username: "owner",
      passwordHash: await bcrypt.hash("owner123", 10),
      role: "OWNER",
      firstName: "Aljayvee",
      lastName: "Versola",
      email: "aj.versola@company.ph",
      phone: "09171234567"
    }
  ];

  // Exact reproduction of app.post("/api/auth/login") from src/index.ts
  async function simulateAuthEndpoint(reqBody) {
    try {
      const { username, password } = reqBody;

      if (!username || !password) {
        return { status: 400, body: { error: "Username and password are required" } };
      }

      // Simulate Prisma runtime type check: findUnique expects String for username
      if (typeof username !== 'string') {
        throw new Error(`PrismaClientValidationError: Provided ${typeof username}, expected String for username field.`);
      }

      const user = mockDatabase.find(u => u.username === username);

      if (!user) {
        return { status: 401, body: { error: "Invalid username or password" } };
      }

      // Simulate bcrypt runtime type check: compare expects string data
      if (typeof password !== 'string') {
        throw new Error("TypeError: data and hash must be strings");
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return { status: 401, body: { error: "Invalid username or password" } };
      }

      const { passwordHash: _, ...sanitizedUser } = user;
      return { status: 200, body: sanitizedUser };
    } catch (err) {
      // In src/index.ts line 51: return res.status(500).json({ error: err.message });
      return { status: 500, body: { error: err.message } };
    }
  }

  // Test Suite Edge Cases
  const edgeCases = [
    {
      name: "Valid Login Credentials",
      payload: { username: "owner", password: "owner123" },
      expectedStatus: 200,
      description: "Should return 200 OK and sanitized user object without passwordHash"
    },
    {
      name: "Wrong Password",
      payload: { username: "owner", password: "wrongpassword" },
      expectedStatus: 401,
      description: "Should return 401 Unauthorized"
    },
    {
      name: "Non-Existent User",
      payload: { username: "non_existent_user_999", password: "owner123" },
      expectedStatus: 401,
      description: "Should return 401 Unauthorized"
    },
    {
      name: "Empty Payload {}",
      payload: {},
      expectedStatus: 400,
      description: "Should return 400 Bad Request"
    },
    {
      name: "Missing Password Field",
      payload: { username: "owner" },
      expectedStatus: 400,
      description: "Should return 400 Bad Request"
    },
    {
      name: "Missing Username Field",
      payload: { password: "owner123" },
      expectedStatus: 400,
      description: "Should return 400 Bad Request"
    },
    {
      name: "Empty String Password",
      payload: { username: "owner", password: "" },
      expectedStatus: 400,
      description: "Should return 400 Bad Request"
    },
    {
      name: "Numeric Username (Type Mismatch: { username: 123 })",
      payload: { username: 123, password: "owner123" },
      expectedStatus: 400, // API SHOULD return 400, but src/index.ts returns 500!
      description: "Non-string username payload should return 400 Bad Request instead of 500 Internal Error"
    },
    {
      name: "Boolean Username (Type Mismatch: { username: true })",
      payload: { username: true, password: "owner123" },
      expectedStatus: 400,
      description: "Boolean username payload should return 400 Bad Request instead of 500 Internal Error"
    },
    {
      name: "Numeric Password (Type Mismatch: { password: 12345 })",
      payload: { username: "owner", password: 12345 },
      expectedStatus: 400,
      description: "Numeric password payload should return 400 Bad Request instead of 500 Internal Error"
    },
    {
      name: "Object Username Injection ({ username: { gt: '' } })",
      payload: { username: { gt: "" }, password: "owner123" },
      expectedStatus: 400,
      description: "Object payload injection should be caught by input validation with 400 Bad Request"
    },
    {
      name: "Whitespace Only Username ('   ')",
      payload: { username: "   ", password: "owner123" },
      expectedStatus: 401,
      description: "Whitespace username should fail authentication gracefully"
    }
  ];

  for (const tc of edgeCases) {
    const res = await simulateAuthEndpoint(tc.payload);
    const pass = res.status === tc.expectedStatus;
    assert(
      `Payload Test: ${tc.name}`,
      pass,
      tc.description,
      `Expected HTTP ${tc.expectedStatus}, got HTTP ${res.status}. Response Body: ${JSON.stringify(res.body)}`
    );
  }

  // --------------------------------------------------------------------------
  // 3. Security & Architecture Audit Checks
  // --------------------------------------------------------------------------
  console.log("\n--- 3. SECURITY & ARCHITECTURE SYSTEM CHECKS ---");

  // Check 3.1: Password Hash Leakage Check
  const validRes = await simulateAuthEndpoint({ username: "owner", password: "owner123" });
  const hasPasswordHash = validRes.body.passwordHash !== undefined;
  assert(
    "Security: Sanitization of User Object",
    !hasPasswordHash,
    "Response payload MUST NOT include passwordHash",
    hasPasswordHash ? "passwordHash was exposed in response body!" : "passwordHash properly omitted"
  );

  // Check 3.2: Token/Session Generation Check
  const hasToken = validRes.body.token !== undefined || validRes.body.accessToken !== undefined;
  assert(
    "Architecture: Auth Token / JWT Generation",
    hasToken,
    "Successful login should issue an authentication token (JWT / Bearer token)",
    "No token returned in auth response! API currently returns user database record only."
  );

  // Check 3.3: Input Sanitization / String Type Guard
  const numericUserRes = await simulateAuthEndpoint({ username: 123, password: "owner123" });
  assert(
    "Security: Input Type Validation Guard",
    numericUserRes.status === 400,
    "Auth endpoint must validate that username and password are strings before Prisma/bcrypt queries",
    `Non-string input caused HTTP ${numericUserRes.status} with message: ${JSON.stringify(numericUserRes.body)}`
  );

  console.log("\n================================================================================");
  console.log(`SUMMARY: Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log("================================================================================");

  return results;
}

runTestSuite();
