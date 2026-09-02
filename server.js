require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve ScrapScout website
app.use(express.static(path.join(__dirname, "public")));


/* =========================================================
   HELPERS
========================================================= */

function cleanNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (!cleaned) return null;

    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}


function getPrice(item) {

  // CaptAPI normally provides priceAmount in minor units
  if (typeof item?.priceAmount === "number") {
    return item.priceAmount / 100;
  }

  // Sometimes price itself is already a number
  if (typeof item?.price === "number") {
    return item.price;
  }

  // Price may be a formatted string
  if (typeof item?.price === "string") {
    return cleanNumber(item.price);
  }

  // Handle price object
  if (item?.price && typeof item.price === "object") {

    const objectPrice =
      item.price.amount ??
      item.price.value ??
      item.price.price ??
      null;

    return cleanNumber(objectPrice);
  }

  // Other possible API formats
  if (item?.amount !== undefined) {
    return cleanNumber(item.amount);
  }

  return null;
}


function normalize(item, source) {

  const price = getPrice(item);

  const location =
    item?.location?.city ||
    item?.location?.name ||
    item?.city ||
    item?.location ||
    "";

  const image =
    item?.image ||
    item?.imageUrl ||
    item?.thumbnail ||
    item?.photos?.[0] ||
    null;

  const title =
    item?.title ||
    item?.name ||
    "Untitled listing";

  const url =
    item?.url ||
    item?.listingUrl ||
    item?.link ||
    null;

  const id =
    item?.id ||
    item?.listingId ||
    `${source}-${title}-${location}`;


  return {

    id,

    source,

    title,

    price,

    priceFormatted:
      price !== null
        ? `£${price.toLocaleString("en-GB", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}`
        : "Price unavailable",

    location,

    image,

    url,

    description:
      item?.description || "",

    condition:
      item?.condition || "",

    createdAt:
      item?.createdAt || null,

    status:
      item?.status || "available",

    isSold:
      Boolean(item?.isSold),

    isLocal:
      item?.isLocal ?? null,

    shipsOutsideRadius:
      item?.shipsOutsideRadius ?? null
  };
}


/* =========================================================
   CAPTAPI REQUEST
========================================================= */

async function captapiRequest(url) {

  const apiKey =
    process.env.CAPTAPI_API_KEY;

  if (!apiKey) {

    const error = new Error(
      "CAPTAPI_API_KEY is not configured on Render."
    );

    error.status = 500;

    throw error;
  }


  const response = await fetch(url, {

    method: "GET",

    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json"
    }
  });


  const text = await response.text();

  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = {
      raw: text
    };
  }


  if (!response.ok) {

    const message =
      body?.message ||
      body?.error ||
      body?.detail ||
      `CaptAPI returned HTTP ${response.status}`;

    const error = new Error(message);

    error.status = response.status;

    throw error;
  }


  return body;
}


/* =========================================================
   FACEBOOK MARKETPLACE
========================================================= */

async function facebookSearch(args) {

  const params =
    new URLSearchParams();


  params.set("q", args.q);

  params.set(
    "location",
    args.location
  );

  // Keep results reasonably sized
  params.set("limit", "50");

  // Local vehicle hunting
  params.set(
    "deliveryMethod",
    "local_pickup"
  );

  if (args.maxPrice) {

    params.set(
      "maxPrice",
      args.maxPrice
    );
  }

  if (args.radius) {

    params.set(
      "radiusMiles",
      args.radius
    );
  }

  // Cache can save CaptAPI credits
  if (args.cache) {

    params.set(
      "cache",
      "true"
    );
  }


  const url =
    `https://api.captapi.com/v1/facebook/marketplace-search?${params.toString()}`;


  const body =
    await captapiRequest(url);


  const raw =
    body?.data?.items ??
    body?.data?.listings ??
    body?.items ??
    body?.listings ??
    [];


  const listings =
    Array.isArray(raw)
      ? raw.map(item =>
          normalize(item, "Facebook Marketplace")
        )
      : [];


  return {

    listings,

    meta: {

      totalReturned:
        body?.data?.totalReturned ??
        listings.length,

      hasMore:
        body?.data?.hasMore ??
        false,

      nextCursor:
        body?.data?.nextCursor ??
        null
    }
  };
}


/* =========================================================
   GUMTREE
========================================================= */

async function gumtreeSearch(args) {

  const apiUrl =
    process.env.GUMTREE_API_URL;


  if (!apiUrl) {

    const error = new Error(
      "Gumtree API is not configured yet."
    );

    error.status = 503;

    throw error;
  }


  const params =
    new URLSearchParams();

  params.set("q", args.q);
  params.set("location", args.location);


  if (args.maxPrice) {
    params.set(
      "maxPrice",
      args.maxPrice
    );
  }


  if (args.radius) {
    params.set(
      "radius",
      args.radius
    );
  }


  const url =
    `${apiUrl}?${params.toString()}`;


  const headers = {
    "Accept": "application/json"
  };


  if (process.env.GUMTREE
