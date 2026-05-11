# Integrations & External Services

## Core Sections (Required)

### 1) External APIs

| API | Endpoint | Purpose | Status | Evidence |
|-----|----------|---------|--------|----------|
| Market News API | GET /api/market/news | Fetch latest financial news | [TODO] Placeholder | backend/src/routes/market.routes.js |
| Market Trends API | GET /api/market/trends | Historical price/trend data | [TODO] Placeholder | backend/src/routes/market.routes.js |
| Market Ticker API | GET /api/market/ticker/:symbol | Real-time ticker data | [TODO] Placeholder | backend/src/routes/market.routes.js |
| Investment Recommendations | GET /api/recommendations/:goalId | AI-generated recommendations | [TODO] Placeholder | backend/src/routes/recommendations.routes.js |

**Note:** Market and recommendations endpoints currently return `{ status: "TO BE IMPLEMENTED" }`. Design is ready but external integrations not wired.

### 2) Database Integrations

| System | Connection | Purpose | Credentials | Evidence |
|--------|-----------|---------|-------------|----------|
| MongoDB Atlas (Cloud) | mongoose.connect(MONGODB_URI) | Primary data store | MONGODB_URI in .env | backend/src/db.js |

**Collections:**
- `users` — User accounts (email, password_hash, full_name, role)
- `goals` — Savings/investment goals (user_id, target_amount, risk_appetite, etc.)
- `calculations` — Saved investment calculations (user_id, title, calculation data)
- `revokedtokens` — Token blacklist for logout (jti, type, expiresAt)

**Connection Details:**
```javascript
await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
});
```

### 3) Authentication & Secrets

#### JWT Secret Management
- **Storage:** [TODO] Environment variable assumed (.env file)
- **Location:** backend/src/utils/auth.util.js (referenced but not shown in inspection)
- **Usage:** Sign & verify access/refresh tokens

#### Password Hashing
- **Algorithm:** bcryptjs
- **Rounds:** 12 (high security)
- **Evidence:** backend/src/routes/auth.routes.js (bcrypt.hash, bcrypt.compare)

#### Environment Variables
- **Source:** `backend/.env` file
- **Required:** `MONGODB_URI` (MongoDB connection string)
- **Optional:** `PORT` (defaults to 3000)
- **Missing:** `.env.example` (should document required vars)

**Current .env contents (SECURITY WARNING - in code):**
```
MONGODB_URI=mongodb+srv://db_user:XLzrtWQfdyxH653E@cluster0.ic2dxk9.mongodb.net/?appName=Cluster0
```

⚠️ **SECURITY ISSUE:** MongoDB credentials committed to git. See CONCERNS.md.

### 4) Third-Party Libraries (Integration Points)

| Library | Purpose | Version | Integration Point | Evidence |
|---------|---------|---------|-------------------|----------|
| mongoose | MongoDB ODM | ^9.4.1 | Query building, schema validation | backend/src/db.js, repositories/ |
| jsonwebtoken | JWT signing/verification | ^9.0.3 | Auth tokens (access + refresh) | backend/src/utils/auth.util.js |
| bcryptjs | Password hashing | ^3.0.3 | User password storage/verification | backend/src/routes/auth.routes.js |
| zod | Request/response validation | ^4.3.6 | Input sanitization before DB | backend/src/schemas/*.js |
| validator | Email/format validation | ^13.15.35 | Email format check | backend/src/routes/auth.routes.js |
| cors | CORS middleware | ^2.8.6 | Cross-origin requests from frontend | backend/src/server.js |
| body-parser | Request parsing | ^2.2.0 | JSON/URL-encoded body parsing | backend/src/server.js |
| uuid | ID generation | ^13.0.0 | Generate user IDs (instead of MongoDB ObjectId) | backend/src/routes/auth.routes.js |
| dotenv | Environment loading | ^17.4.1 | Load .env variables on startup | backend/src/db.js |
| Bootstrap | CSS framework | 5.3.2 (CDN) | Frontend styling | frontend/index.html |
| Bootstrap Icons | Icon library | 1.11.3 (CDN) | Frontend icons | frontend/index.html |

### 5) Frontend-Backend Communication

#### API Base URL
- **URL:** `http://localhost:3000/api`
- **Location:** frontend/api-client.js (line 6)
- **Transport:** HTTP/JSON
- **Authentication:** Bearer token in Authorization header

#### Token Management
- **Access token storage:** localStorage key: `token`
- **Refresh token storage:** localStorage key: `refresh_token`
- **User ID storage:** localStorage key: `user_id`
- **Auto-refresh:** 401 response triggers token refresh via /auth/refresh

#### CORS Configuration
```javascript
app.use(cors());  // Allow all origins (not suitable for production)
```

⚠️ **SECURITY ISSUE:** CORS allows all origins. Should be restricted to frontend domain. See CONCERNS.md.

### 6) Monitoring & Observability

| Tool | Purpose | Status | Evidence |
|------|---------|--------|----------|
| Console logging | Basic debugging | Active | backend/src/server.js, db.js |
| Error logging | Error tracking | Minimal | Try-catch blocks with console.error |
| APM (Application Performance Monitoring) | Performance metrics | [TODO] None configured | N/A |
| Prometheus / Grafana | Metrics export | [TODO] None configured | N/A |

**Current logging:**
- `console.log()` — Success messages (e.g., "MongoDB connected")
- `console.error()` — Error messages (e.g., "Register error")
- No structured logging (no Winston, Pino, etc.)

### 7) Evidence

- backend/src/db.js (MongoDB connection)
- backend/src/routes/auth.routes.js (JWT, bcryptjs, zod)
- backend/src/server.js (CORS, body-parser)
- frontend/api-client.js (API_BASE_URL, token storage)
- backend/.env (credentials)

## Extended Sections (Optional)

### Message Queues / Event Bus
[TODO] None configured. All communication is synchronous HTTP.

### Caching Strategy
[TODO] No Redis or in-memory cache detected. Every query hits MongoDB.

### Rate Limiting
[TODO] No rate limiting middleware configured.

### Service Mesh / API Gateway
[TODO] None configured. Frontend calls backend directly.

### Backup & Disaster Recovery
[TODO] Depends on MongoDB Atlas backup settings (not documented).

### Third-Party APIs Roadmap
Based on placeholder routes, these are planned but not implemented:
1. **Market News Integration** — Possibly Alpha Vantage, Yahoo Finance, or custom API
2. **Market Trends/Ticker** — Real-time stock/crypto data
3. **Investment Recommendations Engine** — ML-based or rule-based recommendations
