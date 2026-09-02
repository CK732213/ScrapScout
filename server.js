require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the ScrapScout website
app.use(express.static(path.join(__dirname, "public")));


// =====================================================
// HELPERS
// =====================================================

function cleanPrice(value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Number
  if (typeof value === "number") {
    // CaptAPI priceAmount is normally minor units
    if (Number.isInteger(value) && value > 1000) {
      return value / 100;
    }

    return value;
  }

  // Object
  if (typeof value === "object") {
    return cleanPrice(
      value.amount ??
      value.value ??
      value.price
