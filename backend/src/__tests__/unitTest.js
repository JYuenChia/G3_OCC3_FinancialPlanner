// Mock uuid first to prevent Jest ESM parsing errors from third-party modules
jest.mock('uuid', () => ({ v4: () => '1234-5678-mocked-uuid' }));
jest.mock('../db', () => ({
  Goal: {},
  User: {},
  Calculation: {},
  RevokedToken: {},
}));

const { goalCreateSchema } = require("../schemas/goal.schema");
const recommendationsRouter = require("../routes/recommendations.routes");
const { calculationCreateSchema } = require("../schemas/calculation.schema");
const { signAccessToken, verifyAccessToken, signRefreshToken } = require("../utils/auth.util");
const { registerSchema } = require("../schemas/user.schema");
const rapidApiClient = require("../utils/rapid-api-client");
const axios = require("axios");

// Mock axios for Market tests
jest.mock("axios");

describe("Project Modules Unit Tests", () => {

  // 1. Goal Module
  describe("Module 1: Goal", () => {
    test("UT-GOAL-01: goalCreateSchema should pass for valid goal data", () => {
      const validGoal = {
        title: "Buy a Car",
        target_amount: 50000,
        current_amount: 10000,
        target_date: "2025-12-31",
        risk_appetite: 3,
      };
      const result = goalCreateSchema.safeParse(validGoal);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Buy a Car");
    });

    test("UT-GOAL-02: goalCreateSchema should fail if target_amount is negative", () => {
      const invalidGoal = {
        title: "Buy a Car",
        target_amount: -5000,
        target_date: "2025-12-31"
      };
      const result = goalCreateSchema.safeParse(invalidGoal);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Target amount must be positive");
    });

    test("UT-GOAL-03: goalCreateSchema should fail if title is missing", () => {
      const invalidGoal = { title: "", target_amount: 50000, target_date: "2025-12-31" };
      const result = goalCreateSchema.safeParse(invalidGoal);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Title is required");
    });
  });

  // 2. Recommendation Module
  describe("Module 2: Recommendation", () => {
    test("UT-REC-01: calculatePMT() should calculate correct monthly contribution for normal growth", () => {
      // RM 10000 target, RM 0 current, 5% annual return, 5 years
      const pmt = recommendationsRouter.calculatePMT(10000, 0, 0.05, 5);
      // Expected around RM 147.05
      expect(pmt).toBeCloseTo(147.04, 1);
    });

    test("UT-REC-02: calculatePMT() should return 0 if years is 0 or less", () => {
      const pmt = recommendationsRouter.calculatePMT(10000, 0, 0.05, 0);
      expect(pmt).toBe(0);
    });

    test("UT-REC-03: calculatePMT() should handle 0% annual return without Infinity error", () => {
      // 12000 target, 5 years (60 months) -> 12000/60 = 200
      const pmt = recommendationsRouter.calculatePMT(12000, 0, 0, 5);
      expect(pmt).toBe(200);
    });
  });

  // 3. Calculator Module
  describe("Module 3: Calculator", () => {
    test("UT-CALC-01: calculationCreateSchema should pass for valid calculation", () => {
      const validCalc = {
        title: "House Savings",
        initial: 10000,
        rate_percent: 5,
        years: 10,
        final_amount: 16288.95,
        profit: 6288.95
      };
      const result = calculationCreateSchema.safeParse(validCalc);
      expect(result.success).toBe(true);
    });

    test("UT-CALC-02: calculationCreateSchema should fail for negative initial amount", () => {
      const invalidCalc = { title: "House", initial: -100, rate_percent: 5, years: 10, final_amount: 0, profit: 0 };
      const result = calculationCreateSchema.safeParse(invalidCalc);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Too small: expected number to be >0");
    });

    test("UT-CALC-03: calculationCreateSchema should fail for missing required final_amount", () => {
      const invalidCalc = { title: "House", initial: 100, rate_percent: 5, years: 10, profit: 0 };
      const result = calculationCreateSchema.safeParse(invalidCalc);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Invalid input: expected number, received NaN");
    });
  });

  // 4. Auth Module
  describe("Module 4: Auth", () => {
    const userId = "user123";

    test("UT-AUTH-01: signAccessToken() should return a valid JWT token", () => {
      const token = signAccessToken(userId, "admin");
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    test("UT-AUTH-02: verifyAccessToken() should successfully decode the token", () => {
      const token = signAccessToken(userId, "user");
      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(userId);
      expect(decoded.role).toBe("user");
    });

    test("UT-AUTH-03: signRefreshToken() should return a valid refresh token", () => {
      const token = signRefreshToken(userId);
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });
  });

  // 5. Market Module
  describe("Module 5: Market", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      rapidApiClient.apiKey = "test_key";
    });

    test("UT-MARKET-01: _request() should return data on successful axios call", async () => {
      axios.request.mockResolvedValueOnce({ data: { success: true } });
      const result = await rapidApiClient._request("/test-endpoint");
      expect(result.success).toBe(true);
      expect(axios.request).toHaveBeenCalledTimes(1);
    });

    test("UT-MARKET-02: _request() should throw error if RAPID_API_KEY is missing", async () => {
      rapidApiClient.apiKey = null;
      await expect(rapidApiClient._request("/test-endpoint")).rejects.toThrow("RAPID_API_KEY is missing");
    });

    test("UT-MARKET-03: _request() should retry on 429 rate limit errors", async () => {
      // Mock first call failing with 429, second succeeding
      axios.request
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValueOnce({ data: { recovered: true } });

      // Delay set to 1ms for fast testing
      const result = await rapidApiClient._request("/test-endpoint", {}, 3, 1);
      expect(result.recovered).toBe(true);
      expect(axios.request).toHaveBeenCalledTimes(2);
    });
  });

  // 6. User Module
  describe("Module 6: User", () => {
    test("UT-USER-01: registerSchema should pass for valid user data", () => {
      const validUser = { email: "newuser@example.com", password: "Password123!", full_name: "John Doe" };
      const result = registerSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe("newuser@example.com");
    });

    test("UT-USER-02: registerSchema should fail for invalid email", () => {
      const invalidUser = { email: "not-an-email", password: "Password123!" };
      const result = registerSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Invalid email address");
    });

    test("UT-USER-03: registerSchema should fail if password is too short", () => {
      const invalidUser = { email: "test@example.com", password: "short" }; // min 8
      const result = registerSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Too small: expected string to have >=8 characters");
    });
  });

});
