# ScrapScout — fresh clean build

This is the new single starting project. It contains the UI, server, API wiring, profit calculator, security setup, Render settings and the diagram layout.

## Included
- Mobile-first dark ScrapScout design.
- Make/model, max price, location and radius search.
- Facebook Marketplace via the current CaptAPI Marketplace Search endpoint.
- Separate Gumtree adapter slot without inventing an unsupported endpoint.
- Server-side Bearer authentication.
- `/api/health` to confirm the key is present.
- Listing result cards.
- Scrap/catalyst profit calculator.
- Architecture diagram in `docs/ARCHITECTURE.md`.
- Render-ready Node/Express setup.

## CaptAPI
The current CaptAPI Facebook Marketplace search is:
`GET https://api.captapi.com/v1/facebook/marketplace-search`
with `Authorization: Bearer YOUR_KEY`.

Put your real key in Render as:
`CAPTAPI_API_KEY`

Never put it in browser JavaScript or commit `.env`.

## Local
1. Copy `.env.example` to `.env`.
2. Add your real key.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Render
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Environment variable: `CAPTAPI_API_KEY=your_real_key`
- Optional defaults are already in `.env.example`.

After changing an environment variable, use Render's **Save, rebuild, and deploy**.

## Important
The old version only checked whether a key existed and then returned a placeholder. This version actually calls CaptAPI. If CaptAPI returns `401/bad_key`, the error is coming from CaptAPI authentication rather than the old placeholder code.

CaptAPI's current documentation lists Facebook Marketplace search, not a Gumtree endpoint. The Gumtree button therefore waits for a genuine Gumtree provider URL instead of pretending Facebook data is Gumtree.

## Structure
```text
ScrapScout/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```
