# Known Issues, Risks & Technical Debt

## Core Sections (Required)

### 1) Critical Security Issues

#### A. MongoDB Credentials Committed to Git ⚠️ CRITICAL

**Location:** `backend/.env` (committed to repository)

```
MONGODB_URI=mongodb+srv://db_user:XLzrtWQfdyxH653E@cluster0.ic2dxk9.mongodb.net/?appName=Cluster0
```

**Risk:**
- Credentials exposed in public repository
- Attacker can directly access MongoDB
- Database compromise, data theft, ransomware

**Immediate Actions:**
1. Rotate MongoDB password in Atlas console
2. Add `.env` to `.gitignore`
3. Create `.env.example` with placeholder values
4. Rewrite git history to remove credentials (or create new repo)

**Status:** BLOCKING

#### B. CORS Allows All Origins ⚠️ HIGH

**Location:** `backend/src/server.js` line 11

```javascript
app.use(cors());  // Allows any origin
```

**Risk:**
- Any website can make requests to this API
- Enables CSRF-like attacks
- Cross-site request forgery possible if frontend is compromised

**Fix:**
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true,
}));
```

**Status:** HIGH priority

#### C. JWT Secret Not Inspected ⚠️ MEDIUM

**Location:** `backend/src/utils/auth.util.js` (referenced but not reviewed)

**Risk:**
- Secret key might be weak or hardcoded
- If weak, tokens can be forged

**Action:** Review JWT secret generation/storage. Should be:
- Strong random value (32+ bytes)
- Stored in `.env` as `JWT_SECRET`
- Never committed to git

**Status:** Needs investigation

### 2) High-Priority Issues

#### A. No Input Validation for Market/Recommendation Endpoints

**Location:** `backend/src/routes/market.routes.js`, `recommendations.routes.js`

**Issue:** All endpoints return placeholder responses

```javascript
const placeholder = (req, res) => {
  res.status(200).json({ status: "TO BE IMPLEMENTED" });
};
```

**Risk:** When implemented, these endpoints must validate:
- Ticker symbols (prevent injection)
- Date ranges
- Goal IDs (ensure user owns goal)

**Status:** Design issue before implementation

#### B. No Rate Limiting on Auth Endpoints

**Location:** `backend/src/routes/auth.routes.js`

**Risk:**
- Brute force password attacks possible
- Attacker can enumerate registered emails

**Mitigation:** Add rate limiting middleware
- Max 5 login attempts per IP per hour
- Max 3 register attempts per IP per day

**Candidates:** express-rate-limit package

**Status:** MEDIUM priority

#### C. Admin Role Bypass Risk

**Location:** `backend/src/middleware/auth.middleware.js` line 38

```javascript
function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}
```

**Risk:**
- If token payload can be forged, admin access gained
- No verification that user.role is actually "admin" in DB
- Only checks JWT claim, not DB state

**Better approach:**
```javascript
const user = await findById(req.auth.userId);
if (user.role !== "admin") {
  return res.status(403).json({ error: "Admin access required" });
}
```

**Status:** LOW priority (no admin endpoints exposed yet)

### 3) Medium-Priority Issues

#### A. Token Revocation DB Lookup on Every Request

**Location:** `backend/src/middleware/auth.middleware.js` line 20

```javascript
const revoked = await isTokenRevoked(payload.jti);
if (revoked) {
  return res.status(401).json({ error: "Token has been revoked" });
}
```

**Issue:**
- Every authenticated request requires a MongoDB query
- Scales poorly under high load
- Token revocation takes effect immediately (good for security, bad for performance)

**Trade-off:**
- Currently: Immediate revocation ✓, but slow queries
- Alternative: Redis cache of revoked tokens (better perf, slight delay)

**Status:** MEDIUM priority (monitor performance)

#### B. No Database Connection Pooling Configuration

**Location:** `backend/src/db.js` line 25

```javascript
await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
});
```

**Issue:**
- Default Mongoose pool is small (5 connections)
- Under load, connection exhaustion possible
- Timeouts may increase

**Fix:**
```javascript
const options = {
  maxPoolSize: 10,  // Increase for production
  minPoolSize: 5,
  serverSelectionTimeoutMS: 10000,
};
```

**Status:** LOW priority (monitor in production)

#### C. No .env.example File

**Location:** `backend/` directory

**Issue:**
- New developers don't know what env vars are needed
- No documentation of required configuration

**Fix:** Create `backend/.env.example`
```
MONGODB_URI=mongodb+srv://[user]:[password]@[cluster]/[db]?appName=Cluster0
PORT=3000
JWT_SECRET=[generate-random-32-bytes]
```

**Status:** LOW priority (documentation)

### 4) Code Quality Issues

#### A. Inconsistent Error Handling

**Issue:**
- Some errors generic ("Invalid credentials", "Internal server error")
- Some errors specific ("Email already in use")
- No structured error types/codes

**Example:**
```javascript
// Good — informative, not leaking internals
return res.status(409).json({ error: "Email already in use" });

// Not good — generic, hard to debug
catch (error) {
  console.error("Register error:", error);
  res.status(500).json({ error: "Internal server error" });
}
```

**Status:** MEDIUM priority (refactor after tests added)

#### B. High-Churn Frontend Files

**From scan output:**
- `frontend/goals.html` — 10 commits
- `frontend/market-insights.html` — 8 commits
- `frontend/styles.css` — 8 commits

**Indicator:** Fragile/incomplete features, likely hidden bugs

**Status:** Investigate goals.html and market-insights.html for incomplete features

#### C. No TypeScript

**Issue:**
- No compile-time type safety
- Runtime errors possible
- IDE autocompletion limited

**Rationale:** Vanilla JS chosen for simplicity; can refactor to TypeScript later

**Status:** DESIGN choice (acceptable for MVP)

### 5) Architectural Concerns

#### A. Frontend Has No Build Step

**Issue:**
- No tree-shaking or minification
- Large api-client.js (~313 lines) included in every page
- No module bundling

**Risk:**
- Slow initial page load
- Difficult to add frontend dependencies

**Status:** LOW priority (acceptable for small app)

#### B. Monolith Package Structure Confusion

**Issue:**
- Root `package.json` has express dependency (unused?)
- Backend has separate `package.json`
- Two npm workspaces, not clearly separated

**Fix:** Clarify package structure:
```
personal-financial-planning-system/
├── backend/package.json  (source of truth for backend)
├── frontend/             (static files, no package.json needed)
└── package.json          (root — remove or clarify purpose)
```

**Status:** LOW priority (documentation)

#### C. No Environment-Specific Configuration

**Issue:**
- No dev/staging/prod configuration
- Hardcoded `http://localhost:3000/api` in frontend
- MongoDB connection timeout is fixed

**Improvement:**
```javascript
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
```

**Status:** MEDIUM priority (refactor before production deployment)

### 6) Performance Concerns

#### A. N+1 Query Pattern (Potential)

**Location:** `backend/src/repositories/goals.repository.js` line 14

```javascript
return Goal.find(query).sort({ target_date: 1, created_at: -1 }).lean();
```

**Potential issue:** If goals have user references, fetching user for each goal could be N+1

**Current status:** NOT AN ISSUE (goals.repository doesn't join on user)

**Status:** Monitor if relationships added

#### B. No Database Indexing Documentation

**Issue:**
- Mongoose schema defines `unique: true` on email
- No explicit indexes on query fields (user_id, target_date)
- Scan performance not profiled

**Fix:** Add indexes in schema
```javascript
userSchema.index({ email: 1 });
goalSchema.index({ user_id: 1, target_date: 1 });
```

**Status:** LOW priority (indexes auto-created by Mongoose)

#### C. Token Revocation Lookup Scales Poorly

**From section 3.A above** — already covered

### 7) Git & DevOps Issues

#### A. No .gitignore Rules Sufficient

**Issue:**
- `.env` file is committed (security issue)
- `node_modules/` correctly ignored
- Missing rules for `.npm-cache/`, logs, etc.

**Fix:** Ensure `.gitignore` contains:
```
.env
.env.local
node_modules/
.npm-cache/
*.log
```

**Status:** BLOCKING (after rotating credentials)

#### B. No CI/CD Pipeline

**Location:** `.github/workflows/` missing

**Issue:**
- No automated testing on push/PR
- No linting enforcement
- No build verification

**Candidates:**
- GitHub Actions (free for public repos)
- Jest for testing
- ESLint for linting

**Status:** MEDIUM priority (add before production)

#### C. No Docker Configuration

**Issue:**
- No containerization
- Difficult to deploy consistently
- Requires Node.js + MongoDB setup manually

**Status:** LOW priority (can be added for deployment)

### 8) Documentation Issues

#### A. Minimal README

**Location:** `README.md` (almost empty)

**Issue:**
- No setup instructions
- No API documentation
- No deployment guide

**Status:** LOW priority (documentation will be auto-generated)

#### B. No API Schema (Swagger/OpenAPI)

**Issue:**
- No formal API documentation
- Clients must read code to understand endpoints

**Candidates:**
- Swagger/OpenAPI (auto-generate from JSDoc)
- API Blueprint

**Status:** LOW priority (can be added post-MVP)

### 9) Summary Risk Matrix

| Issue | Severity | Impact | Effort to Fix | Priority |
|-------|----------|--------|---------------|----------|
| Credentials in git | CRITICAL | Data breach | 1 day | 🔴 DO NOW |
| CORS too permissive | HIGH | CSRF/XSS amplification | 30 min | 🔴 DO NOW |
| No rate limiting | HIGH | Brute force attacks | 2 hours | 🟠 SOON |
| Token revocation scale | MEDIUM | Performance degradation | 1 day | 🟡 PLAN |
| No input validation (market endpoints) | MEDIUM | Injection attacks (future) | 2 hours | 🟡 PLAN |
| No tests | MEDIUM | Regression bugs | 3 days | 🟡 PLAN |
| No CI/CD | MEDIUM | Manual deployment risk | 4 hours | 🟡 PLAN |
| No TypeScript | LOW | Runtime errors | 2 days | 🟢 LATER |
| High-churn files | LOW | Hidden bugs | 1 day | 🟢 LATER |

### 10) Recommended Next Steps

**Phase 1 (This week):**
1. ✅ Rotate MongoDB password
2. ✅ Remove credentials from git history
3. ✅ Configure CORS properly
4. ✅ Add JWT secret to .env
5. ✅ Create .env.example

**Phase 2 (Next week):**
1. Add rate limiting to auth endpoints
2. Add input validation to market endpoints
3. Set up GitHub Actions CI/CD
4. Add ESLint + Prettier
5. Write core integration tests

**Phase 3 (Before production):**
1. Security audit (XSS, CSRF, SQL injection)
2. Load testing
3. Deploy to staging
4. Docker containerization
5. Database backup strategy

### 11) Evidence

- backend/.env (credentials issue)
- backend/src/server.js (CORS configuration)
- backend/src/routes/market.routes.js (placeholder endpoints)
- Scan output (high-churn files, no CI/CD)
- backend/package.json (no rate limiting library)

