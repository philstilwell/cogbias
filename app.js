const searchInput = document.querySelector("[data-search-input]");
const categoryFilter = document.querySelector("[data-category-filter]");
const patternFilter = document.querySelector("[data-pattern-filter]");
const resetButton = document.querySelector("[data-search-reset]");
const cards = Array.from(document.querySelectorAll("[data-entry-card]"));
const countNode = document.querySelector("[data-search-count]");
const emptyState = document.querySelector("[data-search-empty]");
const siteSearchInputs = Array.from(document.querySelectorAll("[data-site-search-input]"));
const totalCount = cards.length;
const countSingular = countNode?.dataset.searchUnitSingular || "entry";
const countPlural = countNode?.dataset.searchUnitPlural || "entries";

function syncFilterUrl(query, category, pattern) {
  if (!searchInput && !categoryFilter && !patternFilter) return;

  const url = new URL(window.location.href);
  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }

  if (category) {
    url.searchParams.set("category", category);
  } else {
    url.searchParams.delete("category");
  }

  if (pattern) {
    url.searchParams.set("pattern", pattern);
  } else {
    url.searchParams.delete("pattern");
  }

  window.history.replaceState({}, "", url);
}

function hydrateFiltersFromUrl() {
  const url = new URL(window.location.href);
  const query = url.searchParams.get("q") || "";
  const category = url.searchParams.get("category") || "";
  const pattern = url.searchParams.get("pattern") || "";

  if (searchInput) searchInput.value = query;
  if (categoryFilter) categoryFilter.value = category;
  if (patternFilter) patternFilter.value = pattern;

  if (query) {
    siteSearchInputs.forEach((input) => {
      if (!input.value) {
        input.value = query;
      }
    });
  }
}

function applyFilters() {
  if (!cards.length) return;

  const query = (searchInput?.value || "").trim().toLowerCase();
  const category = categoryFilter?.value || "";
  const pattern = patternFilter?.value || "";
  let visible = 0;

  for (const card of cards) {
    const haystack = [
      card.dataset.name || "",
      card.dataset.aliases || "",
      card.dataset.body || "",
    ]
      .join(" ")
      .toLowerCase();

    const cardCategories = (card.dataset.categories || "").split("||").filter(Boolean);
    const cardPatterns = (card.dataset.patterns || "").split("||").filter(Boolean);
    const matchesQuery = !query || haystack.includes(query);
    const matchesCategory = !category || cardCategories.includes(category);
    const matchesPattern = !pattern || cardPatterns.includes(pattern);
    const show = matchesQuery && matchesCategory && matchesPattern;

    card.classList.toggle("hidden", !show);
    if (show) visible += 1;
  }

  if (countNode) {
    countNode.textContent = `${visible} of ${totalCount} ${
      totalCount === 1 ? countSingular : countPlural
    } shown`;
  }

  if (emptyState) {
    emptyState.classList.toggle("hidden", visible !== 0);
  }

  syncFilterUrl(query, category, pattern);
}

if (searchInput) {
  searchInput.addEventListener("input", applyFilters);
}

if (categoryFilter) {
  categoryFilter.addEventListener("change", applyFilters);
}

if (patternFilter) {
  patternFilter.addEventListener("change", applyFilters);
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (categoryFilter) categoryFilter.value = "";
    if (patternFilter) patternFilter.value = "";
    applyFilters();
    searchInput?.focus();
  });
}

hydrateFiltersFromUrl();
applyFilters();

for (const group of document.querySelectorAll("[data-tab-group]")) {
  const buttons = Array.from(group.querySelectorAll("[data-tab-button]"));
  const panels = Array.from(group.querySelectorAll("[data-tab-panel]"));

  if (!buttons.length || !panels.length) {
    continue;
  }

  function activateTab(index) {
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === index;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => activateTab(index));
  });

  activateTab(0);
}
