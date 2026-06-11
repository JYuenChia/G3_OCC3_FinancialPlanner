# Personal Financial Planning System

**Status:** Completed (Full Stack Application)

This project is a comprehensive Personal Financial Planning System with a Node.js/Express backend and a Vanilla JS frontend.

---

## Setup Instructions

### 1. Prerequisites
- Node.js installed (v18 or higher recommended)
- A MongoDB database (Local or Atlas)

### 2. Backend Setup
- Navigate to the `backend/` directory.
- Run `npm install` to install dependencies.
- Create a `.env` file in the `backend/` folder based on `.env.example`.
- Fill in the following variables:
    - `MONGODB_URI`: Your MongoDB connection string.
    - `JWT_ACCESS_SECRET`: Secret key for short-term access tokens.
    - `JWT_REFRESH_SECRET`: Secret key for long-term refresh tokens.
    - `RAPID_API_KEY`: API key from RapidAPI for market data.
    - `NEWS_API_KEY`: API key from NewsAPI.org for financial news.      
- Start the server using `npm start`.

### 3. Frontend Setup
- The frontend consists of static HTML files in the `frontend/` directory.
- Open `frontend/login.html` in your browser to start the application.
- **Note:** Ensure the backend is running so the frontend can communicate with the API.

### 4. Running Tests
- Navigate to the `backend/` directory.
- Run `npm test` to execute both the unit and functional test suites via Jest.
---

## Project Structure Overview

### [Backend](./backend/)
- **Routes:** API endpoints for auth, goals, calculator, market, and recommendations.
- **Repositories:** Data access layer using Mongoose.
- **Schemas:** Data validation using Zod and Mongoose.
- **Middleware:** Authentication and request processing logic.
- **Utils:** External API clients (RapidAPI) and caching.
- **Tests:** Unit and functional test suites using Jest (`src/__tests__`).

### [Frontend](./frontend/)
- **Static Pages:** HTML files for various features.
- **API Client:** Centralized communication with the backend (`api-client.js`).
- **DOM Utilities:** Shared JavaScript helper functions (`dom-utils.js`).
- **Styles:** Custom CSS for the user interface.
