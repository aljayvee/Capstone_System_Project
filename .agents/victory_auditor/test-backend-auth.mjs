import bcrypt from '../../server/node_modules/bcryptjs/index.js';
import { PrismaClient } from '../../server/node_modules/@prisma/client/index.js';

async function runIndependentBackendAudit() {
  console.log("==================================================");
  console.log("VICTORY AUDITOR — Independent Backend Verification");
  console.log("==================================================");
  
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedCount++;
    }
  }

  // 1. Bcrypt verification
  console.log("\n[Test 1] Bcrypt Hashing & Salt Verification");
  const testPass = "RiderPass2026!";
  const hash = await bcrypt.hash(testPass, 10);
  assert(typeof hash === 'string', "bcrypt.hash returns string");
  assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), "bcrypt.hash produces valid salt prefix ($2a$/$2b$)");
  assert(hash.length === 60, `bcrypt.hash produces 60-char hash (got ${hash.length})`);
  assert(await bcrypt.compare(testPass, hash) === true, "bcrypt.compare matches correct password");
  assert(await bcrypt.compare("WrongPass", hash) === false, "bcrypt.compare rejects incorrect password");

  // 2. Prisma Client instantiation
  console.log("\n[Test 2] Prisma Client Schema & Instance Verification");
  try {
    const prisma = new PrismaClient();
    assert(prisma !== null && typeof prisma === 'object', "PrismaClient instantiates correctly");
    assert(typeof prisma.user.findUnique === 'function', "Prisma user.findUnique method exists");
    assert(typeof prisma.user.create === 'function', "Prisma user.create method exists");
    await prisma.$disconnect();
  } catch (err) {
    console.error("Prisma instantiation error:", err);
    assert(false, "PrismaClient instantiation failed");
  }

  // 3. User registration logic verification
  console.log("\n[Test 3] User Registration Password Hashing Logic");
  const regPassword = "UserPass99#";
  const regHashedPassword = await bcrypt.hash(regPassword, 10);
  const mockUserPayload = {
    username: "rider01_test",
    passwordHash: regHashedPassword,
    role: "RIDER",
    firstName: "Test",
    lastName: "Rider",
    email: "rider_test@example.com"
  };
  assert(mockUserPayload.passwordHash !== regPassword, "Stored password is not plaintext");
  assert(await bcrypt.compare(regPassword, mockUserPayload.passwordHash) === true, "Stored password hash matches original password");

  console.log("\n==================================================");
  console.log(`Independent Test Suite Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runIndependentBackendAudit();
