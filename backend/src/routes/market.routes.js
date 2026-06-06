const express = require("express");
const rapidApiClient = require("../utils/rapid-api-client");
const cacheManager = require("../utils/cache-manager");

const router = express.Router();

/**
 * GET /market/ticker/trending
 * FETCHES EVERYTHING THE API PROVIDES LOCALLY
 * No more hardcoded arrays! We pull directly from Yahoo Finance's global summary.
 */
router.get("/market/ticker/trending", async (req, res) => {
  try {
    // 1. Fetch live summary overview data payload from your backend utility module
    const rawMarketData = await rapidApiClient.getLiveTrendingTickers();

    // 2. Return whatever assets Yahoo Finance returned directly back to the frontend
    res.status(200).json({
      success: true,
      data: rawMarketData, // Fully dynamic array of objects passed straight through
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Dynamic Trending endpoint error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /market/ticker/:symbol
 * Fetch current price for a specific asset token via single-source API
 */
router.get("/market/ticker/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    // Direct symbol handling. Whatever the user looks up goes straight to Yahoo
    const data = await rapidApiClient.getStockPrice(symbol.toUpperCase());

    res.status(200).json({
      success: true,
      data,
      cacheAge: cacheManager.getAge("stock", symbol.toUpperCase()),
    });
  } catch (error) {
    console.error("Ticker error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /market/trends/:symbol?days=7
 * Fetch real historical price timelines for any dynamic asset from Yahoo Finance
 */
router.get("/market/trends/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 7 } = req.query;

    const apiSymbol = symbol.toUpperCase();

    // Call Yahoo Finance historical endpoint with the asset symbol directly
    const data = await rapidApiClient.getStockTrend(apiSymbol, parseInt(days));

    res.status(200).json({
      success: true,
      data,
      cacheAge: cacheManager.getAge("trend", `${apiSymbol}:${days}d`),
    });
  } catch (error) {
    console.error("Trends error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * =========================================================================
 * 🔒 CRITICAL UNTOUCHED FEATURE: FINANCIAL NEWS ROUTE
 * =========================================================================
 */
router.get("/market/news", async (req, res) => {
  try {
    const { query = "US stock market", limit = 5 } = req.query;
    const data = await rapidApiClient.getFinancialNews(query, parseInt(limit));

    res.status(200).json({
      success: true,
      data,
      cacheAge: cacheManager.getAge("news", `${query}:${limit}`),
    });
  } catch (error) {
    console.error("News error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /market/multi?symbols=AAPL,MSFT,BTC-USD
 * Fetch multiple assets concurrently from our single Yahoo engine query list
 */
router.get("/market/multi", async (req, res) => {
  try {
    const { symbols = "" } = req.query;

    const stockList = symbols ? symbols.split(",").map((s) => s.trim()) : [];

    const assetsData = stockList.length > 0 
      ? await rapidApiClient.getMultipleStockPrices(stockList) 
      : [];

    res.status(200).json({
      success: true,
      data: {
        stocks: assetsData,
        cryptocurrencies: [] 
      },
    });
  } catch (error) {
    console.error("Multi error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
