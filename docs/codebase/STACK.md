# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | JavaScript (Node.js) | backend/package.json, frontend/*.js |
| Runtime + version | Node.js (latest LTS assumed, no .nvmrc) | backend/package.json type:"commonjs" |
| Package manager | npm | package-lock.json, backend/package-lock.json |
| Module/build system | CommonJS (backend), ES modules (frontend inline) | backend/package.json type:"commonjs" |

### 2) Production Frameworks and Dependencies

#### Backend

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| express | ^5.2.1 | HTTP server & REST API framework | backend/package.json, backend/src/server.js |
| mongoose | ^9.4.1 | MongoDB ODM, schema modeling | backend/src/db.js |
| jsonwebtoken | ^9.0.3 | JWT token signing & verification | backend/src/utils/auth.util.js |
| bcryptjs | ^3.0.3 | Password hashing & verification | backend/src/routes/auth.routes.js |
| zod | ^4.3.6 | Schema validation (request/response payloads) | backend/src/schemas/*.js |
| validator | ^13.15.35 | Email validation | backend/src/routes/auth.routes.js |
| cors | ^2.8.6 | Cross-origin request handling | backend/src/server.js |
| dotenv | ^17.4.1 | Environment variable loading | backend/src/db.js |
| body-parser | ^2.2.0 | Request body parsing middleware | backend/src/server.js |
| uuid | ^13.0.0 | Unique ID generation for users & resources | backend/src/routes/auth.routes.js |

#### Frontend

| Framework | Purpose | Evidence |
|-----------|---------|----------|
| Bootstrap 5.3.2 | CSS framework (CDN) | frontend/index.html link tag |
| Bootstrap Icons 1.11.3 | Icon library (CDN) | frontend/index.html link tag |
| Vanilla JavaScript | Client-side logic (no build step) | frontend/*.js, frontend/*.html |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| [TODO] | Linting | No linter configured |
| [TODO] | Testing | backend/package.json: "test": "echo 'No tests configured'" |
| [TODO] | Formatting | No formatter configured |

### 4) Key Commands

**Backend:**
```bash
npm install              # Install dependencies
npm start               # Run server (node src/server.js)
npm run dev             # Run with --watch for development
npm test                # No tests configured
```

**Frontend:**
No build step. Files served directly as static HTML/CSS/JS.

**Root:**
```bash
npm install (in root)   # Install express dependency for root package.json
```

### 5) Environment and Config

- Config sources: `backend/.env` (MongoDB URI)
- Required env vars: `MONGODB_URI` (connection string)
- Optional env vars: `PORT` (defaults to 3000)
- Deployment/runtime constraints: Requires MongoDB Atlas connection (cloud), Node.js 18+ (body-parser requirement)

### 6) Evidence

- backend/package.json
- backend/package-lock.json
- backend/.env
- frontend/index.html (Bootstrap CDN links)

## Extended Sections (Optional)

Add only when needed for complex repos:

- Full dependency taxonomy by category
- Detailed compiler/runtime flags
- Environment matrix (dev/stage/prod)
- Process manager and container runtime details
