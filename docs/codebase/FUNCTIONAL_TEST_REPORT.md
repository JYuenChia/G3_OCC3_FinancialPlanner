# Functional Test Report

| Scenario | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| Auth / Login | POST `/api/auth/register` with valid registration data | Returns `201`, user object, access token, and refresh token | Returned `201` with user payload and both tokens | Pass |
| Auth / Login | POST `/api/auth/register` with an existing email | Returns `409` with duplicate-email error | Returned `409` with `Email already in use` | Pass |
| Auth / Login | POST `/api/auth/login` with valid credentials | Returns `200` with user payload and tokens | Returned `200` with user payload and both tokens | Pass |
| Auth / Login | POST `/api/auth/login` with invalid password | Returns `401` with invalid-credentials error | Returned `401` with `Invalid credentials` | Pass |
| Auth / Login | POST `/api/auth/refresh` with a valid refresh token | Returns `200` with a new access token | Returned `200` with a new access token | Pass |
| Auth / Login | POST `/api/auth/logout` with a valid access token and refresh token | Returns `200` and marks session logged out | Returned `200` with `logged_out` status | Pass |
| User Profile | GET `/api/user/profile` with a valid token | Returns `200` with current user profile | Returned `200` with the signed-in user profile | Pass |
| User Profile | PUT `/api/user/profile` with updated email and name | Returns `200` with updated profile data | Returned `200` with updated profile payload | Pass |
| User Profile | PATCH `/api/user/password` with correct current password | Returns `200` and password updated status | Returned `200` with `password_updated` | Pass |
| User Profile | PATCH `/api/user/password` with wrong current password | Returns `401` with password error | Returned `401` with `Current password is incorrect` | Pass |
| Goals | GET `/api/goals` with a valid token | Returns `200` with the user goal list | Returned `200` with one goal in the response | Pass |
| Goals | POST `/api/goals` with valid goal data | Returns `201` with created goal data | Returned `201` with created goal payload | Pass |
| Goals | PUT `/api/goals/:id` for an owned goal | Returns `200` with updated goal data | Returned `200` with updated goal payload | Pass |
| Goals | GET `/api/goals/:id` for another user’s goal | Returns `403` forbidden | Returned `403` with `Forbidden` | Pass |
| Goals | DELETE `/api/goals/:id` for an owned goal | Returns `200` and delete confirmation | Returned `200` with goal deletion message | Pass |
| Calculator | POST `/api/calculations` with a valid calculation payload | Returns `201` with saved calculation | Returned `201` with saved calculation payload | Pass |
| Calculator | GET `/api/calculations` with a valid token | Returns `200` with saved calculations | Returned `200` with one saved calculation | Pass |
| Calculator | DELETE `/api/calculations/:id` for an owned item | Returns `200` and deletion confirmation | Returned `200` with calculation deleted message | Pass |
| Calculator | DELETE `/api/calculations` to clear all saved calculations | Returns `200` and clear-all confirmation | Returned `200` with all calculations cleared | Pass |
| Market Insights | GET `/api/market/ticker/trending` | Returns `200` with trending ticker data | Returned `200` with mocked trending data | Pass |
| Market Insights | GET `/api/market/ticker/:symbol` | Returns `200` with the requested ticker quote | Returned `200` with mocked ticker data | Pass |
| Market Insights | GET `/api/market/news` | Returns `200` with market news data | Returned `200` with mocked news data | Pass |
| Recommendations | GET `/api/recommendations/:goal_id` for an owned goal | Returns `200` with strategy recommendations | Returned `200` with recommendation payload | Pass |
| Recommendations | POST `/api/strategies/compare` with a valid goal id | Returns `200` with strategy comparison data | Returned `200` with aggressive, balanced, and conservative strategies | Pass |
