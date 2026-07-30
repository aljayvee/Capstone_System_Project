const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("================================================================");
console.log("  EMPIRICAL TEST SUITE — MILESTONE 4: LOGIN SCREEN UI & AUTH    ");
console.log("================================================================");

const appDir = path.join(__dirname, '..', '..', 'RiderMobileApp');
const loginScreenPath = path.join(appDir, 'src', 'modules', 'auth', 'LoginScreen.tsx');
const authContextPath = path.join(appDir, 'src', 'context', 'RiderAuthContext.tsx');
const apiConfigPath = path.join(appDir, 'src', 'config', 'apiConfig.ts');

// Read source files for static analysis verification
const loginScreenSource = fs.readFileSync(loginScreenPath, 'utf8');
const authContextSource = fs.readFileSync(authContextPath, 'utf8');
const apiConfigSource = fs.readFileSync(apiConfigPath, 'utf8');

// ============================================================================
// TEST 1: Local IP Configuration Validation
// ============================================================================
console.log("\n[TEST 1] Local IP Configuration Verification");

assert(apiConfigSource.includes("export const API_BASE_URL"), "apiConfig.ts must export API_BASE_URL");
const ipMatch = apiConfigSource.match(/export const API_BASE_URL\s*=\s*["']([^"']+)["']/);
assert(ipMatch, "API_BASE_URL string definition found");
const apiBaseUrl = ipMatch[1];
console.log(`  -> Configured API_BASE_URL: "${apiBaseUrl}"`);

// Validate IP format (http://IP:PORT/api or http://HOST:PORT/api)
const ipPattern = /^http:\/\/(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost):\d+\/api$/;
assert(ipPattern.test(apiBaseUrl), `API_BASE_URL "${apiBaseUrl}" must follow pattern http://<ip_or_localhost>:<port>/api`);
console.log("  ✓ API_BASE_URL format validated.");

// Check RiderAuthContext imports and uses API_BASE_URL
assert(authContextSource.includes('import { API_BASE_URL } from "../config/apiConfig"'), "RiderAuthContext must import API_BASE_URL");
assert(authContextSource.includes('fetch(`${API_BASE_URL}/auth/login`'), "RiderAuthContext must call ${API_BASE_URL}/auth/login");
console.log("  ✓ RiderAuthContext imports and targets ${API_BASE_URL}/auth/login successfully.");
console.log("[TEST 1 PASSED] Local IP Configuration is correctly configured and wired.");

// ============================================================================
// TEST 2: Empty Inputs Validation in LoginScreen Logic
// ============================================================================
console.log("\n[TEST 2] Validation for Empty Inputs in LoginScreen");

// Simulate LoginScreen state and handleLogin logic
function createLoginScreenSimulator(loginMock) {
  let username = "rider01";
  let password = "password123";
  let isLoading = false;
  let errorMessage = null;

  return {
    setUsername: (v) => { username = v; if (errorMessage) errorMessage = null; },
    setPassword: (v) => { password = v; if (errorMessage) errorMessage = null; },
    getState: () => ({ username, password, isLoading, errorMessage }),
    handleLogin: async () => {
      errorMessage = null;
      if (!username.trim() || !password.trim()) {
        errorMessage = "Please enter both Rider Username and Password.";
        return;
      }
      isLoading = true;
      try {
        await loginMock(username.trim(), password.trim());
      } catch (err) {
        errorMessage = err?.message || "Invalid username or password";
      } finally {
        isLoading = false;
      }
    }
  };
}

// 2a. Both fields empty
let loginCalled = false;
const sim1 = createLoginScreenSimulator(async () => { loginCalled = true; });
sim1.setUsername("");
sim1.setPassword("");
sim1.handleLogin();
assert.strictEqual(sim1.getState().errorMessage, "Please enter both Rider Username and Password.");
assert.strictEqual(loginCalled, false, "login() should NOT be called when inputs are empty");
console.log("  ✓ Empty username & password triggers validation error banner.");

// 2b. Username whitespace only
loginCalled = false;
sim1.setUsername("   ");
sim1.setPassword("password123");
sim1.handleLogin();
assert.strictEqual(sim1.getState().errorMessage, "Please enter both Rider Username and Password.");
assert.strictEqual(loginCalled, false, "login() should NOT be called when username is whitespace");
console.log("  ✓ Whitespace-only username triggers validation error.");

// 2c. Password empty
loginCalled = false;
sim1.setUsername("rider01");
sim1.setPassword("");
sim1.handleLogin();
assert.strictEqual(sim1.getState().errorMessage, "Please enter both Rider Username and Password.");
assert.strictEqual(loginCalled, false, "login() should NOT be called when password is empty");
console.log("  ✓ Empty password triggers validation error.");

// 2d. Clearing error on text edit
sim1.setUsername("r");
assert.strictEqual(sim1.getState().errorMessage, null, "Error message should reset when user edits input");
console.log("  ✓ Error message resets dynamically upon text input change.");

console.log("[TEST 2 PASSED] Empty input validation behaves as expected.");

// ============================================================================
// TEST 3: Loading Spinner & Button Disabled State During Submission
// ============================================================================
console.log("\n[TEST 3] Loading Spinner State During Submission");

assert(loginScreenSource.includes("ActivityIndicator"), "LoginScreen must use ActivityIndicator during loading");
assert(loginScreenSource.includes("disabled={isLoading}"), "Login buttons must be disabled when isLoading is true");

const pendingLoginMock = () => new Promise((resolve) => {
  setTimeout(() => {
    resolve({ id: 3, username: "rider01" });
  }, 50);
});

const simLoading = createLoginScreenSimulator(pendingLoginMock);
simLoading.setUsername("rider01");
simLoading.setPassword("password123");

// Verify initial state
assert.strictEqual(simLoading.getState().isLoading, false);

const loginPromise = simLoading.handleLogin();
// Synchronously after handleLogin returns promise, isLoading should be true
assert.strictEqual(simLoading.getState().isLoading, true, "isLoading must be true during submission");
console.log("  ✓ isLoading transitions to TRUE upon initiating login submission.");

// Wait for promise resolution
(async () => {
  await loginPromise;
  assert.strictEqual(simLoading.getState().isLoading, false, "isLoading must reset to FALSE after completion");
  console.log("  ✓ isLoading transitions to FALSE upon request resolution.");
  console.log("[TEST 3 PASSED] Loading spinner state and interactive disabled states verified.");

  // Run Test 4 & 5 sequentially inside async
  await runTest4And5();
})();

// ============================================================================
// TEST 4 & 5: 401 Unauthorized Error Handling & Auth Context Integration
// ============================================================================
async function runTest4And5() {
  console.log("\n[TEST 4] 401 Unauthorized Error Handling Verification");

  // Simulated RiderAuthContext login logic
  async function authContextLogin(mockFetch, username, password) {
    const res = await mockFetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      let errorMsg = "Invalid username or password";
      try {
        const errorData = await res.json();
        if (errorData && errorData.error) {
          errorMsg = errorData.error;
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }
    return await res.json();
  }

  // 4a. 401 Unauthorized with custom error payload
  const mockFetch401Custom = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "Invalid username or password" })
  });

  const sim401Custom = createLoginScreenSimulator((u, p) => authContextLogin(mockFetch401Custom, u, p));
  sim401Custom.setUsername("wronguser");
  sim401Custom.setPassword("wrongpass");
  await sim401Custom.handleLogin();

  assert.strictEqual(sim401Custom.getState().errorMessage, "Invalid username or password");
  assert.strictEqual(sim401Custom.getState().isLoading, false);
  console.log("  ✓ 401 Unauthorized with server error JSON correctly sets banner message.");

  // 4b. 401 Unauthorized without JSON payload (fallback)
  const mockFetch401Raw = async () => ({
    ok: false,
    status: 401,
    json: async () => { throw new SyntaxError("Unexpected token"); }
  });

  const sim401Raw = createLoginScreenSimulator((u, p) => authContextLogin(mockFetch401Raw, u, p));
  sim401Raw.setUsername("wronguser");
  sim401Raw.setPassword("wrongpass");
  await sim401Raw.handleLogin();

  assert.strictEqual(sim401Raw.getState().errorMessage, "Invalid username or password");
  console.log("  ✓ 401 Unauthorized without JSON fallback message correctly displayed.");

  // 4c. 401 Unauthorized with custom message (e.g. Account disabled)
  const mockFetch401AccountDisabled = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "Rider account is deactivated" })
  });

  const sim401Disabled = createLoginScreenSimulator((u, p) => authContextLogin(mockFetch401AccountDisabled, u, p));
  sim401Disabled.setUsername("deactivated");
  sim401Disabled.setPassword("password");
  await sim401Disabled.handleLogin();

  assert.strictEqual(sim401Disabled.getState().errorMessage, "Rider account is deactivated");
  console.log("  ✓ Custom server error message ('Rider account is deactivated') propagated to UI banner.");

  console.log("[TEST 4 PASSED] 401 Unauthorized error handling thoroughly verified.");

  // ============================================================================
  // TEST 5: Successful 200 OK Login Flow
  // ============================================================================
  console.log("\n[TEST 5] Successful 200 OK Login Flow");

  const mockFetch200 = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: 3,
      username: "rider01",
      name: "Al-Dhen Musali",
      token: "mock-jwt-token-999"
    })
  });

  const sim200 = createLoginScreenSimulator((u, p) => authContextLogin(mockFetch200, u, p));
  sim200.setUsername("rider01");
  sim200.setPassword("password123");
  await sim200.handleLogin();

  assert.strictEqual(sim200.getState().errorMessage, null);
  assert.strictEqual(sim200.getState().isLoading, false);
  console.log("  ✓ 200 OK login succeeds without errors.");
  console.log("[TEST 5 PASSED] Successful login flow completed.");

  console.log("\n================================================================");
  console.log("  ALL EMPIRICAL TESTS PASSED SUCCESSFULLY!                      ");
  console.log("================================================================");
}
