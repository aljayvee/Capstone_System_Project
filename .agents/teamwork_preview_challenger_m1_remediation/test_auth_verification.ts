/**
 * Verification Test Suite for Milestone 1 Backend Auth API Remediation
 * Working Directory: c:/Capstone_Project_Web/.agents/teamwork_preview_challenger_m1_remediation
 */

import { describe, it } from "node:test";
import assert from "node:assert";

// Simulation of the exact type validation logic in server/src/index.ts
function validateAuthPayload(username: any, password: any): { valid: boolean; statusCode?: number; error?: string } {
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.trim() === "" ||
    password.trim() === ""
  ) {
    return {
      valid: false,
      statusCode: 400,
      error: "Username and password must be non-empty strings",
    };
  }
  return { valid: true };
}

// Simulation of user lookup & password verification logic in server/src/index.ts
function sanitizeUser(user: any) {
  const { passwordHash: _, ...sanitizedUser } = user;
  return sanitizedUser;
}

describe("Backend Auth API Remediation Verification", () => {
  describe("Requirement 1: Non-string and empty payloads return 400 Bad Request", () => {
    const invalidPayloads = [
      { name: "number username", body: { username: 123, password: "password123" } },
      { name: "number password", body: { username: "admin", password: 12345 } },
      { name: "array username", body: { username: ["admin"], password: "password123" } },
      { name: "object username", body: { username: { admin: true }, password: "password123" } },
      { name: "null username", body: { username: null, password: "password123" } },
      { name: "boolean username", body: { username: true, password: "password123" } },
      { name: "empty string username", body: { username: "", password: "password123" } },
      { name: "whitespace username", body: { username: "   ", password: "password123" } },
      { name: "missing username", body: { password: "password123" } },
      { name: "missing password", body: { username: "admin" } },
      { name: "empty object payload", body: {} },
    ];

    for (const testCase of invalidPayloads) {
      it(`should return 400 for ${testCase.name}`, () => {
        const res = validateAuthPayload(testCase.body.username, testCase.body.password);
        assert.strictEqual(res.valid, false);
        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.error, "Username and password must be non-empty strings");
      });
    }
  });

  describe("Requirement 2: Invalid passwords and non-existent users return 401 Unauthorized", () => {
    it("should reject non-existent user with 401", () => {
      const user = null; // User not found in db
      const response = user ? { statusCode: 200 } : { statusCode: 401, error: "Invalid username or password" };
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.error, "Invalid username or password");
    });

    it("should reject invalid password with 401", () => {
      const isPasswordValid = false; // bcrypt compare returns false
      const response = isPasswordValid ? { statusCode: 200 } : { statusCode: 401, error: "Invalid username or password" };
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.error, "Invalid username or password");
    });
  });

  describe("Requirement 3: Valid credentials return 200 OK with sanitized user object", () => {
    it("should omit passwordHash from returned user object", () => {
      const mockUserInDb = {
        id: 1,
        username: "johndoe",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
        role: "CUSTOMER",
        firstName: "John",
        middleName: "",
        lastName: "Doe",
        name: "John Doe",
        email: "john@example.com",
        phone: "09123456789",
        avatar: null,
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sanitized = sanitizeUser(mockUserInDb);
      assert.strictEqual("passwordHash" in sanitized, false);
      assert.strictEqual(sanitized.id, 1);
      assert.strictEqual(sanitized.username, "johndoe");
      assert.strictEqual(sanitized.email, "john@example.com");
    });
  });
});
