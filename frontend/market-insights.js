/**
 * Market Insights Page - Live Data Integration
 * Fetches real market data from backend (Yahoo Finance + CoinGecko + NewsAPI)
 */

let marketChart;
let currentAsset = 'sp500';

// Data mapping for friendly names to API symbols
const assetSymbols = {
  sp500: { label: 'S&P 500', symbol: 'sp500', type: 'stock', color: '#1a53bd' },
  btc: { label: 'Bitcoin (BTC)', symbol: 'btc', type: 'crypto', color: '#f7931a' },
  eth: { label: 'Ethereum (ETH)', symbol: 'eth', type: 'crypto', color: '#627eea' },
  gold: { label: 'Gold (XAU)', symbol: 'gold', type: 'stock', color: '#ffca2c' },
  aapl: { label: 'Apple (AAPL)', symbol: 'aapl', type: 'stock', color: '#555555' },
  nasdaq: { label: 'NASDAQ', symbol: 'nasdaq', type: 'stock', color: '#4285F4' },
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
  initChart();
  loadCarouselData();
  loadNews();
  setupEventListeners();
  updateLastUpdated();
});

function checkAuthState() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log("No token found, but staying on page for testing.");
    return;
  }
  document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'block');
  document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');
}

/**
 * Load carousel data (featured assets) - now from trending endpoint
 */
async function loadCarouselData() {
  try {
    showLoadingState('carousel');
    
    // Fetch all trending tickers from single endpoint
    const response = await apiClient.getMarketTrendingTickers()
      .catch(err => ({ success: false, data: [], error: err.message }));
    
    if (!response.success || !response.data || response.data.length === 0) {
      throw new Error('Failed to fetch trending data');
    }

    const tickers = response.data;
    
    // Map trending tickers to carousel positions
    // Item 1: sp500 (index 0), btc (index 1), gold (index 2)
    // Item 2: eth (index 3), nasdaq (index 4), aapl (index 5)
    const tickerMap = tickers.reduce((map, ticker) => {
      map[ticker.symbol] = ticker;
      return map;
    }, {});

    // Helper to format price with change
    const formatPriceWithChange = (ticker) => {
      if (!ticker || !ticker.price) return 'N/A';
      const price = ticker.price.toFixed(2);
      const change = ticker.changePercent ? ticker.changePercent.toFixed(2) : '0.00';
      const sign = ticker.changePercent >= 0 ? '+' : '';
      return `$${price} (${sign}${change}%)`;
    };

    // Update carousel item 1
    updateCarouselCard(0, 0, 'S&P 500 Index', formatPriceWithChange(tickerMap['sp500']));
    updateCarouselCard(0, 1, 'Bitcoin (BTC)', formatPriceWithChange(tickerMap['btc']));
    updateCarouselCard(0, 2, 'Gold (XAU)', formatPriceWithChange(tickerMap['gold']));

    // Update carousel item 2
    updateCarouselCard(1, 0, 'Ethereum (ETH)', formatPriceWithChange(tickerMap['eth']));
    updateCarouselCard(1, 1, 'NASDAQ', formatPriceWithChange(tickerMap['nasdaq']));
    updateCarouselCard(1, 2, 'Apple (AAPL)', formatPriceWithChange(tickerMap['aapl']));

    hideLoadingState('carousel');
  } catch (error) {
    console.error('Error loading carousel data:', error);
    showError('Failed to load market data');
    hideLoadingState('carousel');
  }
}

/**
 * Update a carousel card with live data
 */
function updateCarouselCard(itemIndex, cardIndex, title, value) {
  const carouselItems = document.querySelectorAll('.carousel-item');
  if (carouselItems[itemIndex]) {
    const card = carouselItems[itemIndex].querySelectorAll('.col-md-4')[cardIndex];
    if (card) {
      const titleEl = card.querySelector('h6');
      const valueEl = card.querySelector('.h3');
      if (titleEl) titleEl.textContent = title;
      if (valueEl) valueEl.textContent = value;
    }
  }
}

/**
 * Initialize chart with live data
 */
async function initChart() {
  try {
    showLoadingState('chart');
    
    const trendData = await apiClient.getMarketTrends(currentAsset, 7);
    const asset = assetSymbols[currentAsset];

    if (!trendData?.data?.data || trendData.data.data.length === 0) {
      throw new Error('No trend data available');
    }

    const ctx = document.getElementById('marketChart').getContext('2d');
    const prices = trendData.data.data.map(p => p.close);
    const labels = trendData.data.data.map(p => p.date);

    // Destroy existing chart instance if it exists
    if (marketChart) {
      marketChart.destroy();
    }

    marketChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: asset.label,
          data: prices,
          borderColor: asset.color,
          backgroundColor: asset.color + '22',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: asset.color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            grid: { display: false },
          }
        }
      }
    });

    hideLoadingState('chart');
  } catch (error) {
    console.error('Error initializing chart:', error);
    showError('Failed to load chart data');
    hideLoadingState('chart');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const assetSelector = document.getElementById('assetSelector');
  if (assetSelector) {
    // Use a named function for easy removal
    window.handleAssetChange = async (e) => {
      currentAsset = e.target.value;
      await initChart();
    };
    assetSelector.addEventListener('change', window.handleAssetChange);
  }
}

/**
 * Load financial news
 */
async function loadNews() {
  try {
    showLoadingState('news');
    
    const newsData = await apiClient.getMarketNews('finance stock market', 10);
    const newsContainer = document.getElementById('news-feed');

    if (!newsData?.data?.articles || newsData.data.articles.length === 0) {
      newsContainer.innerHTML = '<div class="list-group-item py-3 text-muted text-center">No news available</div>';
      hideLoadingState('news');
      return;
    }

    newsContainer.innerHTML = newsData.data.articles.slice(0, 5).map((article, index) => {
      const imageUrl = article.urlToImage || 'images/news-placeholder.jpg';
      const date = new Date(article.publishedAt).toLocaleDateString();
      
      return `
      <div class="list-group-item border-0 border-bottom py-3 bg-transparent px-3">
        <div class="row g-3 align-items-start">
          <div class="col-4">
            <div class="ratio ratio-4x3 shadow-sm rounded-2 overflow-hidden">
              <img src="${imageUrl}" class="object-fit-cover" onerror="this.src='images/news-placeholder.jpg'" alt="news thumb">
            </div>
          </div>
          <div class="col-8">
            <div class="fw-bolder text-uppercase mb-1" style="font-size: 0.65rem; color: #1a53bd;">
              ${article.source || 'NEWS'}
            </div>
            <a href="javascript:void(0)" onclick="showFullNews(${index})" class="text-decoration-none">
              <h6 class="fw-bold text-dark mb-1 news-link" style="line-height: 1.3; font-size: 0.9rem;">
                ${article.title}
              </h6>
            </a>
            <div class="text-muted" style="font-size: 0.75rem;">${date}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    // Store current news for detail view
    window.currentNews = newsData.data.articles;
    hideLoadingState('news');
  } catch (error) {
    console.error('Error loading news:', error);
    const newsContainer = document.getElementById('news-feed');
    newsContainer.innerHTML = '<div class="list-group-item py-3 text-danger text-center">Failed to load news</div>';
    hideLoadingState('news');
  }
}

/**
 * Show full news article
 */
function showFullNews(index) {
  const articles = window.currentNews || [];
  const selected = articles[index];
  
  if (!selected) return;

  const displaySection = document.getElementById('bottom-news-display');
  const contentArea = document.getElementById('bottom-content-area');
  const sidebarImg = document.getElementById('news-sidebar-img');

  // Set sidebar image
  if (selected.urlToImage) {
    sidebarImg.style.backgroundImage = `url('${selected.urlToImage}')`;
  } else {
    sidebarImg.style.backgroundColor = '#f0f0f0';
  }

  const date = new Date(selected.publishedAt).toLocaleDateString();
  contentArea.innerHTML = `
    <div class="text-uppercase mb-2 fw-bold" style="font-size: 0.75rem; color: #1a53bd; letter-spacing: 1px;">
      ${selected.source || 'FINANCIAL NEWS'}
    </div>
    <h1 class="fw-bold mb-3" style="color: #d42c20 !important; font-size: 2.5rem; line-height: 1.1;">
      ${selected.title}
    </h1>
    <div class="mb-4 fw-bold" style="color: #007bff;">
      ${selected.source || 'Source'} | ${date}
    </div>
    
    <div class="news-text text-dark" style="line-height: 1.8; font-size: 1.1rem;">
      <p class="lead fw-bold">${selected.description || ''}</p>
      <p>${selected.content || 'Read the full article for more details.'}</p>
      <p><a href="${selected.url}" target="_blank" class="btn btn-primary btn-sm mt-3">Read Full Article</a></p>
    </div>
  `;

  displaySection.style.display = 'block';
  displaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Refresh all data
 */
async function refreshAllData() {
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Refreshing...';
  }

  await Promise.all([
    loadCarouselData(),
    initChart(),
    loadNews(),
  ]);

  if (refreshBtn) {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
  }
  
  updateLastUpdated();
}

/**
 * Update last updated timestamp
 */
function updateLastUpdated() {
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl) {
    const now = new Date();
    lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
  }
}

/**
 * Loading state helpers
 */
function showLoadingState(section) {
  if (section === 'carousel') {
    const carousel = document.getElementById('assetCarousel');
    if (carousel) carousel.style.opacity = '0.6';
  } else if (section === 'chart') {
    const chart = document.getElementById('marketChart');
    if (chart) {
      const parent = chart.parentElement;
      if (parent) parent.style.opacity = '0.6';
    }
  } else if (section === 'news') {
    const news = document.getElementById('news-feed');
    if (news) news.style.opacity = '0.6';
  }
}

function hideLoadingState(section) {
  if (section === 'carousel') {
    const carousel = document.getElementById('assetCarousel');
    if (carousel) carousel.style.opacity = '1';
  } else if (section === 'chart') {
    const chart = document.getElementById('marketChart');
    if (chart) {
      const parent = chart.parentElement;
      if (parent) parent.style.opacity = '1';
    }
  } else if (section === 'news') {
    const news = document.getElementById('news-feed');
    if (news) news.style.opacity = '1';
  }
}

function showError(message) {
  console.error(message);
  // Could add toast notification here
}
