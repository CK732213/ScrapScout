require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function normalize(item, source) {
  const price = item?.priceAmount ?? item?.price ?? item?.amount ?? null;
  return {
    id: item?.id ?? item?.listingId ?? `${source}-${item?.title ?? "listing"}`,
    source,
    title: item?.title ?? item?.name ?? "Untitled listing",
    price: typeof price === "string" ? price : price == null ? "POA" : `£${price}`,
    priceAmount: Number(price) || null,
    location: item?.location?.name ?? item?.location ?? "",
    url: item?.url ?? item?.listingUrl ?? item?.link ?? "#",
    image: item?.image ?? item?.thumbnail ?? item?.photos?.[0] ?? null,
    condition: item?.condition ?? "",
    createdAt: item?.createdAt ?? item?.publishedAt ?? null
  };
}

async function facebookSearch(args) {
  if (!process.env.CAPTAPI_API_KEY) {
    const e = new Error("CAPTAPI_API_KEY is not configured on the server.");
    e.status = 500; throw e;
  }
  const base = process.env.CAPTAPI_BASE_URL || "https://api.captapi.com";
  const route = process.env.CAPTAPI_MARKETPLACE_PATH || "/v1/facebook/marketplace-search";
  const url = new URL(route, base);
  url.searchParams.set("q", args.q);
  url.searchParams.set("location", args.location);
  if (args.maxPrice) url.searchParams.set("maxPrice", args.maxPrice);
  if (args.radius) url.searchParams.set("radius", args.radius);
  if (args.cache) url.searchParams.set("cache", "true");

  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.CAPTAPI_API_KEY}`,
      Accept: "application/json"
    }
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(body?.message || body?.error || body?.code || `CaptAPI returned HTTP ${r.status}`);
    e.status = r.status; throw e;
  }
  const raw = body?.data?.items ?? body?.data?.listings ?? body?.items ?? body?.listings ?? [];
  return {
    listings: Array.isArray(raw) ? raw.map(x => normalize(x, "Facebook Marketplace")) : [],
    meta: {
      totalReturned: body?.data?.totalReturned ?? body?.totalReturned ?? null,
      hasMore: body?.data?.hasMore ?? body?.hasMore ?? false,
      nextCursor: body?.data?.nextCursor ?? body?.nextCursor ?? null
    }
  };
}

async function gumtreeSearch(args) {
  if (!process.env.GUMTREE_API_URL) {
    return {
      listings: [],
      meta: {totalReturned: 0, hasMore: false},
      message: "Gumtree needs a real API/provider URL. CaptAPI currently provides Facebook Marketplace search, so this build does not fake a Gumtree endpoint."
    };
  }
  const url = new URL(process.env.GUMTREE_API_URL);
  url.searchParams.set("q", args.q);
  url.searchParams.set("location", args.location);
  if (args.maxPrice) url.searchParams.set("maxPrice", args.maxPrice);
  if (args.radius) url.searchParams.set("radius", args.radius);
  const headers = {Accept: "application/json"};
  if (process.env.GUMTREE_API_KEY) headers.Authorization = `Bearer ${process.env.GUMTREE_API_KEY}`;
  const r = await fetch(url, {headers});
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(body?.message || `Gumtree provider returned HTTP ${r.status}`); e.status = r.status; throw e; }
  const raw = body?.data?.items ?? body?.items ?? body?.listings ?? [];
  return {listings: Array.isArray(raw) ? raw.map(x => normalize(x, "Gumtree")) : [], meta: {totalReturned: raw.length, hasMore: false}};
}

app.get("/api/health", (_req, res) => res.json({
  ok: true,
  service: "ScrapScout",
  captapiConfigured: Boolean(process.env.CAPTAPI_API_KEY),
  gumtreeConfigured: Boolean(process.env.GUMTREE_API_URL)
}));

app.get("/api/search", async (req, res) => {
  try {
    const args = {
      q: String(req.query.q || "BMW").trim(),
      location: String(req.query.location || "Liverpool").trim(),
      maxPrice: String(req.query.maxPrice || ""),
      radius: String(req.query.radius || "10"),
      cache: req.query.cache === "true"
    };
    if (!args.q || !args.location) return res.status(400).json({message: "Make/model and location are required."});
    const result = req.query.source === "gumtree" ? await gumtreeSearch(args) : await facebookSearch(args);
    res.json({ok: true, query: args, ...result});
  } catch (e) {
    res.status(e.status || 500).json({ok: false, message: e.message || "Search failed."});
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`ScrapScout running on port ${PORT}`));
