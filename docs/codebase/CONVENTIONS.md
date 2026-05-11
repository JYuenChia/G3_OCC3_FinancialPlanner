# Coding Standards & Conventions

## Core Sections (Required)

### 1) File Naming Conventions

| Convention | Pattern | Examples | Evidence |
|-----------|---------|----------|----------|
| JavaScript files (backend) | camelCase | db.js, auth.util.js, auth.routes.js | backend/src/*.js |
| JavaScript files (frontend) | camelCase or PascalCase | api-client.js, dom-utils.js | frontend/*.js |
| HTML files (frontend) | kebab-case | login.html, goals.html, market-insights.html | frontend/*.html |
| Mongoose schemas | camelCase | userSchema, goalSchema | backend/src/schemas/*.js |
| Repository files | domain.repository.js | user.repository.js, goals.repository.js | backend/src/repositories/*.js |
| Route files | domain.routes.js | auth.routes.js, goals.routes.js | backend/src/routes/*.js |

### 2) Variable & Function Naming

#### Backend (Node.js)

| Type | Convention | Examples | Evidence |
|------|-----------|----------|----------|
| Constants | UPPER_SNAKE_CASE | MONGODB_URI, PORT, API_BASE_URL | backend/src/db.js, frontend/api-client.js |
| Functions | camelCase | findByEmail, createUser, requireAuth | backend/src/repositories/*.js, middleware/auth.middleware.js |
| Classes/Constructors | PascalCase | ApiClient | frontend/api-client.js (class ApiClient) |
| Private variables | prefixed with _ (convention, not enforced) | [TODO - not consistently used] | [minimal usage] |
| Database fields | snake_case | user_id, target_amount, created_at | backend/src/schemas/*.js |
| API fields (JSON) | snake_case | user_id, target_date, password_hash | backend/src/routes/*.js (toPublicUser, toPublicGoal) |

#### Frontend (Vanilla JS)

| Type | Convention | Examples | Evidence |
|------|-----------|----------|----------|
| Functions | camelCase | checkAuthState, showError, showSuccess | frontend/api-client.js |
| Element IDs | kebab-case | loading-spinner, nav-list, mainNavbar | frontend/*.html |
| CSS classes | kebab-case | toast-error, toast-success, navbar-dark | frontend/styles.css |
| Global objects | camelCase | apiClient (singleton) | frontend/api-client.js |

### 3) Import Organization

**Backend (CommonJS):**
```javascript
// 1. Built-in modules
const express = require("express");
const bcrypt = require("bcryptjs");

// 2. External dependencies
const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");

// 3. Local modules (relative paths)
const { connectDB } = require("./db");
const { requireAuth } = require("../middleware/auth.middleware");
const { createUser, findByEmail } = require("../repositories/user.repository");

// 4. Schemas and constants
const { loginSchema } = require("../schemas/auth.schema");

const router = express.Router();
```

**Frontend (Script tags in HTML):**
```html
<script src="api-client.js"></script>
<script src="dom-utils.js"></script>
<script src="login.js"></script>
```

### 4) Error Handling

#### Backend

- **HTTP Error Responses:** All errors returned as JSON with `{ error: "message" }`
- **Status Codes:**
  - `400` — Bad Request (validation error)
  - `401` — Unauthorized (missing/invalid token)
  - `403` — Forbidden (insufficient permissions)
  - `409` — Conflict (email already in use)
  - `404` — Not Found (resource doesn't exist)
  - `500` — Internal Server Error
- **Example:**
  ```javascript
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid registration payload" });
  }
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  ```
- **Generic Messages:** Never leak internal errors to client (e.g., "Email already in use" is safe; MongoDB error is not)

#### Frontend

- **Error Display:** Wrapped in `showError(message)` function (displays toast)
- **Retry Logic:** api-client.js auto-retries on 401 with token refresh
- **Logout on Auth Failure:** Refresh token expiry triggers `apiClient.logout()`

### 5) Input Validation

#### Backend (Zod + Mongoose)

**Zod validation (before DB):**
```javascript
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const parsed = loginSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: "Invalid login payload" });
}
const { email, password } = parsed.data;
```

**Additional checks:**
```javascript
if (!validator.isEmail(email)) {
  return res.status(400).json({ error: "Invalid email" });
}
```

**Mongoose schema validation:** Default values, enum restrictions, unique indexes
```javascript
const userSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "admin"], default: "user" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
});
```

#### Frontend (Minimal validation)

- HTML5 form validation (type="email", required attributes)
- api-client.js catches HTTP errors and displays them

### 6) Response Transformation

**Backend pattern (expose only safe fields):**
```javascript
function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    full_name: user.full_name,
    role: user.role || "user",
    created_at: user.created_at,
    updated_at: user.updated_at,
    // Never include: password_hash
  };
}

// Usage in route:
const publicUser = toPublicUser(user);
res.json({ user: publicUser, access_token, refresh_token });
```

### 7) Logging & Debugging

**Backend:**
- Uses `console.log()` and `console.error()` (no logging framework)
- Sample patterns:
  ```javascript
  console.log("MongoDB connected successfully");
  console.error("MongoDB connection error:", error.message);
  console.error("Register error:", error);
  ```

**Frontend:**
- Minimal logging; mostly debug toasts
- Sample:
  ```javascript
  console.error('Token refresh failed:', error);
  console.error('Logout error:', error);
  ```

### 8) Code Organization by Layer

#### Routes Layer (`backend/src/routes/*.js`)
- File per feature (auth, goals, user)
- Each file exports a router with HTTP verb handlers (POST, GET, PUT, DELETE)
- Validation, authorization, database calls, response transformation all in same file

#### Repository Layer (`backend/src/repositories/*.js`)
- One function per operation (findById, listGoals, createGoal, updateGoal, deleteGoal)
- Pure Mongoose calls, no business logic
- Returns lean() documents (plain JSON, no Mongoose methods)

#### Schema Layer (`backend/src/schemas/*.js`)
- Zod validation schema + Mongoose database schema in same file
- Constants for default values

#### Middleware (`backend/src/middleware/`)
- Guard functions (requireAuth, requireAdmin)
- Attach data to req object (req.auth)

### 9) Async/Await Pattern

All async operations use `async/await` (not callbacks or `.then()`):
```javascript
// Correct:
async function handleRequest(req, res) {
  try {
    const user = await findByEmail(email);
    const result = await bcrypt.compare(password, user.password_hash);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}

// In routes: app.get('/...', async (req, res) => { ... })
```

### 10) Security Practices

- **Password hashing:** bcryptjs with 12 rounds
- **Token signing:** JWT with secret key (stored in .env)
- **XSS prevention:** dom-utils.js helpers (e.g., textContent instead of innerHTML)
- **CSRF:** [TODO] Not explicitly configured (frontend is vanilla, not SPA with state)
- **Input sanitization:** Zod + validator library
- **Token revocation:** Blacklist in RevokedToken collection checked on every auth request

### 11) Evidence

- backend/src/routes/auth.routes.js (error handling, validation, naming)
- backend/src/repositories/goals.repository.js (function naming, async/await)
- backend/src/schemas/user.schema.js (field naming, Zod patterns)
- frontend/api-client.js (camelCase functions, error handling)
- frontend/styles.css (kebab-case classes)

## Extended Sections (Optional)

### Comment Style
- Minimal comments (code should be self-documenting)
- Multi-line function headers explain intent (seen in api-client.js: `/** Refresh access token using refresh token */`)
- TODOs marked inline ([TODO] pattern in some schema files)

### Testing Patterns
[TODO] No tests configured; backend/package.json has "test": "echo 'No tests configured'"

### Type Safety
[TODO] No TypeScript; runtime validation with Zod + Mongoose schemas
