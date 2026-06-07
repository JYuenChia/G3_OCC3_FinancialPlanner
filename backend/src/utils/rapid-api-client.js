const axios = require('axios');

// Helper function to force the code to wait/sleep for a set number of milliseconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class RapidApiClient {
  constructor() {
    this.apiKey = process.env.RAPID_API_KEY;
    this.apiHost = 'yh-finance.p.rapidapi.com';
    this.baseUrl = 'https://yh-finance.p.rapidapi.com';
  }

  /**
   * Core request engine with built-in automatic retries for rate limits (429)
   */
  async _request(endpoint, params = {}, retries = 3, delay = 1000) {
    if (!this.apiKey) {
      throw new Error("RAPID_API_KEY is missing from your .env configuration file.");
    }

    const options = {
      method: 'GET',
      url: `${this.baseUrl}${endpoint}`,
      params: params,
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': this.apiHost
      }
    };

    try {
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      // If we hit a 429 (Rate Limit / Too Many Requests per second) and have retries left
      if (error.response && error.response.status === 429 && retries > 0) {
        console.warn(`⚠️ Rate limit hit (429) on ${endpoint}. Waiting ${delay}ms before retrying... (${retries} retries left)`);
        await sleep(delay);
        // Retry the request, doubling the wait time for safety (Exponential Backoff)
        return this._request(endpoint, params, retries - 1, delay * 2);
      }
      
      // If it's a real failure or we ran out of retries, throw it down the line
      throw error;
    }
  }

  /**
   * 1. LIVE TRENDING SUMMARY: Returns pure live data array from Yahoo Finance
   */
  async getLiveTrendingTickers() {
    try {
      const rawData = await this._request('/market/v2/get-summary', { region: 'US' });
      const results = rawData?.marketSummaryAndSparkResponse?.result || [];
      
      return results.map(item => {
        // 1. Extract raw basis metrics directly from Yahoo's response layout
        const currentPrice = item.regularMarketPrice?.raw || 0;
        const previousClose = item.regularMarketPreviousClose?.raw || 0;
        
        // 2. Perform manual mathematical delta calculations since the endpoint omits them
        let calculatedChange = 0;
        let calculatedPercent = 0;
        
        if (currentPrice > 0 && previousClose > 0) {
          calculatedChange = currentPrice - previousClose;
          calculatedPercent = (calculatedChange / previousClose) * 100;
        }

        return {
          symbol: item.symbol,
          label: item.shortName || item.longName || item.symbol.toUpperCase(),
          price: Number(currentPrice),
          change: Number(calculatedChange),
          changePercent: Number(calculatedPercent)
        };
      });
    } catch (error) {
      console.error("❌ Pure Yahoo Finance API summary download failed:", error.message);
      throw error;
    }
  }

  /**
   * 2. LIVE HISTORICAL CHART LINES
   * Groups data points by unique dates to prevent skipped-day gaps!
   */
  async getStockTrend(symbol, days = 8) {
    try {
      const apiSymbol = symbol.toUpperCase().trim();
      
      // We ask for a 3-week range ('5m' or '15m' intervals can cause gaps, 
      // so we use '1d' to force Yahoo to return exactly one closing price per market day)
      const options = {
        interval: '1d',
        symbol: apiSymbol,
        range: '1mo', // Pull 1 month of history so we have an uninterrupted sequence
        region: 'US'
      };

      const rawData = await this._request('/stock/v2/get-chart', options);
      const result = rawData?.chart?.result?.[0];
      
      if (!result) {
        throw new Error(`Yahoo Finance returned an empty chart array for: ${apiSymbol}`);
      }

      const timestamps = result?.timestamp || [];
      const closingPrices = result?.indicators?.quote?.[0]?.close || [];

      // Use a Map tracking mechanism to ensure we only collect UNIQUE calendar dates
      const uniqueDaysMap = new Map();

      timestamps.forEach((time, index) => {
        const closePrice = closingPrices[index];
        
        // Skip null data points where the market was closed or halted
        if (closePrice === null || closePrice === undefined) return;

        // Convert timestamp to a clean date string format (e.g., "Jun 1")
        const dateLabel = new Date(time * 1000).toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric' 
        });

        // Save the price. If the date appears multiple times, this safely keeps the latest close price
        uniqueDaysMap.set(dateLabel, parseFloat(closePrice.toFixed(2)));
      });

      // Convert our unique map records back into a clean chronological array
      let dataPoints = [];
      uniqueDaysMap.forEach((close, date) => {
        dataPoints.push({ date, close });
      });

      // Grab exactly the last 8 active market trading days from the chronological sequence
      if (dataPoints.length > days) {
        dataPoints = dataPoints.slice(-days);
      }

      return {
        symbol: apiSymbol,
        currency: result?.meta?.currency || 'USD',
        data: dataPoints // Passes a sequential day-by-day timeline array down to Chart.js
      };
    } catch (error) {
      console.error(`❌ Pure historical trend fetch failed for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * 3. LIVE SINGLE TICKER DETAILS
   */
  async getStockPrice(symbol) {
    const rawData = await this._request('/stock/v2/get-summary', { symbol: symbol.toUpperCase().trim(), region: 'US' });
    const priceData = rawData?.price;

    if (!priceData) throw new Error(`No real-time options data available for ${symbol}`);

    return {
      symbol: symbol.toUpperCase(),
      price: priceData.regularMarketPrice?.raw || 0,
      priceChange: priceData.regularMarketChange?.raw || 0,
      priceChangePercent: priceData.regularMarketChangePercent?.raw || 0,
      longName: priceData.longName || priceData.shortName || symbol
    };
  }

  /**
   * FINANCIAL NEWS FEED
   */
  async getFinancialNews(query, limit) {
    const axiosNews = require('axios');
    const newsKey = process.env.NEWS_API_KEY;
    if (!newsKey) throw new Error("NEWS_API_KEY is missing from your configuration.");
    const response = await axiosNews.get(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=${limit}&apiKey=${newsKey}`);
    return response.data;
  }
}

module.exports = new RapidApiClient();
