# Architecture & Design Patterns

## Core Sections (Required)

### 1) High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vanilla JS)                        │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ index.html  │  │goals.html│  │calc.html │  │market.html       │
│  └──────┬──────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│         │              │              │             │              │
│         └──────────────┼──────────────┼─────────────┘              │
│                        │              │                            │
│              ┌─────────▼──────────────▼────────┐                   │
│              │    api-client.js                │                   │
│              │ (Centralized HTTP + Auth)       │                   │
│              │ - Auto-refresh on 401           │                   │
│              │ - Toast notifications           │                   │
│              │ - Token management              │                   │
│              └─────────┬──────────────┬────────┘                   │
│                        │              │                            │
│              ┌─────────▼──────────────▼────────┐                   │
│              │   dom-utils.js                  │                   │
│              │   (XSS Prevention)              │                   │
│              └─────────────────────────────────┘                   │
└─────────────────────┬──────────────────────────────────────────────┘
                      │ HTTP/JSON
                      │ (Bearer Token Auth)
┌─────────────────────▼──────────────────────────────────────────────┐
│                    BACKEND (Express.js + Node)                     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐    │ 
│  │                   server.js (Entry)                        │    │
│  │  - Initialize Express                                      │    │
│  │  - Attach CORS, body-parser middleware                     │    │
│  │  - Mount route aggregator                                  │    │
│  └──────────────────┬─────────────────────────────────────────┘    │
│                     │                                              │
│  ┌──────────────────▼──────────────────────────────────────┐       │
│  │              routes/index.js (Router)                   │       │
│  │  Aggregates:                                            │       │
│  │  - /auth/* → auth.routes.js                             │       │
│  │  - /user/* → user.routes.js                             │       │
│  │  - /goals/* → goals.routes.js                           │       │
│  │  - /calculator/* → calculator.routes.js                 │       │
│  │  - /market/* → market.routes.js                         │       │
│  │  - /recommendations/* → recommendations.routes.js       │       │
│  └──────────────────┬─────────────────────────────────────┬┘       │
│                     │                                      │       │
│  ┌──────────────────▼──────────┐  ┌──────────────────────▼─┐       │
│  │ middleware/auth.middleware │  │  [Per-route handlers]  │     │
│  │                             │  │                       │     │
│  │ - requireAuth (JWT verify)  │  │ - Auth POST/refresh   │     │
│  │ - requireAdmin (role check) │  │ - User CRUD/password  │     │
│  │ - Token revocation check    │  │ - Goals CRUD          │     │
│  └─────────────────────────────┘  │ - Calculator ops      │     │
│                                    │ - Market data fetch   │     │
│                                    └──────┬────────────────┘     │
│                                           │                      │
│  ┌────────────────────────────────────────▼────────────────┐    │
│  │           repositories/* (Data Layer)                   │    │
│  │  Mongoose wrapper functions:                           │    │
│  │  - user.repository: findByEmail, createUser, etc.      │    │
│  │  - goals.repository: findById, listGoals, updateGoal   │    │
│  │  - calculations.repository: CRUD operations            │    │
│  │  - revoked-token.repository: token blacklist ops       │    │
│  └────────────────────────────────────────┬───────────────┘    │
│                                            │                    │
│  ┌────────────────────────────────────────▼───────────────┐    │
│  │        schemas/* (Validation + DB Models)              │    │
│  │  - Zod schemas for request validation                  │    │
│  │  - Mongoose schemas for DB storage                     │    │
│  │  - Models: User, Goal, Calculation, RevokedToken       │    │
│  └────────────────────────────────────────┬───────────────┘    │
│                                            │                    │
│  ┌────────────────────────────────────────▼───────────────┐    │
│  │        utils/ (Helper Functions)                       │    │
│  │  - auth.util: signAccessToken, verifyAccessToken      │    │
│  │  - Token refresh logic                                │    │
│  └────────────────────────────────────────┬───────────────┘    │
│                                            │                    │
│  ┌────────────────────────────────────────▼───────────────┐    │
│  │        db.js (MongoDB Connection)                      │    │
│  │  - Connect to MongoDB Atlas                            │    │
│  │  - Export models                                       │    │
│  └────────────────────────────────────────┬───────────────┘    │
│                                            │                    │
└────────────────────────────────────────────┼────────────────────┘
                                             │ Mongoose ODM
                      ┌──────────────────────▼────────────────┐
                      │  MongoDB Atlas (Cloud Database)       │
                      │  Collections:                         │
                      │  - users                              │
                      │  - goals                              │
                      │  - calculations                       │
                      │  - revokedtokens                      │
                      └─────────────────────────────────────┘
```

### 2) Data Flow: User Login → Authenticated Request

```
FRONTEND (browser)
    1. User enters email/password
    2. Call apiClient.login(email, password)
        ↓
API call: POST /api/auth/login { email, password }
        ↓
BACKEND (auth.routes.js)
    3. Parse & validate with loginSchema (Zod)
    4. Call findByEmail() from user.repository
        ↓
    5. Query MongoDB: db.User.findOne({ email })
        ↓
    6. bcrypt.compare(password, stored_hash)
    7. Create JWT tokens (access + refresh)
    8. Return: { user, access_token, refresh_token }
        ↓
FRONTEND (api-client.js)
    9. Store access_token & refresh_token in localStorage
    10. Redirect to dashboard (index.html)
        ↓
    11. On subsequent requests:
        - Attach header: Authorization: Bearer <access_token>
        - If 401 → call /auth/refresh with refresh_token
        - Retry original request with new token
        ↓
BACKEND (auth.middleware.js)
    12. In each protected route:
        - Extract token from Authorization header
        - Call verifyAccessToken(token)
        - Check if token.jti is revoked (in RevokedToken collection)
        - Attach req.auth = { userId, role, tokenId, ... }
        - Proceed to route handler
```

### 3) Layered Architecture Pattern

```
Request Flow (Top to Bottom)
│
├─► HTTP Layer (server.js)
│   Middleware: CORS, body-parser, express.json()
│
├─► Router Layer (routes/*.js)
│   Route definitions, HTTP method handling
│   Example: POST /api/goals → createGoal handler
│
├─► Validation Layer (schemas/*.js)
│   Input validation (Zod) before DB operations
│   Error responses for invalid payloads
│
├─► Service/Handler Layer (inside routes/*.js)
│   Business logic, authorization checks
│   Auth checks: requireAuth, requireAdmin middleware
│
├─► Data Access Layer (repositories/*.js)
│   Abstraction over Mongoose
│   Query building, create/read/update/delete
│
├─► Database Layer (db.js + Mongoose)
│   ODM mapping, schema definitions
│   Connection management
│
└─► Storage Layer (MongoDB Atlas)
    Persistent data storage

Response Flow (Bottom to Top)
│
├─ Data: MongoDB returns document
├─ Repository formats & returns data
├─ Route handler transforms to public shape (toPublicGoal, etc.)
├─ Express serializes to JSON
├─ HTTP response sent to client
└─ Frontend api-client.js parses & updates UI
```

### 4) Key Design Patterns

#### A. Repository Pattern
- **Where:** `backend/src/repositories/`
- **Why:** Decouple data access from route logic
- **Example:** `goals.repository.js` exposes `findById`, `listGoals`, `createGoal`, etc.
- **Benefit:** Easy to swap MongoDB with PostgreSQL later

#### B. Middleware Chain
- **Where:** `backend/src/middleware/` + Express middleware
- **Example:** `requireAuth` → verifies JWT, checks token revocation → next()
- **Pattern:** Guard clauses prevent unauthorized access early

#### C. Singleton API Client
- **Where:** `frontend/api-client.js`
- **Pattern:** Single global instance handles all HTTP requests
- **Benefit:** Centralized token refresh, error handling, headers

#### D. Schema Separation (Validation + Database)
- **Where:** `backend/src/schemas/`
- **Pattern:** Zod schema for request/response, Mongoose schema for DB
- **Benefit:** Validate early, schema as documentation

#### E. Public vs. Private Models
- **Pattern:** Mongoose stores `password_hash`, routes return `toPublicUser()` without it
- **Benefit:** Never expose secrets in API responses

### 5) Key Architectural Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Separate frontend & backend repos | Clean separation of concerns | Two repos to maintain |
| MongoDB + Mongoose | Flexible schema, easy prototyping | Schema validation moved to code (Zod) |
| JWT (no sessions) | Stateless, scales horizontally | Token revocation requires DB lookup |
| Centralized api-client.js | Single point of API logic | Frontend must include this file in all pages |
| Repository pattern | Data layer abstraction | Extra indirection (not needed for simple queries) |
| Vanilla JS (no build) | Zero build step, quick iteration | No tree-shaking, larger bundle if minified |

### 6) Evidence

- backend/src/server.js (Express setup)
- backend/src/routes/index.js (route aggregation)
- backend/src/middleware/auth.middleware.js (JWT guard)
- backend/src/repositories/goals.repository.js (data abstraction)
- frontend/api-client.js (HTTP client with auto-refresh)

## Extended Sections (Optional)

### Background Jobs / Workers
[TODO] No background workers detected (no Bull, Celery, etc.)

### Event-Driven Components
[TODO] No pub/sub or event bus detected; all communication is synchronous HTTP

### Error Handling Strategy
- **Backend:** Try-catch in route handlers, return HTTP error codes (400, 401, 409, 500)
- **Frontend:** api-client.js catches errors, displays toast notifications
- **Security:** Generic "Invalid credentials" message (no user enumeration)

### Performance Optimizations
- MongoDB `.lean()` queries (skip Mongoose hydration where possible)
- Token revocation uses DB lookup (trade-off: prevents instant logout across tabs, but simpler than Redis)

### Security Boundaries
- Authentication: JWT (Bearer token in Authorization header)
- Authorization: Role-based checks (requireAuth, requireAdmin)
- XSS prevention: dom-utils.js utilities (sanitize DOM operations)
- Password storage: bcryptjs with salt rounds 12
- CORS: Enabled on server for cross-origin frontend requests
