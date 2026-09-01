require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Your index.html, style.css and index.js are in the root
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ScrapScout",
    captapiConfigured: Boolean(process.env.CAPTAPI_API_KEY)
  });
});

app.get("/api/search", (_req, res) => {
  res.json({
    listings: [],
    message: process.env.CAPTAPI_API_KEY
      ? "Captapi key detected."
      : "Captapi API key is missing."
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`ScrapScout running on port ${PORT}`);
});
