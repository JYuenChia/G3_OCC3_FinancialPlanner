/**
 * API Client - Centralized API wrapper with auto-refresh on 401
 * Handles all frontend-backend communication
 */

const API_BASE_URL = 'http://localhost:3000/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  /**
   * Set token after login/register
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  /**
   * Get auth headers
   */
  getAuthHeader() {
    const token = localStorage.getItem('token') || this.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Generic request wrapper with auto-refresh on 401
   */
  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    };

    if (body) options.body = JSON.stringify(body);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

      // Auto-refresh on 401 (expired access token)
      if (response.status === 401 && this.token) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry original request with new token
          return this.request(method, endpoint, body);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        // Refresh token expired - force logout
        this.logout();
        return false;
      }

      const data = await response.json();
      this.setToken(data.access_token);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.request('POST', '/auth/logout', {
        refresh_token: localStorage.getItem('refresh_token'),
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    this.token = null;
    window.location.href = '/login.html';
  }

  /**
   * ==================== AUTH METHODS ====================
   */

  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    if (data.user) localStorage.setItem('user_id', data.user.id);
    return data;
  }

  async register(email, password, full_name) {
    const data = await this.request('POST', '/auth/register', {
      email,
      password,
      full_name,
    });
    this.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    if (data.user) localStorage.setItem('user_id', data.user.id);
    return data;
  }

  /**
   * ==================== USER METHODS ====================
   */

  getProfile() {
    return this.request('GET', '/user/profile');
  }

  updateProfile(email, full_name) {
    return this.request('PUT', '/user/profile', { email, full_name });
  }

  updatePassword(current_password, new_password) {
    return this.request('PATCH', '/user/password', {
      current_password,
      new_password,
    });
  }

  deleteAccount() {
    return this.request('DELETE', '/user/account');
  }

  /**
   * ==================== GOALS METHODS ====================
   */

  getGoals() {
    return this.request('GET', '/goals');
  }

  getGoal(id) {
    return this.request('GET', `/goals/${id}`);
  }

  createGoal(title, target_amount, current_amount, target_date, risk_appetite) {
    return this.request('POST', '/goals', {
      title,
      target_amount,
      current_amount,
      target_date,
      risk_appetite,
    });
  }

  updateGoal(id, updates) {
    return this.request('PUT', `/goals/${id}`, updates);
  }

  deleteGoal(id) {
    return this.request('DELETE', `/goals/${id}`);
  }

  /**
   * ==================== RECOMMENDATIONS METHODS ====================
   */

  getRecommendations(goalId) {
    return this.request('GET', `/recommendations/${goalId}`);
  }

  /**
   * ==================== MARKET METHODS ====================
   */

  async getMarketNews(query = 'stock market', limit = 10) {
    return this.request('GET', `/market/news?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getMarketTrends(symbol, days = 7) {
    return this.request('GET', `/market/trends/${symbol}?days=${days}`);
  }

  async getMarketTicker(symbol) {
    return this.request('GET', `/market/ticker/${symbol}`);
  }

  async getMarketTrendingTickers() {
    return this.request('GET', '/market/ticker/trending');
  }

  async getMultipleMarketData(symbols = [], cryptos = []) {
    const symbolsStr = symbols.join(',');
    const cryptosStr = cryptos.join(',');
    return this.request('GET', `/market/multi?symbols=${symbolsStr}&cryptos=${cryptosStr}`);
  }

  /**
   * ==================== CALCULATOR METHODS ====================
   */

  calculateROI(initial, rate, years) {
    return this.request('POST', '/calculator/roi', { initial, rate, years });
  }

  compareInvestments(investments) {
    return this.request('POST', '/calculator/compare', { investments });
  }

  saveCalculation(title, calculation) {
    return this.request('POST', '/calculations', {
      title,
      calculation,
    });
  }

  getCalculations() {
    return this.request('GET', '/calculations');
  }

  deleteCalculation(id) {
    return this.request('DELETE', `/calculations/${id}`);
  }

  clearAllCalculations() {
    return this.request('DELETE', '/calculations');
  }
}

// Export singleton
const apiClient = new ApiClient();

/**
 * Helper: Check auth state and redirect if needed
 */
function checkAuthState() {
  const token = localStorage.getItem('token');
  const currentPage = window.location.pathname;

  // Public pages (no redirect needed)
  const publicPages = ['/login.html', '/register.html', '/index.html', '/'];

  // Check if current page is public
  const isPublicPage = publicPages.some(
    (page) =>
      currentPage.endsWith(page) ||
      currentPage.endsWith(page.replace('.html', ''))
  );

  // Redirect to login if no token and not on public page
  if (!token && !isPublicPage) {
    window.location.href = '/login.html';
  }
}

/**
 * Helper: Display error toast
 */
function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 5000);
}

/**
 * Helper: Display success toast
 */
function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Helper: Show loading spinner
 */
function showLoading(show = true) {
  let spinner = document.getElementById('loadingSpinner');
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.className = 'loading-spinner';
    spinner.innerHTML =
      '<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>';
    document.body.appendChild(spinner);
  }

  spinner.style.display = show ? 'flex' : 'none';
}
