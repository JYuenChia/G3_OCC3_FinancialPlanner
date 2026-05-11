const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { connectDB } = require("./db");
const apiRoutes = require("./routes");
const rapidApiClient = require("./utils/rapid-api-client");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "API server is running" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRoutes);

async function start() {
  await connectDB();
  
  // Pre-fetch trend data on startup to avoid 403/429 errors
  try {
    await rapidApiClient.prefetchTrendingData();
  } catch (error) {
    console.warn("Pre-fetch error:", error.message);
    // Continue startup even if pre-fetch fails
  }
  
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
