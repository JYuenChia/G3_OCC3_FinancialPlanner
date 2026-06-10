jest.mock("uuid", () => ({
  v4: jest.fn(() => "mocked-uuid"),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("../repositories/user.repository", () => ({
  createUser: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock("../repositories/goals.repository", () => ({
  createGoal: jest.fn(),
  deleteGoal: jest.fn(),
  findById: jest.fn(),
  listGoals: jest.fn(),
  updateGoal: jest.fn(),
}));

jest.mock("../repositories/calculations.repository", () => ({
  createCalculation: jest.fn(),
  deleteAllCalculations: jest.fn(),
  deleteCalculation: jest.fn(),
  findById: jest.fn(),
  listCalculations: jest.fn(),
}));

jest.mock("../repositories/revoked-token.repository", () => ({
  isTokenRevoked: jest.fn(),
  revokeToken: jest.fn(),
}));

jest.mock("../utils/rapid-api-client", () => ({
  getLiveTrendingTickers: jest.fn(),
  getStockPrice: jest.fn(),
  getStockTrend: jest.fn(),
  getFinancialNews: jest.fn(),
  getMultipleStockPrices: jest.fn(),
  prefetchTrendingData: jest.fn(),
}));

jest.mock("../utils/cache-manager", () => ({
  getAge: jest.fn(() => "cached"),
}));

const express = require("express");
const request = require("supertest");
const bcrypt = require("bcryptjs");

const apiRoutes = require("../routes");
const { signAccessToken, signRefreshToken } = require("../utils/auth.util");

const userRepository = require("../repositories/user.repository");
const goalsRepository = require("../repositories/goals.repository");
const calculationsRepository = require("../repositories/calculations.repository");
const revokedTokenRepository = require("../repositories/revoked-token.repository");
const rapidApiClient = require("../utils/rapid-api-client");
const cacheManager = require("../utils/cache-manager");

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", apiRoutes);
  return app;
}

function buildUser(overrides = {}) {
  return {
    _id: "user-123",
    email: "test@example.com",
    password_hash: "hashed-password",
    full_name: "Test User",
    role: "user",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function buildGoal(overrides = {}) {
  return {
    _id: "goal-123",
    user_id: "user-123",
    title: "Emergency Fund",
    target_amount: 10000,
    current_amount: 1500,
    target_date: new Date("2032-12-31T00:00:00.000Z"),
    priority: "Need",
    risk_appetite: 3,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function buildCalculation(overrides = {}) {
  return {
    _id: "calc-123",
    user_id: "user-123",
    title: "House Savings",
    initial: 10000,
    rate_percent: 5,
    years: 10,
    final_amount: 16288.95,
    profit: 6288.95,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function authHeaders(userId = "user-123", role = "user") {
  return {
    Authorization: `Bearer ${signAccessToken(userId, role)}`,
  };
}

describe("Functional API Tests", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue("hashed-password");
    bcrypt.compare.mockResolvedValue(true);
    revokedTokenRepository.isTokenRevoked.mockResolvedValue(false);
    revokedTokenRepository.revokeToken.mockResolvedValue({});
    cacheManager.getAge.mockReturnValue("cached");
  });

  describe("Auth / Login", () => {
    test("FT-AUTH-01 registers a new user", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.createUser.mockResolvedValue(buildUser());

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "Password123!",
          full_name: "Test User",
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(userRepository.createUser).toHaveBeenCalledTimes(1);
    });

    test("FT-AUTH-02 rejects duplicate registration", async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser());

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "Password123!",
          full_name: "Test User",
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe("Email already in use");
    });

    test("FT-AUTH-03 logs in a valid user", async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser());

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "Password123!",
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
    });

    test("FT-AUTH-04 rejects invalid login credentials", async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser());
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "WrongPassword!",
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });

    test("FT-AUTH-05 refreshes an access token", async () => {
      const refreshToken = signRefreshToken("user-123");
      userRepository.findById.mockResolvedValue(buildUser());

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(userRepository.findById).toHaveBeenCalledWith("user-123");
    });

    test("FT-AUTH-06 logs out an authenticated user", async () => {
      const refreshToken = signRefreshToken("user-123");

      const response = await request(app)
        .post("/api/auth/logout")
        .set(authHeaders())
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("logged_out");
      expect(revokedTokenRepository.revokeToken).toHaveBeenCalled();
    });
  });

  describe("User Profile", () => {
    test("FT-USER-01 returns the signed-in user profile", async () => {
      userRepository.findById.mockResolvedValue(buildUser());

      const response = await request(app)
        .get("/api/user/profile")
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe("test@example.com");
    });

    test("FT-USER-02 updates the profile", async () => {
      userRepository.findById.mockResolvedValue(buildUser());
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.updateProfile.mockResolvedValue(
        buildUser({ email: "updated@example.com", full_name: "Updated Name" }),
      );

      const response = await request(app)
        .put("/api/user/profile")
        .set(authHeaders())
        .send({ email: "updated@example.com", full_name: "Updated Name" });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe("updated@example.com");
      expect(userRepository.updateProfile).toHaveBeenCalledWith(
        "user-123",
        "updated@example.com",
        "Updated Name",
      );
    });

    test("FT-USER-03 changes the password", async () => {
      userRepository.findById.mockResolvedValue(buildUser());

      const response = await request(app)
        .patch("/api/user/password")
        .set(authHeaders())
        .send({
          current_password: "Password123!",
          new_password: "NewPassword123!",
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("password_updated");
      expect(userRepository.updatePassword).toHaveBeenCalledWith(
        "user-123",
        "hashed-password",
      );
    });

    test("FT-USER-04 rejects password change with wrong current password", async () => {
      userRepository.findById.mockResolvedValue(buildUser());
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .patch("/api/user/password")
        .set(authHeaders())
        .send({
          current_password: "WrongCurrentPassword!",
          new_password: "NewPassword123!",
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Current password is incorrect");
    });
  });

  describe("Goals", () => {
    test("FT-GOAL-01 lists goals for the current user", async () => {
      goalsRepository.listGoals.mockResolvedValue([buildGoal()]);

      const response = await request(app)
        .get("/api/goals")
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    test("FT-GOAL-02 creates a goal", async () => {
      goalsRepository.createGoal.mockResolvedValue(buildGoal());

      const response = await request(app)
        .post("/api/goals")
        .set(authHeaders())
        .send({
          title: "Emergency Fund",
          target_amount: 10000,
          current_amount: 1500,
          target_date: "2027-12-31",
          risk_appetite: 3,
          priority: "Need",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe("Emergency Fund");
      expect(goalsRepository.createGoal).toHaveBeenCalledTimes(1);
    });

    test("FT-GOAL-03 updates an owned goal", async () => {
      goalsRepository.findById.mockResolvedValue(buildGoal());
      goalsRepository.updateGoal.mockResolvedValue(
        buildGoal({ title: "Updated Goal", target_amount: 12000 }),
      );

      const response = await request(app)
        .put("/api/goals/goal-123")
        .set(authHeaders())
        .send({ title: "Updated Goal", target_amount: 12000 });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Updated Goal");
    });

    test("FT-GOAL-04 rejects access to another user's goal", async () => {
      goalsRepository.findById.mockResolvedValue(buildGoal({ user_id: "other-user" }));

      const response = await request(app)
        .get("/api/goals/goal-123")
        .set(authHeaders());

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Forbidden");
    });

    test("FT-GOAL-05 deletes an owned goal", async () => {
      goalsRepository.findById.mockResolvedValue(buildGoal());
      goalsRepository.deleteGoal.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app)
        .delete("/api/goals/goal-123")
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Goal deleted successfully");
    });
  });

  describe("Calculator", () => {
    test("FT-CALC-01 saves a calculation", async () => {
      calculationsRepository.createCalculation.mockResolvedValue(buildCalculation());

      const response = await request(app)
        .post("/api/calculations")
        .set(authHeaders())
        .send({
          title: "House Savings",
          calculation: {
            initial: 10000,
            ratePercent: 5,
            years: 10,
            finalAmount: 16288.95,
            roi: 6288.95,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.calculation.title).toBe("House Savings");
    });

    test("FT-CALC-02 lists saved calculations", async () => {
      calculationsRepository.listCalculations.mockResolvedValue([
        buildCalculation(),
      ]);

      const response = await request(app)
        .get("/api/calculations")
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.calculations).toHaveLength(1);
    });

    test("FT-CALC-03 deletes a calculation", async () => {
      calculationsRepository.findById.mockResolvedValue({
        _id: "calc-123",
        user_id: "user-123",
      });
      calculationsRepository.deleteCalculation.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app)
        .delete("/api/calculations/calc-123")
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Calculation deleted");
    });

    test("FT-CALC-04 clears all calculations", async () => {
      calculationsRepository.deleteAllCalculations.mockResolvedValue({ deletedCount: 2 });

      const response = await request(app)
        .delete("/api/calculations")
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("All calculations cleared");
    });
  });

  describe("Market Insights", () => {
    test("FT-MARKET-01 returns trending tickers", async () => {
      rapidApiClient.getLiveTrendingTickers.mockResolvedValue([
        { symbol: "AAPL", price: 210 },
      ]);

      const response = await request(app).get("/api/market/ticker/trending");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].symbol).toBe("AAPL");
    });

    test("FT-MARKET-02 returns a specific ticker quote", async () => {
      rapidApiClient.getStockPrice.mockResolvedValue({
        symbol: "AAPL",
        price: 210,
        longName: "Apple Inc.",
      });

      const response = await request(app).get("/api/market/ticker/aapl");

      expect(response.status).toBe(200);
      expect(response.body.data.symbol).toBe("AAPL");
      expect(response.body.cacheAge).toBe("cached");
    });

    test("FT-MARKET-03 returns market news", async () => {
      rapidApiClient.getFinancialNews.mockResolvedValue({
        articles: [{ title: "Market up" }],
      });

      const response = await request(app).get("/api/market/news?query=stocks&limit=5");

      expect(response.status).toBe(200);
      expect(response.body.data.articles).toHaveLength(1);
    });
  });

  describe("Recommendations", () => {
    test("FT-REC-01 returns goal recommendations", async () => {
      goalsRepository.findById.mockResolvedValue(buildGoal());

      const response = await request(app)
        .get("/api/recommendations/goal-123")
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.goalId).toBe("goal-123");
      expect(response.body.selectedStrategy).toBeDefined();
    });

    test("FT-REC-02 compares strategies for a goal", async () => {
      goalsRepository.findById.mockResolvedValue(buildGoal());

      const response = await request(app)
        .post("/api/strategies/compare")
        .set(authHeaders())
        .send({ goal_id: "goal-123" });

      expect(response.status).toBe(200);
      expect(response.body.strategies.aggressive).toBeDefined();
      expect(response.body.strategies.balanced).toBeDefined();
      expect(response.body.strategies.conservative).toBeDefined();
    });
  });
});
