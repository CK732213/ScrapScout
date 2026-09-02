const $ = (id) => document.getElementById(id);

const money = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "£0";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(n);
};

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

async function searchListings() {
  const q = $("q")?.value.trim() || "BMW";
  const location = $("location")?.value.trim() || "Liverpool";
  const maxPrice = $("maxPrice")?.value.trim() || "";
  const radius = $("radius")?.value.trim() || "10";
  const source = $("source")?.value || "facebook";

  const results = $("results");
  const status = $("status");

  if (status) status.textContent = "Searching...";
  if (results) results.innerHTML = "";

  try {
    const params = new URLSearchParams({
      q,
      location,
      radius,
      cache: "true"
    });

    if (maxPrice) params.set("maxPrice", maxPrice);
    if (source) params.set("source", source);

    const response = await fetch(`/api/search?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Search failed.");
    }

    renderResults(data.listings || []);

    if (status) {
      status.textContent =
        `${data.listings?.length || 0} listings found`;
    }
  } catch (error) {
    if (status) status.textContent = error.message;
    if (results) {
      results.innerHTML = `
        <div class="error">
          <strong>Search error</strong>
          <p>${esc(error.message)}</p>
        </div>
      `;
    }
  }
}

function renderResults(listings) {
  const results = $("results");
  if (!results) return;

  if (!listings.length) {
    results.innerHTML = `
      <div class="empty">
        <h3>No listings found</h3>
        <p>Try another make/model, location or price.</p>
      </div>
    `;
    return;
  }

  results.innerHTML = listings.map(renderCard).join("");
}

function renderCard(item) {
  const price =
    item.priceAmount != null
      ? money(item.priceAmount)
      : esc(item.price || "POA");

  const image = item.image
    ? `<img src="${esc(item.image)}" alt="" loading="lazy">`
    : `<div class="no-image">No image</div>`;

  return `
    <article class="listing-card">
      <div class="listing-image">
        ${image}
      </div>

      <div class="listing-content">
        <div class="listing-source">
          ${esc(item.source || "Marketplace")}
        </div>

        <h3>${esc(item.title)}</h3>

        <div class="listing-price">
          ${price}
        </div>

        ${item.location ? `
          <div class="listing-location">
            📍 ${esc(item.location)}
          </div>
        ` : ""}

        ${item.condition ? `
          <div class="listing-condition">
            ${esc(item.condition)}
          </div>
        ` : ""}

        <a
          class="view-listing"
          href="${esc(item.url || "#")}"
          target="_blank"
          rel="noopener noreferrer"
        >
          View listing
        </a>
      </div>
    </article>
  `;
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    const health = $("health");
    if (!health) return;

    health.textContent = data.ok
      ? "ScrapScout online"
      : "Server problem";
  } catch {
    const health = $("health");
    if (health) health.textContent = "Server offline";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const searchButton = $("searchButton");

  if (searchButton) {
    searchButton.addEventListener("click", searchListings);
  }

  const form = $("searchForm");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      searchListings();
    });
  }

  checkHealth();
});
