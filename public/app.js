const $ = (id) => document.getElementById(id);

const money = (value) => {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "POA";
  }

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
   OPEN LISTING
===================================================== */

function openListing(url, source) {

  if (!url || url === "#") {
    return;
  }

  // Facebook listing
  if (
    source &&
    source.toLowerCase().includes("facebook")
  ) {

    /*
      Try the normal Facebook URL first.

      Android can automatically hand the URL
      to the Facebook app when Facebook is installed.

      If Android doesn't have an app association,
      the normal Facebook website opens instead.
    */

    window.location.href = url;

    return;
  }

  // Gumtree / other sources
  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
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


  const isFacebook =
    source
      .toLowerCase()
      .includes("facebook");


  const mapsButton =
    item.mapsUrl
      ? `
        <a
          class="maps-button"
          href="${esc(item.mapsUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          📍 Open in Google Maps
        </a>
      `
      : "";


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

          ${
            isFacebook
              ? `
                <button
                  class="view-listing"
                  type="button"
                  data-url="${esc(listingUrl)}"
                  data-source="${esc(source)}"
                >
                  Open Facebook Listing
                </button>
              `
              : `
                <a
                  class="view-listing"
                  href="${esc(listingUrl)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Listing
                </a>
              `
          }


          ${mapsButton}

        </div>

      </div>

    </article>
  `;
}


/* =====================================================
   LISTING BUTTON CLICKS
===================================================== */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        ".view-listing"
      );


    if (!button) {
      return;
    }


    const url =
      button.dataset.url;


    const source =
      button.dataset.source;


    if (url) {
      openListing(
        url,
        source
      );
    }
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
