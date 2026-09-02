const $ = (id) => document.getElementById(id);

const money = (value) => {
  const n = Number(value);

  if (!Number.isFinite(n)) return "POA";

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


/* =====================================================
   FACEBOOK APP / LISTING
===================================================== */

function openFacebookListing(url, listingId) {

  if (!url || url === "#") {
    return;
  }

  /*
   * If CaptAPI gives us a Facebook listing ID,
   * try opening that exact Marketplace listing
   * inside the Facebook Android app.
   */

  if (listingId) {

    const appUrl =
      `fb://marketplace/item/${encodeURIComponent(listingId)}`;

    window.location.href = appUrl;

    /*
     * If Facebook doesn't open, return to the
     * normal Facebook web listing after a short delay.
     */

    setTimeout(() => {
      window.location.href = url;
    }, 1200);

    return;
  }

  /*
   * No listing ID available.
   *
   * Try Facebook's app URL first.
   */

  const cleanUrl =
    url.replace(/^https?:\/\//i, "");

  const facebookAppUrl =
    `fb://${cleanUrl}`;

  window.location.href =
    facebookAppUrl;

  /*
   * Browser fallback.
   */

  setTimeout(() => {
    window.location.href = url;
  }, 1200);
}


/* =====================================================
   SEARCH
===================================================== */

async function searchListings() {

  const q =
    $("q")?.value.trim() ||
    "BMW";

  const location =
    $("location")?.value.trim() ||
    "Liverpool";

  const maxPrice =
    $("maxPrice")?.value.trim() ||
    "";

  const radius =
    $("radius")?.value.trim() ||
    "10";

  const source =
    $("source")?.value ||
    "facebook";

  const results =
    $("results");

  const status =
    $("status");


  if (status) {
    status.textContent =
      "Searching...";
  }

  if (results) {
    results.innerHTML = "";
  }


  try {

    const params =
      new URLSearchParams({
        q,
        location,
        radius,
        cache: "true"
      });


    if (maxPrice) {
      params.set(
        "maxPrice",
        maxPrice
      );
    }


    if (source) {
      params.set(
        "source",
        source
      );
    }


    const response =
      await fetch(
        `/api/search?${params.toString()}`
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.message ||
        "Search failed."
      );
    }


    renderResults(
      data.listings || []
    );


    if (status) {

      status.textContent =
        `${data.listings?.length || 0} listings found`;
    }


  } catch (error) {

    if (status) {
      status.textContent =
        error.message;
    }


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


/* =====================================================
   RESULTS
===================================================== */

function renderResults(listings) {

  const results =
    $("results");

  if (!results) {
    return;
  }


  if (!listings.length) {

    results.innerHTML = `
      <div class="empty">
        <h3>No listings found</h3>
        <p>
          Try another make/model,
          location or price.
        </p>
      </div>
    `;

    return;
  }


  results.innerHTML =
    listings
      .map(renderCard)
      .join("");
}


/* =====================================================
   LISTING CARD
===================================================== */

function renderCard(item) {

  const price =
    item.priceFormatted ||
    (
      item.price != null
        ? money(item.price)
        : "POA"
    );


  const image =
    item.image
      ? `
        <img
          src="${esc(item.image)}"
          alt=""
          loading="lazy"
        >
      `
      : `
        <div class="no-image">
          No image
        </div>
      `;


  const source =
    item.source ||
    "Marketplace";


  const listingUrl =
    item.url ||
    "#";


  const listingId =
    item.id ||
    item.listingId ||
    "";


  const isFacebook =
    source
      .toLowerCase()
      .includes("facebook");


  let buttons = "";


  if (isFacebook) {

    buttons += `
      <button
        class="view-listing"
        type="button"
        data-facebook-url="${esc(listingUrl)}"
        data-listing-id="${esc(listingId)}"
      >
        📱 Open in Facebook
      </button>
    `;

  } else if (listingUrl !== "#") {

    buttons += `
      <a
        class="view-listing"
        href="${esc(listingUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        View Listing
      </a>
    `;
  }


  if (item.mapsUrl) {

    buttons += `
      <a
        class="maps-button"
        href="${esc(item.mapsUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        📍 Google Maps
      </a>
    `;
  }


  return `
    <article class="listing-card">

      <div class="listing-image">
        ${image}
      </div>


      <div class="listing-content">

        <div class="listing-source">
          ${esc(source)}
        </div>


        <h3>
          ${esc(item.title)}
        </h3>


        <div class="listing-price">
          ${esc(price)}
        </div>


        ${
          item.location
            ? `
              <div class="listing-location">
                📍 ${esc(item.location)}
              </div>
            `
            : `
              <div class="listing-location">
                📍 Location unavailable
              </div>
            `
        }


        ${
          item.condition
            ? `
              <div class="listing-condition">
                ${esc(item.condition)}
              </div>
            `
            : ""
        }


        <div class="listing-buttons">
          ${buttons}
        </div>

      </div>

    </article>
  `;
}


/* =====================================================
   BUTTON HANDLER
===================================================== */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "[data-facebook-url]"
      );


    if (!button) {
      return;
    }


    event.preventDefault();


    const url =
      button.dataset.facebookUrl;


    const listingId =
      button.dataset.listingId;


    openFacebookListing(
      url,
      listingId
    );
  }
);


/* =====================================================
   HEALTH CHECK
===================================================== */

async function checkHealth() {

  try {

    const response =
      await fetch(
        "/api/health"
      );


    const data =
      await response.json();


    const health =
      $("health");


    if (!health) {
      return;
    }


    health.textContent =
      data.ok
        ? "ScrapScout online"
        : "Server problem";


  } catch {

    const health =
      $("health");


    if (health) {
      health.textContent =
        "Server offline";
    }
  }
}


/* =====================================================
   START
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const searchButton =
      $("searchButton");


    if (searchButton) {

      searchButton.addEventListener(
        "click",
        searchListings
      );
    }


    const form =
      $("searchForm");


    if (form) {

      form.addEventListener(
        "submit",
        (event) => {

          event.preventDefault();

          searchListings();
        }
      );
    }


    checkHealth();
  }
);
