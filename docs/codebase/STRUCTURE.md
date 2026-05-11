# Directory Structure

## Core Sections (Required)

### 1) Directory Layout

```
personal-financial-planning-system/
├── backend/                           # Express.js REST API server
│   ├── src/
│   │   ├── server.js                  # Express app initialization, middleware setup
│   │   ├── db.js                      # MongoDB connection, model exports (User, Goal, RevokedToken, Calculation)
│   │   ├── middleware/
│   │   │   └── auth.middleware.js     # JWT verification, requireAuth, requireAdmin guards
│   │   ├── routes/                    # Route handlers (organized by feature)
│   │   │   ├── index.js               # Route aggregator
│   │   │   ├── auth.routes.js         # POST /auth/register, login, logout, refresh
│   │   │   ├── user.routes.js         # User profile management
│   │   │   ├── goals.routes.js        # Goals CRUD
│   │   │   ├── calculator.routes.js   # Investment calculator operations
│   │   │   ├── market.routes.js       # Market data endpoints
│   │   │   └── recommendations.routes.js # Investment recommendations
│   │   ├── repositories/              # Data access layer (abstraction over Mongoose)
│   │   │   ├── user.repository.js
│   │   │   ├── goals.repository.js
│   │   │   ├── calculations.repository.js
│   │   │   └── revoked-token.repository.js (token blacklist for logout)
│   │   ├── schemas/                   # Validation schemas (Zod + Mongoose)
│   │   │   ├── user.schema.js         # User model & registerSchema, updateProfileSchema, etc.
│   │   │   ├── goal.schema.js
│   │   │   ├── calculation.schema.js
│   │   │   ├── auth.schema.js         # loginSchema, refreshSchema, logoutSchema
│   │   │   └── revoked-token.schema.js
│   │   └── utils/
│   │       └── auth.util.js           # JWT signing/verification helpers
│   ├── package.json                   # Dependencies: express, mongoose, bcryptjs, zod, etc.
│   ├── .env                           # Environment variables (MongoDB URI)
│   └── .env.example                   # [TODO] Not present, recommend adding
│
├── frontend/                          # Vanilla HTML/CSS/JS client
│   ├── api-client.js                  # Centralized API wrapper (auto-refresh on 401, toast helpers)
│   ├── dom-utils.js                   # XSS prevention utilities
│   ├── index.html                     # Home/dashboard page
│   ├── login.html                     # Login form
│   ├── register.html                  # Registration form
│   ├── profile.html                   # User profile management
│   ├── update-password.html           # Password change form
│   ├── delete-account.html            # Account deletion confirmation
│   ├── goals.html                     # Goals management (CRUD)
│   ├── calculator.html                # Investment calculator UI
│   ├── recommendations.html           # Investment recommendations display
│   ├── market-insights.html           # Market news & trends
│   ├── [PAGE].js                      # Page-specific logic (login.js, calculator.js, etc.)
│   └── styles.css                     # Global styling
│
├── docs/
│   └── codebase/                      # Auto-generated codebase documentation (this file)
│
├── package.json                       # Root package (only contains express, likely unused)
└── README.md                          # Project description (minimal)
```

### 2) Entry Points

**Backend:**
- Primary: `backend/src/server.js` — Express app setup, starts listening on PORT (default 3000)
- Script: `npm run dev` or `npm start` (defined in backend/package.json)

**Frontend:**
- Primary: `frontend/index.html` — Home page with navigation
- No build step; static files served directly
- Depends on `api-client.js` loaded as script tag in each HTML file

### 3) Key Files at a Glance

| File | Role | Lines | Purpose |
|------|------|-------|---------|
| backend/src/server.js | Server entry | ~35 | Initialize Express, attach middleware, start listening |
| backend/src/db.js | DB connection | ~43 | Connect MongoDB, export models (User, Goal, Calculation, RevokedToken) |
| backend/src/routes/auth.routes.js | Auth logic | ~195 | Register, login, logout, token refresh (with token revocation) |
| backend/src/middleware/auth.middleware.js | Auth guards | ~50 | JWT verification, requireAuth, requireAdmin middleware |
| frontend/api-client.js | API layer | ~313 | Singleton API wrapper with auto-refresh, all HTTP calls go through here |
| frontend/index.html | Home page | Large | Navigation, auth state display, homepage content |

### 4) Directory Naming Conventions

- **Feature-based routes:** `backend/src/routes/` organizes by domain (auth, user, goals, calculator, market)
- **Repository pattern:** `backend/src/repositories/` mirrors routes (goals.repository, user.repository)
- **Schemas:** `backend/src/schemas/` co-located with models
- **Frontend pages:** Flat structure (`frontend/page.html`, `frontend/page.js`)

### 5) Hidden/Config Directories

- `.git/` — Version control
- `.github/` — [TODO] Not present; no CI/CD workflows
- `node_modules/` — Dependencies (3rd-party code)
- `.npm-cache/` — npm cache (not committed)

### 6) Evidence

- backend/src/ directory structure
- frontend/ directory listing
- backend/package.json (scripts.start → src/server.js)
- Scan output showing 40 source files

## Extended Sections (Optional)

### Subdirectory Maps

**Backend Routes by Feature:**
- `auth.routes.js` — All authentication endpoints (register, login, logout, refresh)
- `user.routes.js` — Profile CRUD, password update, account deletion
- `goals.routes.js` — Savings/investment goals lifecycle management
- `calculator.routes.js` — ROI calculation, investment comparison, calculation history
- `market.routes.js` — Market news, trends, ticker data
- `recommendations.routes.js` — Investment recommendations based on goals

**Frontend Pages:**
- `login.html` / `register.html` — Auth pages (guest-only)
- `index.html` — Home/dashboard (accessible to all)
- `profile.html`, `update-password.html`, `delete-account.html` — Account pages (auth-only)
- `goals.html`, `calculator.html`, `recommendations.html`, `market-insights.html` — Feature pages (auth-only)
