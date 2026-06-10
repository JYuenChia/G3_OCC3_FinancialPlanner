let marketChart;
let currentAsset = '^GSPC';
let currentAssetLabel = 'S&P 500 Index';

//INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
  loadCarouselAndDropdownData(); 
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

// Fetches live data and dynamically populates both the carousel and the dropdown selection menu
async function loadCarouselAndDropdownData() {
  try {
    showLoadingState('carousel');
    
    const response = await apiClient.getMarketTrendingTickers()
      .catch(err => ({ success: false, data: [], error: err.message }));
    
    if (!response.success || !response.data || response.data.length === 0) {
      throw new Error('Failed to fetch dynamic summary data from API');
    }

    const tickers = response.data;
    
    // Set our default starting asset to the first real asset returned by the API
    if (tickers[0]) {
      currentAsset = tickers[0].symbol || '^GSPC';
      currentAssetLabel = tickers[0].label || 'Asset';
    }
    
    initChart();

    const assetSelector = document.getElementById('assetSelector');
    if (assetSelector) {
      assetSelector.innerHTML = '';
      
      tickers.forEach(ticker => {
        const symbol = ticker.symbol;
        const label = ticker.label || symbol;
        if (!symbol) return;

        const option = document.createElement('option');
        option.value = symbol;
        option.textContent = label;
        assetSelector.appendChild(option);
      });
    }

    const carouselInner = document.querySelector('.carousel-inner');
    if (!carouselInner) return;

    carouselInner.innerHTML = '';

    const chunkSize = 3;
    let slideIndex = 0;

    for (let i = 0; i < tickers.length; i += chunkSize) {
      const chunk = tickers.slice(i, i + chunkSize);
      
      const slideItem = document.createElement('div');
      slideItem.className = `carousel-item ${slideIndex === 0 ? 'active' : ''}`;
      
      const row = document.createElement('div');
      row.className = 'row g-3';

      chunk.forEach(ticker => {
        const symbol = ticker.symbol;
        const label = ticker.label || symbol;
        if (!symbol) return;

        const col = document.createElement('div');
        col.className = 'col-md-4';

        const changePercentValue = typeof ticker.changePercent === 'number' ? ticker.changePercent : 0;
        const priceValue = typeof ticker.price === 'number' ? ticker.price : 0;


        // Accounts for Positive (+Green), Negative (-Red), and Flat (0.00 Gray)
        let changeSign = '';
        let colorClass = 'text-muted'; // Neutral gray fallback for flat markets

        if (changePercentValue > 0) {
          changeSign = '+';
          colorClass = 'text-success'; // Market Green
        } else if (changePercentValue < 0) {
          changeSign = ''; 
          colorClass = 'text-danger'; // Market Red
        }

        const formattedPrice = priceValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const formattedChange = changePercentValue.toFixed(2);

        col.innerHTML = `
          <div class="card feature-card shadow-sm p-3 border-0 bg-white h-100" style="cursor: pointer;" onclick="changeChartAsset('${symbol}', '${label.replace(/'/g, "\\'")}')">
            <h6 class="text-muted text-uppercase mb-2 fw-bold small">${label}</h6>
            <div class="h3 m-0 fw-bold ${colorClass}">$${formattedPrice}</div>
            <div class="small fw-semibold ${colorClass} mt-1">${changeSign}${formattedChange}% Today</div>
          </div>
        `;
        row.appendChild(col);
      });

      slideItem.appendChild(row);
      carouselInner.appendChild(slideItem);
      slideIndex++;
    }

    hideLoadingState('carousel');
  } catch (error) {
    console.error('Error loading dynamic carousel and dropdown data:', error);
    showError('Failed to load market data');
    hideLoadingState('carousel');
  }
}

async function changeChartAsset(symbol, label) {
  currentAsset = symbol;
  currentAssetLabel = label;
  
  const assetSelector = document.getElementById('assetSelector');
  if (assetSelector) {
    assetSelector.value = symbol;
  }
  
  await initChart();
}

// Initialize chart drawing lines directly from the dynamic endpoints
async function initChart() {
  try {
    showLoadingState('chart');
    
    const trendData = await apiClient.getMarketTrends(currentAsset, 8);

    if (!trendData?.data?.data || trendData.data.data.length === 0) {
      throw new Error(`No real-time chart data arrays returned for: ${currentAsset}`);
    }

    const ctx = document.getElementById('marketChart').getContext('2d');
    const prices = trendData.data.data.map(p => p.close);
    const labels = trendData.data.data.map(p => p.date);

    if (marketChart) {
      marketChart.destroy();
    }
    
    let chartColor = '#1a53bd'; 
    const checkTicker = currentAsset.toLowerCase();

    if (checkTicker.includes('gspc')) {
      chartColor = '#00b4d8'; 
    } else if (checkTicker.includes('btc')) {
      chartColor = '#f7931a'; 
    } else if (checkTicker.includes('eth')) {
      chartColor = '#a484e9'; 
    } else if (checkTicker.includes('aapl')) {
      chartColor = '#4a4a4a'; 
    } else if (checkTicker.includes('gc=f') || checkTicker.includes('gold')) {
      chartColor = '#e5a93b'; 
    } else if (checkTicker.includes('ixic') || checkTicker.includes('nasdaq')) {
      chartColor = '#4682b4'; 
    } else {
      chartColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    marketChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: currentAssetLabel,
          data: prices,
          borderColor: chartColor,
          backgroundColor: chartColor + '22',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: chartColor,
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

function setupEventListeners() {
  const assetSelector = document.getElementById('assetSelector');
  if (assetSelector) {
    window.handleAssetChange = async (e) => {
      currentAsset = e.target.value;
      currentAssetLabel = assetSelector.options[assetSelector.selectedIndex].text;
      await initChart();
    };
    assetSelector.addEventListener('change', window.handleAssetChange);
  }
}

//FINANCIAL NEWS LOGIC
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

    const articlesWithImages = newsData.data.articles.filter(article => {
      return article.urlToImage && 
             article.urlToImage.trim() !== "" && 
             article.urlToImage.startsWith('http');
    });

    if (articlesWithImages.length === 0) {
      newsContainer.innerHTML = '<div class="list-group-item py-3 text-muted text-center">No articles with images available</div>';
      hideLoadingState('news');
      return;
    }

    newsContainer.innerHTML = articlesWithImages.slice(0, 10).map((article, index) => {
      const imageUrl = article.urlToImage;
      const date = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : new Date().toLocaleDateString();
      
      // Safe string resolution engine for the source metadata
      const sourceName = (article.source && typeof article.source === 'object' && article.source.name) 
                          ? article.source.name 
                          : (typeof article.source === 'string' ? article.source : 'NEWS');
      
      return `
      <div class="list-group-item border-0 border-bottom py-3 bg-transparent px-3">
        <div class="row g-3 align-items-start">
          <div class="col-4">
            <div class="ratio ratio-4x3 shadow-sm rounded-2 overflow-hidden">
              <img src="${imageUrl}"
                class="object-fit-cover" 
                onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80';"
                alt="news thumb">
            </div>
          </div>
          <div class="col-8">
            <div class="fw-bolder text-uppercase mb-1" style="font-size: 0.65rem; color: #1a53bd;">
              ${sourceName}
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

    window.currentNews = articlesWithImages;
    hideLoadingState('news');
  } catch (error) {
    console.error('Error loading news:', error);
    const newsContainer = document.getElementById('news-feed');
    newsContainer.innerHTML = '<div class="list-group-item py-3 text-danger text-center">Failed to load news</div>';
    hideLoadingState('news');
  }
}

function showFullNews(index) {
  const articles = window.currentNews || [];
  const selected = articles[index];
  
  if (!selected) return;

  const displaySection = document.getElementById('bottom-news-display');
  const contentArea = document.getElementById('bottom-content-area');
  const sidebarImg = document.getElementById('news-sidebar-img');

  if (selected.urlToImage) {
    sidebarImg.style.backgroundImage = `url('${selected.urlToImage}')`;
  } else {
    sidebarImg.style.backgroundColor = '#f0f0f0';
  }

  // Safe string resolution engine for selection viewport
  const sourceName = (selected.source && typeof selected.source === 'object' && selected.source.name) 
                      ? selected.source.name 
                      : (typeof selected.source === 'string' ? selected.source : 'FINANCIAL NEWS');

  const date = new Date(selected.publishedAt).toLocaleDateString();
  contentArea.innerHTML = `
    <div class="text-uppercase mb-2 fw-bold" style="font-size: 0.75rem; color: #1a53bd; letter-spacing: 1px;">
      ${sourceName}
    </div>
    <h1 class="fw-bold mb-3" style="color: #d42c20 !important; font-size: 2.5rem; line-height: 1.1;">
      ${selected.title}
    </h1>
    <div class="mb-4 fw-bold" style="color: #007bff;">
      ${sourceName} | ${date}
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

// Refresh all sections concurrently
async function refreshAllData() {
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Refreshing...';
  }

  await Promise.all([
    loadCarouselAndDropdownData(),
    loadNews(),
  ]);

  if (refreshBtn) {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
  }
  
  updateLastUpdated();
}

function updateLastUpdated() {
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl) {
    const now = new Date();
    lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
  }
}

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
}
