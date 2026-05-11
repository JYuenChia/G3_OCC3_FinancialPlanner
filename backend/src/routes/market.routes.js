const express = require("express");
const rapidApiClient = require("../utils/rapid-api-client");
const cacheManager = require("../utils/cache-manager");

const router = express.Router();

/**
 * GET /market/ticker/trending
 * Fetch list of trending tickers (stocks and crypto) with 1-day change
 * Returns: [{ symbol, type, label, price, change, changePercent }]
 */
router.get("/market/ticker/trending", async (req, res) => {
  try {
    // Define trending assets: combination of stocks and crypto
    const trendingAssets = [
      { friendlyName: "sp500", apiSymbol: "^GSPC", type: "stock", label: "S&P 500" },
      { friendlyName: "nasdaq", apiSymbol: "^IXIC", type: "stock", label: "NASDAQ" },
      { friendlyName: "aapl", apiSymbol: "AAPL", type: "stock", label: "Apple (AAPL)" },
      { friendlyName: "btc", apiSymbol: "bitcoin", type: "crypto", label: "Bitcoin (BTC)" },
      { friendlyName: "eth", apiSymbol: "ethereum", type: "crypto", label: "Ethereum (ETH)" },
      { friendlyName: "gold", apiSymbol: "GC=F", type: "stock", label: "Gold (XAU)" },
    ];

    // Fetch all trending assets in parallel
    const results = await Promise.all(
      trendingAssets.map(async (asset) => {
        try {
          let data;
          if (asset.type === "crypto") {
            data = await rapidApiClient.getCryptoPrice(asset.apiSymbol);
          } else {
            data = await rapidApiClient.getStockPrice(asset.apiSymbol);
          }

          return {
            symbol: asset.friendlyName,
            apiSymbol: asset.apiSymbol,
            type: asset.type,
            label: asset.label,
            price: data.price || 0,
            change: data.priceChange || 0,
            changePercent: data.priceChangePercent || 0,
          };
        } catch (error) {
          console.error(`Error fetching ${asset.label}:`, error.message);
          return {
            symbol: asset.friendlyName,
            apiSymbol: asset.apiSymbol,
            type: asset.type,
            label: asset.label,
            price: 0,
            change: 0,
            changePercent: 0,
            error: error.message,
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      data: results,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Trending error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /market/ticker/:symbol
 * Fetch current price for a stock, index, or crypto
 * Examples: AAPL, ^GSPC (S&P 500), bitcoin, ethereum, gold
 */
router.get("/market/ticker/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    // Map friendly names to API identifiers and classify them
    const symbolMap = {
      sp500: { apiSymbol: "^GSPC", type: "stock" },
      "s&p500": { apiSymbol: "^GSPC", type: "stock" },
      nasdaq: { apiSymbol: "^IXIC", type: "stock" },
      btc: { apiSymbol: "bitcoin", type: "crypto" },
      bitcoin: { apiSymbol: "bitcoin", type: "crypto" },
      eth: { apiSymbol: "ethereum", type: "crypto" },
      ethereum: { apiSymbol: "ethereum", type: "crypto" },
      xau: { apiSymbol: "GC=F", type: "stock" },
      gold: { apiSymbol: "GC=F", type: "stock" },
      aapl: { apiSymbol: "AAPL", type: "stock" },
    };

    const lowerSymbol = symbol.toLowerCase();
    let apiSymbol, type;

    if (symbolMap[lowerSymbol]) {
      apiSymbol = symbolMap[lowerSymbol].apiSymbol;
      type = symbolMap[lowerSymbol].type;
    } else {
      // Default: check if it starts with ^ (index marker)
      apiSymbol = symbol.toUpperCase();
      type = apiSymbol.includes("^") ? "stock" : "stock"; // Default to stock
    }

    let data;
    if (type === "crypto") {
      data = await rapidApiClient.getCryptoPrice(apiSymbol);
    } else {
      data = await rapidApiClient.getStockPrice(apiSymbol);
    }

    res.status(200).json({
      success: true,
      data,
      cacheAge: cacheManager.getAge(type, apiSymbol),
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
 * Fetch historical price data for charting
 */
router.get("/market/trends/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 7 } = req.query;

    // Map friendly names to API identifiers
    const symbolMap = {
      sp500: { apiSymbol: "^GSPC", type: "stock" },
      "s&p500": { apiSymbol: "^GSPC", type: "stock" },
      nasdaq: { apiSymbol: "^IXIC", type: "stock" },
      btc: { apiSymbol: "bitcoin", type: "crypto" },
      bitcoin: { apiSymbol: "bitcoin", type: "crypto" },
      eth: { apiSymbol: "ethereum", type: "crypto" },
      ethereum: { apiSymbol: "ethereum", type: "crypto" },
      gold: { apiSymbol: "GC=F", type: "stock" },
      xau: { apiSymbol: "GC=F", type: "stock" },
      aapl: { apiSymbol: "AAPL", type: "stock" },
    };

    const lowerSymbol = symbol.toLowerCase();
    const mapped = symbolMap[lowerSymbol];
    const apiSymbol = mapped?.apiSymbol || symbol.toUpperCase();
    const type = mapped?.type || "stock";

    let data;
    if (type === "crypto") {
      // For crypto, use mock trend data (CoinGecko doesn't provide historical)
      data = rapidApiClient._generateMockTrendData(apiSymbol, parseInt(days));
    } else {
      // For stocks (including GC=F gold futures), use Yahoo Finance
      data = await rapidApiClient.getStockTrend(apiSymbol, parseInt(days));
    }

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
 * GET /market/news?query=finance&limit=10
 * Fetch latest financial news
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
 * GET /market/multi?symbols=AAPL,MSFT&cryptos=bitcoin,ethereum
 * Fetch multiple stocks and cryptos at once
 */
router.get("/market/multi", async (req, res) => {
  try {
    const { symbols = "", cryptos = "" } = req.query;

    const stockList = symbols ? symbols.split(",").map((s) => s.trim()) : [];
    const cryptoList = cryptos ? cryptos.split(",").map((c) => c.trim()) : [];

    const [stocks, cryptocurrencies] = await Promise.all([
      stockList.length > 0 ? rapidApiClient.getMultipleStockPrices(stockList) : Promise.resolve([]),
      cryptoList.length > 0 ? rapidApiClient.getMultipleCryptoPrices(cryptoList) : Promise.resolve([]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stocks,
        cryptocurrencies,
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
