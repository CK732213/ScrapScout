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
      value.price ??
      value.display ??
      null
    );
  }

  // String
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(
      /(\d+(?:\.\d{1,2})?)/
    );

    if (!match) {
      return null;
    }

    return Number(match[1]);
  }

  return null;
}


function normalize(item, source) {

  const price =
    item?.price ??
    item?.priceFormatted ??
    cleanPrice(item?.priceAmount) ??
    cleanPrice(item?.amount) ??
    null;

  const title =
    item?.title ??
    item?.name ??
    item?.headline ??
    "Untitled listing";

  const id =
    item?.id ??
    item?.listingId ??
    item?.listing_id ??
    `${source}-${title}`;

  const image =
    item?.image ??
    item?.imageUrl ??
    item?.imageURL ??
    item?.thumbnail ??
    item?.photos?.[0]?.url ??
    item?.images?.[0]?.url ??
    null;

  const url =
    item?.url ??
    item?.link ??
    item?.listingUrl ??
    item?.listingURL ??
    null;

  const location =
    item?.location ??
    item?.locationName ??
    item?.city ??
    "";

  return {
    id,
    source,
    title,
    price,
    image,
    url,
    location
  };
}


// =====================================================
// CAPTAPI REQUEST
// =====================================================

async function captapiRequest(url) {

  const apiKey = process.env.CAPTAPI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "CAPTAPI_API_KEY is not configured in Render."
    );

    error.status = 500;

    throw error;
  }

  const response = await fetch(url, {
    method: "GET",

    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "x-api-key": apiKey,
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
      body?.message ??
      body?.error ??
      body?.detail ??
      `CaptAPI returned HTTP ${response.status}`;

    const error = new Error(
      typeof message === "string"
        ? message
        : JSON.stringify(message)
    );

    error.status = response.status;

    throw error;
  }

  return body;
}


// =====================================================
// FACEBOOK MARKETPLACE
// =====================================================

async function facebookSearch(args) {

  const params = new URLSearchParams();

  params.set("q", args.q);
  params.set("location", args.location);
  params.set("radiusMiles", args.radius);

  if (args.maxPrice) {
    params.set("maxPrice", args.maxPrice);
  }

  const url =
    `https://api.captapi.com/v1/facebook/marketplace-search?${params.toString()}`;

  console.log("Facebook search:", url);

  const body = await captapiRequest(url);

  const raw =
    body?.data?.items ??
    body?.data?.listings ??
    body?.items ??
    body?.listings ??
    [];

  const listings = Array.isArray(raw)
    ? raw.map(item =>
        normalize(item, "Facebook Marketplace")
      )
    : [];

  return {
    listings,

    meta: {
      totalReturned: listings.length,
      hasMore:
        Boolean(
          body?.data?.hasMore ??
          body?.hasMore ??
          false
        )
    }
  };
}


// =====================================================
// GUMTREE
// =====================================================

async function gumtreeSearch(args) {

  const apiUrl = process.env.GUMTREE_API_URL;

  if (!apiUrl) {

    const error = new Error(
      "Gumtree API is not configured yet. Add GUMTREE_API_URL in Render."
    );

    error.status = 503;

    throw error;
  }

  const params = new URLSearchParams();

  params.set("q", args.q);
  params.set("location", args.location);
  params.set("radiusMiles", args.radius);

  if (args.maxPrice) {
    params.set("maxPrice", args.maxPrice);
  }

  const separator =
    apiUrl.includes("?") ? "&" : "?";

  const url =
    `${apiUrl}${separator}${params.toString()}`;

  console.log("Gumtree search:", url);

  const response = await fetch(url, {
    headers: {
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
      body?.message ??
      body?.error ??
      `Gumtree returned HTTP ${response.status}`;

    const error = new Error(
      typeof message === "string"
        ? message
        : JSON.stringify(message)
    );

    error.status = response.status;

    throw error;
  }

  const raw =
    body?.data?.items ??
    body?.data?.listings ??
    body?.items ??
    body?.listings ??
    [];

  const listings = Array.isArray(raw)
    ? raw.map(item =>
        normalize(item, "Gumtree")
      )
    : [];

  return {
    listings,

    meta: {
      totalReturned: listings.length,
      hasMore: false
    }
  };
}


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (_req, res) => {

  res.json({
    ok: true,
    service: "ScrapScout",

    captapiConfigured:
      Boolean(process.env.CAPTAPI_API_KEY),

    gumtreeConfigured:
      Boolean(process.env.GUMTREE_API_URL)
  });
});


// =====================================================
// SEARCH
// =====================================================

app.get("/api/search", async (req, res) => {

  try {

    const args = {

      q:
        String(
          req.query.q || "BMW"
        ).trim(),

      location:
        String(
          req.query.location ||
          "Liverpool"
        ).trim(),

      maxPrice:
        String(
          req.query.maxPrice || ""
        ).trim(),

      radius:
        String(
          req.query.radius || "10"
        ).trim(),

      cache:
        req.query.cache === "true"
    };


    if (!args.q || !args.location) {

      return res.status(400).json({
        ok: false,
        message:
          "Make/model and location are required."
      });
    }


    const source =
      String(
        req.query.source || "facebook"
      ).toLowerCase();


    let result;


    if (source === "gumtree") {

      result =
        await gumtreeSearch(args);

    } else {

      result =
        await facebookSearch(args);
    }


    res.json({

      ok: true,

      query: args,

      source,

      ...result
    });


  } catch (error) {

    console.error(
      "SEARCH ERROR:",
      error
    );


    res.status(
      error.status || 500
    ).json({

      ok: false,

      message:
        error.message ||
        "Search failed."
    });
  }
});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

  console.log(
    `ScrapScout running on port ${PORT}`
  );

});
