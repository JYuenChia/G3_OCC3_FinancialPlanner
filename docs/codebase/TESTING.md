# Testing & Quality Assurance

## Core Sections (Required)

### 1) Test Infrastructure

| Aspect | Status | Details | Evidence |
|--------|--------|---------|----------|
| Test runner | [TODO] None configured | backend/package.json: `"test": "echo 'No tests configured'"` | backend/package.json |
| Unit testing framework | [TODO] Not configured | Candidates: Jest, Mocha, Vitest | N/A |
| Integration testing framework | [TODO] Not configured | Candidates: Jest + supertest, Mocha + chai | N/A |
| Test file location | [TODO] Not defined | Typically `tests/`, `__tests__/`, or `.test.js` suffix | N/A |
| Test coverage tracking | [TODO] Not configured | No coverage thresholds or reports | N/A |
| E2E testing framework | [TODO] Not configured | Candidates: Playwright, Cypress | N/A |

### 2) Current Testing Gaps

#### Backend
- **No unit tests** for repositories (data access)
- **No integration tests** for routes (HTTP handlers + MongoDB)
- **No validation tests** for Zod schemas
- **No auth tests** (JWT token generation, expiration, revocation)
- **No error case coverage** (400, 401, 409, 500 responses)

#### Frontend
- **No component tests** for HTML pages
- **No integration tests** for api-client.js
- **No mocking** of fetch API
- **No tests** for auth flow (login → token refresh → logout)

### 3) Manual Testing Checklist

#### Backend (Postman / curl)

**Auth Endpoints:**
- [ ] `POST /api/auth/register` — Create new user
  - Valid email/password → 201 + tokens
  - Email already in use → 409
  - Invalid email format → 400
  - Password too short → 400
- [ ] `POST /api/auth/login` — User login
  - Valid credentials → 200 + tokens
  - Invalid password → 401
  - Non-existent user → 401
- [ ] `POST /api/auth/logout` — Logout (requires token)
  - Valid token + refresh token → 200, token blacklisted
  - Expired token → 401
  - Missing token → 401
- [ ] `POST /api/auth/refresh` — Refresh access token
  - Valid refresh token → 200 + new access token
  - Revoked refresh token → 401
  - Expired refresh token → 401

**User Endpoints (require auth):**
- [ ] `GET /api/user/profile` — Get user profile
  - With valid token → 200 + user data
  - Without token → 401
- [ ] `PUT /api/user/profile` — Update profile
  - Valid changes → 200
  - Invalid email → 400
- [ ] `PATCH /api/user/password` — Change password
  - Correct current password → 200
  - Incorrect current password → 401
- [ ] `DELETE /api/user/account` — Delete account
  - Valid request → 200, user deleted

**Goals Endpoints (require auth):**
- [ ] `GET /api/goals` — List user's goals
  - Auth user → 200 + goals array
- [ ] `POST /api/goals` — Create goal
  - Valid goal → 201 + goal data
  - Missing required fields → 400
- [ ] `PUT /api/goals/:id` — Update goal
  - Own goal → 200
  - Someone else's goal → 403 (forbidden)
- [ ] `DELETE /api/goals/:id` — Delete goal
  - Own goal → 200
  - Someone else's goal → 403

**Calculator Endpoints (require auth):**
- [ ] `POST /api/calculator/roi` — Calculate ROI
- [ ] `POST /api/calculator/compare` — Compare investments
- [ ] `GET /api/calculator/calculations` — Get saved calculations
- [ ] `POST /api/calculator/calculations` — Save calculation
- [ ] `DELETE /api/calculator/calculations/:id` — Delete calculation
- [ ] `DELETE /api/calculator/calculations` — Clear all calculations

#### Frontend (Manual Browser Testing)

**Authentication Flow:**
- [ ] Register: form → success → redirect to login
- [ ] Login: form → success → redirect to home, nav shows user links
- [ ] Auto-refresh: token expires → auto-fetches new token → user continues working
- [ ] Logout: button → logout → redirect to login
- [ ] Session persistence: refresh page → token restored from localStorage

**Protected Routes:**
- [ ] Unauthenticated user accessing /goals.html → redirect to login
- [ ] Authenticated user accessing /login.html → redirect to home

**CRUD Operations:**
- [ ] Goals: create, read, update, delete
- [ ] Calculator: save calculation, view history, delete
- [ ] User profile: view, update, change password, delete account

### 4) Security Testing

#### Known Issues (See CONCERNS.md)
- [ ] XSS vulnerabilities in frontend DOM operations (partly mitigated by dom-utils.js)
- [ ] CORS too permissive (allows all origins)
- [ ] MongoDB credentials in git (.env file committed)
- [ ] No rate limiting (brute force auth possible)

#### Recommended Security Tests
- [ ] SQL/NoSQL injection attempts (MongoDB injection)
- [ ] Token tamper tests (modify JWT payload)
- [ ] Expired token handling
- [ ] CORS origin validation
- [ ] Password requirements enforcement

### 5) Performance Testing

#### Current State
- No load testing configured
- No performance benchmarks

#### Candidates to Monitor
- JWT verification time (should be ~1ms)
- MongoDB query times for listing goals
- Token refresh response time under load

### 6) Evidence

- backend/package.json (test script)
- Scan output: "No performance testing configs detected"
- No test files found in directory tree

## Extended Sections (Optional)

### Suggested Test Coverage Priorities

**High Priority (Security & Core Logic):**
1. Auth routes (register, login, logout, refresh)
2. Authorization middleware (requireAuth, requireAdmin)
3. Token revocation logic
4. Goal ownership checks (users can only see their own goals)

**Medium Priority (Business Logic):**
1. Calculator ROI endpoint
2. Goal CRUD operations
3. Password update validation

**Low Priority (Infrastructure):**
1. Health check endpoint
2. CORS middleware
3. Error handling consistency

### Integration Test Example (Pseudo-code with Jest + Supertest)

```javascript
// Example structure (not yet implemented)
describe('POST /api/auth/register', () => {
  it('should create user and return tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!' });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.refresh_token).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await createUser({ email: 'test@example.com' });
    
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!' });
    
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /api/goals (Auth required)', () => {
  it('should create goal for authenticated user', async () => {
    const token = await generateValidToken();
    
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Save $10k', target_amount: 10000 });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it('should reject unauthorized access', async () => {
    const res = await request(app)
      .post('/api/goals')
      .send({ title: 'Save $10k', target_amount: 10000 });
    
    expect(res.statusCode).toBe(401);
  });
});
```

### Frontend Test Strategy (Future)

Unit test the api-client.js singleton:
- Mock fetch API
- Test auto-refresh on 401
- Test token storage/retrieval
- Test error handling

DOM testing for form validation (consider Vitest + jsdom).

### CI/CD Integration (Future)

Recommended:
1. GitHub Actions workflow
2. Run tests on push/PR
3. Coverage reporting
4. Fail on coverage drop below 80%
