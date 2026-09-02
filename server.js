require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


/* =====================================================
   PRICE
===================================================== */

function getPrice(item) {
  const value =
    item?.price ??
    item?.priceAmount ??
    item?.amount ??
    null;

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    // CaptAPI priceAmount is minor units
    if (item?.priceAmount !== undefined && item?.price === undefined) {
      return value / 100;
    }

    return value;
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/,/g, "")
      .replace(/[£$€]/g, "")
      .trim();

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : null;
  }

  if (typeof value === "object") {
    const nested =
      value.amount ??
      value.value ??
      value.price ??
      value.display ??
      null;

    return getPrice({
      price: nested
    });
  }

  return null;
}


/* =====================================================
   LOCATION
===================================================== */

function getLocation(item) {
  const location = item?.location;

  if (typeof location === "string") {
    return location;
  }

  if (location && typeof location === "object") {
    return (
      location.name ??
      location.city ??
      location.town ??
      location.address ??
      location.postcode ??
      location.formatted ??
      location.displayName ??
      ""
    );
  }

  return (
    item?.locationName ??
    item?.city ??
    item?.town ??
    item?.postcode ??
    ""
  );
}


/* =====================================================
   GOOGLE MAPS
===================================================== */

function createGoogleMapsUrl(location) {
  if (!location) {
    return null;
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(location)
  );
}


/* =====================================================
   NORMALISE LISTING
===================================================== */

function normalize(item, source) {

  const price = getPrice(item);

  const location = getLocation(item);

  const title =
    item?.title ??
    item?.name ??
    item?.headline ??
    "Untitled listing";

  const image =
    item?.image ??
    item?.imageUrl ??
    item?.imageURL ??
    item?.thumbnail ??
    item?.photos?.[0]?.url ??
    item?.photos?.[0] ??
    item?.images?.[0]?.url ??
    item?.images?.[0] ??
    null;

  const url =
    item?.url ??
    item?.link ??
    item?.listingUrl ??
    item?.listingURL ??
    null;

  const id =
    item?.id ??
    item?.listingId ??
    item?.listing_id ??
    `${source}-${title}`;

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
        : "POA",
    location,
    mapsUrl: createGoogleMapsUrl(location),
    image,
    url,
    condition: item?.condition ?? "",
    description: item?.description ?? "",
    createdAt:
      item?.createdAt ??
      item?.publishedAt ??
      null
  };
}


/* =====================================================
   CAPTAPI REQUEST
===================================================== */

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
      Authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
      Accept: "application/json"
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


/* =====================================================
   FACEBOOK MARKETPLACE
===================================================== */

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

  console.log(
    "Facebook Marketplace search:",
    args.q,
    args.location
  );

  const body = await captapiRequest(url);

  const raw =
    body?.data?.items ??
    body?.data?.listings ??
    body?.items ??
    body?.listings ??
    [];

  let listings = Array.isArray(raw)
    ? raw.map(item =>
        normalize(item, "Facebook Marketplace")
      )
    : [];


  // Extra protection for the maximum price
  if (args.maxPrice) {

    const maximum =
      Number(args.maxPrice);

    if (
      Number.isFinite(maximum)
    ) {

      listings = listings.filter(
        listing =>
          listing.price === null ||
          listing.price <= maximum
      );
    }
  }


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


/* =====================================================
   GUMTREE
===================================================== */

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
  params.set("radiusMiles", args.radius);

  if (args.maxPrice) {
    params.set(
      "maxPrice",
      args.maxPrice
    );
  }

  const separator =
    apiUrl.includes("?")
      ? "&"
      : "?";

  const url =
    `${apiUrl}${separator}${params.toString()}`;

  const headers = {
    Accept: "application/json"
  };

  if (process.env.GUMTREE_API_KEY) {
    headers.Authorization =
      `Bearer ${process.env.GUMTREE_API_KEY}`;
  }

  const response =
    await fetch(url, {
      method: "GET",
      headers
    });

  const text =
    await response.text();

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

  const listings =
    Array.isArray(raw)
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


/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (_req, res) => {

    res.json({

      ok: true,

      service:
        "ScrapScout",

      captapiConfigured:
        Boolean(
          process.env.CAPTAPI_API_KEY
        ),

      gumtreeConfigured:
        Boolean(
          process.env.GUMTREE_API_URL
        )
    });
  }
);


/* =====================================================
   SEARCH
===================================================== */

app.get(
  "/api/search",
  async (req, res) => {

    try {

      const args = {

        q:
          String(
            req.query.q ||
            "BMW"
          ).trim(),

        location:
          String(
            req.query.location ||
            "Liverpool"
          ).trim(),

        maxPrice:
          String(
            req.query.maxPrice ||
            ""
          ).trim(),

        radius:
          String(
            req.query.radius ||
            "10"
          ).trim()
      };


      if (
        !args.q ||
        !args.location
      ) {

        return res.status(400).json({

          ok: false,

          message:
            "Make/model and location are required."
        });
      }


      const source =
        String(
          req.query.source ||
          "facebook"
        ).toLowerCase();


      const result =
        source === "gumtree"
          ? await gumtreeSearch(args)
          : await facebookSearch(args);


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
  }
);


/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,
  () => {

    console.log(
      `ScrapScout running on port ${PORT}`
    );
  }
);
