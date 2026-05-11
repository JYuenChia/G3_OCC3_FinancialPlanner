/**
 * Rapid API Client - Wrapper for external API calls
 * Handles Yahoo Finance (stocks), CoinGecko (crypto), and NewsAPI (news)
 */

const axios = require('axios');
const cacheManager = require('./cache-manager');

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'demo';

// Mock data for fallback when API fails (development/testing)
const mockStockData = {
  'AAPL': { price: 185.20, open: 183.50, high: 186.75, low: 182.80, volume: 52300000, priceChange: 1.70, priceChangePercent: 0.92 },
  '^GSPC': { price: 5234.80, open: 5210.00, high: 5240.00, low: 5200.00, volume: 0, priceChange: 24.80, priceChangePercent: 0.48 },
  '^IXIC': { price: 16325.45, open: 16200.00, high: 16350.00, low: 16100.00, volume: 0, priceChange: 125.45, priceChangePercent: 0.77 },
  'GC=F': { price: 2125.80, open: 2118.50, high: 2130.00, low: 2120.00, volume: 0, priceChange: 7.30, priceChangePercent: 0.34 },
};

const mockCryptoData = {
  'bitcoin': { price: 81401.50, marketCap: 1612030000000, volume24h: 36230000000, priceChange: 2450.50, priceChangePercent: 3.11 },
  'ethereum': { price: 3120.75, marketCap: 375290000000, volume24h: 18920000000, priceChange: 95.25, priceChangePercent: 3.15 },
};

class RapidApiClient {
  /**
   * Get stock/index price from Yahoo Finance with deduplication
   */
  async getStockPrice(symbol) {
    const cached = cacheManager.get('stock', symbol);
    if (cached) return cached;

    // Check if request is already in flight
    const inFlight = cacheManager.getInFlight('stock', symbol);
    if (inFlight) return inFlight;

    // Create the promise and track it to prevent duplicate requests
    const promise = this._fetchStockPriceInternal(symbol);
    cacheManager.setInFlight('stock', symbol, promise);
    
    return promise;
  }

  /**
   * Internal method to fetch stock price
   */
  async _fetchStockPriceInternal(symbol) {
    try {
      console.log(`Fetching stock price for ${symbol}...`);
      const response = await axios.get(
        `https://yahoofinance.p.rapidapi.com/stock/${symbol}/history?interval=1d&range=1d`,
        {
          headers: {
            'x-rapidapi-key': RAPID_API_KEY,
            'x-rapidapi-host': 'yahoofinance.p.rapidapi.com',
          },
          timeout: 5000,
        }
      );

      const data = response.data;
      if (data.prices && data.prices.length > 0) {
        const latest = data.prices[data.prices.length - 1];
        const priceChange = latest.close - latest.open;
        const priceChangePercent = (priceChange / latest.open) * 100;
        
        const result = {
          symbol,
          price: latest.close,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          volume: latest.volume,
          priceChange: parseFloat(priceChange.toFixed(2)),
          priceChangePercent: parseFloat(priceChangePercent.toFixed(2)),
          timestamp: new Date(latest.date * 1000),
          source: 'yahoo-finance-api',
        };
        cacheManager.set('stock', symbol, result);
        return result;
      }

      throw new Error('No price data found');
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error.message);
      
      // Fallback to mock data for development
      const mock = mockStockData[symbol];
      if (mock) {
        const result = {
          symbol,
          ...mock,
          timestamp: new Date(),
          source: 'mock-data',
          warning: 'Using mock data - API unavailable',
        };
        cacheManager.set('stock', symbol, result);
        return result;
      }
      
      throw new Error(`Failed to fetch stock price for ${symbol}`);
    }
  }

  /**
   * Get multiple stocks at once
   */
  async getMultipleStockPrices(symbols) {
    try {
      const promises = symbols.map((symbol) =>
        this.getStockPrice(symbol).catch(() => null)
      );
      const results = await Promise.all(promises);
      return results.filter((r) => r !== null);
    } catch (error) {
      console.error('Error fetching multiple stock prices:', error.message);
      throw error;
    }
  }

  /**
   * Get stock price trend (historical data)
   */
  async getStockTrend(symbol, days = 7) {
    const cacheKey = `${symbol}:${days}d`;
    const cached = cacheManager.get('trend', cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log(`Fetching trend for ${symbol} (${days} days)...`);
      const range = days <= 7 ? '1mo' : days <= 30 ? '3mo' : '1y';
      const response = await axios.get(
        `https://yahoofinance.p.rapidapi.com/stock/${symbol}/history?interval=1d&range=${range}`,
        {
          headers: {
            'x-rapidapi-key': RAPID_API_KEY,
            'x-rapidapi-host': 'yahoofinance.p.rapidapi.com',
          },
          timeout: 5000,
        }
      );

      const prices = response.data.prices || [];
      const recent = prices.slice(-days).map((p) => ({
        date: new Date(p.date * 1000).toLocaleDateString(),
        open: p.open,
        close: p.close,
        high: p.high,
        low: p.low,
      }));

      const result = {
        symbol,
        data: recent,
        currency: 'USD',
        source: 'yahoo-finance-api',
      };
      // Cache with 24-hour TTL
      cacheManager.set('trend', cacheKey, result, 24 * 60 * 60);
      return result;
    } catch (error) {
      console.error(`Error fetching trend for ${symbol}:`, error.message);
      
      // Use realistic mock data
      const result = this._generateMockTrendData(symbol, days);
      // Cache mock data with 5-minute TTL (shorter than real data)
      cacheManager.set('trend', cacheKey, result, 5 * 60);
      return result;
    }
  }

  /**
   * Get cryptocurrency price from CoinGecko (free, no API key needed) with deduplication
   */
  async getCryptoPrice(cryptoId) {
    const cached = cacheManager.get('crypto', cryptoId);
    if (cached) return cached;

    // Check if request is already in flight
    const inFlight = cacheManager.getInFlight('crypto', cryptoId);
    if (inFlight) return inFlight;

    // Create the promise and track it to prevent duplicate requests
    const promise = this._fetchCryptoPriceInternal(cryptoId);
    cacheManager.setInFlight('crypto', cryptoId, promise);
    
    return promise;
  }

  /**
   * Internal method to fetch crypto price
   */
  async _fetchCryptoPriceInternal(cryptoId) {
    try {
      console.log(`Fetching crypto price for ${cryptoId}...`);
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
        { timeout: 5000 }
      );

      const data = response.data[cryptoId];
      if (!data) throw new Error(`No data for ${cryptoId}`);

      const result = {
        id: cryptoId,
        price: data.usd,
        marketCap: data.usd_market_cap,
        volume24h: data.usd_24h_vol,
        priceChange: 0, // CoinGecko doesn't provide absolute change, only percent
        priceChangePercent: data.usd_24h_change || 0,
        timestamp: new Date(),
        source: 'coingecko-api',
      };
      cacheManager.set('crypto', cryptoId, result);
      return result;
    } catch (error) {
      console.error(`Error fetching crypto price for ${cryptoId}:`, error.message);
      
      // Mock crypto data
      const mock = mockCryptoData[cryptoId.toLowerCase()];
      
      if (mock) {
        const result = {
          id: cryptoId,
          ...mock,
          timestamp: new Date(),
          source: 'mock-data',
          warning: 'Using mock data - API unavailable',
        };
        cacheManager.set('crypto', cryptoId, result);
        return result;
      }
      
      throw new Error(`Failed to fetch crypto price for ${cryptoId}`);
    }
  }

  /**
   * Get multiple cryptocurrencies at once
   */
  async getMultipleCryptoPrices(cryptoIds) {
    try {
      const promises = cryptoIds.map((id) =>
        this.getCryptoPrice(id).catch(() => null)
      );
      const results = await Promise.all(promises);
      return results.filter((r) => r !== null);
    } catch (error) {
      console.error('Error fetching multiple crypto prices:', error.message);
      throw error;
    }
  }

  /**
   * Get financial news
   */
  async getFinancialNews(query = 'finance', limit = 10) {
    const cached = cacheManager.get('news', `${query}:${limit}`);
    if (cached) return cached;

    try {
      console.log(`Fetching news for "${query}"...`);
      
      // Try NewsAPI
      if (NEWS_API_KEY && NEWS_API_KEY !== 'demo') {
        const response = await axios.get(
          `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=${limit}`,
          {
            headers: { 'X-Api-Key': NEWS_API_KEY },
            timeout: 5000,
          }
        );

        const articles = (response.data.articles || []).map((article) => ({
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          source: article.source.name,
          author: article.author,
          content: article.content,
        }));

        const result = {
          articles,
          totalResults: response.data.totalResults,
          timestamp: new Date(),
          source: 'newsapi',
        };
        cacheManager.set('news', `${query}:${limit}`, result);
        return result;
      }

      throw new Error('NewsAPI key not configured');
    } catch (error) {
      console.error('Error fetching news:', error.message);
      
      // Return mock news data
      const mockNews = [
        {
          title: 'Market Rally Continues as Fed Signals Patience on Rates',
          description: 'Stock markets reached new highs as investors react positively to Federal Reserve comments.',
          url: 'https://example.com/news1',
          urlToImage: null,
          publishedAt: new Date().toISOString(),
          source: 'Financial Times',
          author: 'Reporter',
          content: 'Markets continue to show strength...'
        },
        {
          title: 'Bitcoin Breaks Through $68,000 Resistance Level',
          description: 'Cryptocurrency market shows positive momentum with bitcoin leading the charge.',
          url: 'https://example.com/news2',
          urlToImage: null,
          publishedAt: new Date(Date.now() - 3600000).toISOString(),
          source: 'CoinDesk',
          author: 'Reporter',
          content: 'Bitcoin has been strong...'
        },
      ];

      const result = {
        articles: mockNews,
        totalResults: 2,
        timestamp: new Date(),
        source: 'mock-data',
        warning: 'Using mock news - API unavailable',
      };
      cacheManager.set('news', `${query}:${limit}`, result);
      return result;
    }
  }

  /**
   * Get commodity price (Gold) from CoinGecko
   */
  async getCommodityPrice(commodityId) {
    const cached = cacheManager.get('commodity', commodityId);
    if (cached) return cached;

    try {
      console.log(`Fetching commodity price for ${commodityId}...`);
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${commodityId}&vs_currencies=usd`,
        { timeout: 5000 }
      );

      const data = response.data[commodityId];
      if (!data) throw new Error(`No data for ${commodityId}`);

      const result = {
        id: commodityId,
        price: data.usd,
        timestamp: new Date(),
        source: 'coingecko-api',
      };
      cacheManager.set('commodity', commodityId, result);
      return result;
    } catch (error) {
      console.error(`Error fetching commodity price for ${commodityId}:`, error.message);
      
      // Mock commodity data
      const result = {
        id: commodityId,
        price: 2342.50,
        timestamp: new Date(),
        source: 'mock-data',
        warning: 'Using mock data - API unavailable',
      };
      cacheManager.set('commodity', commodityId, result);
      return result;
    }
  }

  /**
   * Generate realistic mock trend data
   */
  _generateMockTrendData(symbol, days = 7) {
    const basePrice = mockStockData[symbol]?.price || 100;
    const mockData = [];
    let currentPrice = basePrice * 0.98; // Start 2% lower
    
    for (let i = -days; i <= 0; i++) {
      // Simulate daily price movement (±2%)
      const variation = (Math.random() - 0.5) * 4;
      currentPrice += (variation / 100) * currentPrice;
      
      mockData.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString(),
        open: currentPrice * 0.99,
        close: currentPrice,
        high: currentPrice * 1.02,
        low: currentPrice * 0.98,
      });
    }
    
    return {
      symbol,
      data: mockData,
      currency: 'USD',
      source: 'mock-data',
      warning: 'Using mock data - API unavailable',
    };
  }

  /**
   * Pre-fetch and cache all trending symbols' historical data on startup
   * This prevents 403/429 errors by pre-populating cache
   */
  async prefetchTrendingData() {
    const symbols = ['^GSPC', '^IXIC', 'AAPL'];
    const days = 7;
    
    console.log(`[Pre-fetch] Starting trend data pre-fetch for ${symbols.length} symbols...`);
    
    for (const symbol of symbols) {
      try {
        const cacheKey = `${symbol}:${days}d`;
        
        // Check if already cached
        const cached = cacheManager.get('trend', cacheKey);
        if (cached && cached.source !== 'mock-data') {
          console.log(`[Pre-fetch] ✓ ${symbol} already cached with real data`);
          continue;
        }
        
        // Try to fetch real data
        try {
          console.log(`[Pre-fetch] Fetching trend for ${symbol}...`);
          const response = await axios.get(
            `https://yahoofinance.p.rapidapi.com/stock/${symbol}/history?interval=1d&range=1mo`,
            {
              headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': 'yahoofinance.p.rapidapi.com',
              },
              timeout: 5000,
            }
          );

          const prices = response.data.prices || [];
          const recent = prices.slice(-days).map((p) => ({
            date: new Date(p.date * 1000).toLocaleDateString(),
            open: p.open,
            close: p.close,
            high: p.high,
            low: p.low,
          }));

          const result = {
            symbol,
            data: recent,
            currency: 'USD',
            source: 'yahoo-finance-api',
          };
          
          // Cache with long TTL (24 hours)
          cacheManager.set('trend', cacheKey, result, 24 * 60);
          console.log(`[Pre-fetch] ✓ ${symbol} fetched and cached (real data)`);
        } catch (apiError) {
          // Fall back to mock data
          console.warn(`[Pre-fetch] ⚠ Failed to fetch ${symbol} (${apiError.status || apiError.message}), using mock data`);
          const mockResult = this._generateMockTrendData(symbol, days);
          cacheManager.set('trend', cacheKey, mockResult, 24 * 60);
          console.log(`[Pre-fetch] ✓ ${symbol} cached with mock data`);
        }
      } catch (error) {
        console.error(`[Pre-fetch] ✗ Error processing ${symbol}:`, error.message);
      }
    }
    
    console.log(`[Pre-fetch] Trend data pre-fetch complete`);
  }
}

module.exports = new RapidApiClient();
