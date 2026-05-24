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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shuffle(values = []) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

const biasAssessmentShell = document.querySelector("[data-bias-assessment-shell]");
const assessmentBankNode = document.querySelector("#bias-assessment-bank");

if (biasAssessmentShell && assessmentBankNode) {
  const assessmentItemsNode = biasAssessmentShell.querySelector("[data-bias-assessment-items]");
  const assessmentResultsNode = biasAssessmentShell.querySelector("[data-bias-assessment-results]");
  const assessmentGradeButton = biasAssessmentShell.querySelector("[data-bias-assessment-grade]");
  const assessmentNewButton = biasAssessmentShell.querySelector("[data-bias-assessment-new]");
  const assessmentDifficultySelect = biasAssessmentShell.querySelector("[data-assessment-difficulty]");
  const assessmentCategorySelect = biasAssessmentShell.querySelector("[data-assessment-category]");
  const assessmentSummaryNode = biasAssessmentShell.querySelector("[data-assessment-summary]");
  const assessmentEmptyNode = biasAssessmentShell.querySelector("[data-assessment-empty]");
  const assessmentSize = Number(biasAssessmentShell.dataset.assessmentSize || "10");
  const assessmentBank = JSON.parse(assessmentBankNode.textContent || "[]");
  const focusBias = new URL(window.location.href).searchParams.get("focus") || "";
  const focusBiasName = assessmentBank.find((item) => item.correctBias === focusBias)?.correctBiasName || "";
  let currentAssessmentSet = [];

  function currentAssessmentFilters() {
    return {
      difficulty: assessmentDifficultySelect?.value || "",
      category: assessmentCategorySelect?.value || "",
    };
  }

  function syncAssessmentUrl() {
    const filters = currentAssessmentFilters();
    const url = new URL(window.location.href);

    if (filters.difficulty) {
      url.searchParams.set("difficulty", filters.difficulty);
    } else {
      url.searchParams.delete("difficulty");
    }

    if (filters.category) {
      url.searchParams.set("category", filters.category);
    } else {
      url.searchParams.delete("category");
    }

    window.history.replaceState({}, "", url);
  }

  function hydrateAssessmentFiltersFromUrl() {
    const url = new URL(window.location.href);
    const difficulty = url.searchParams.get("difficulty") || "";
    const category = url.searchParams.get("category") || "";

    if (assessmentDifficultySelect) {
      assessmentDifficultySelect.value = difficulty;
      if (assessmentDifficultySelect.value !== difficulty) {
        assessmentDifficultySelect.value = "";
      }
    }

    if (assessmentCategorySelect) {
      assessmentCategorySelect.value = category;
      if (assessmentCategorySelect.value !== category) {
        assessmentCategorySelect.value = "";
      }
    }
  }

  function filteredAssessmentBank() {
    const { difficulty, category } = currentAssessmentFilters();
    return assessmentBank.filter((item) => {
      const matchesDifficulty = !difficulty || item.difficulty === difficulty;
      const matchesCategory = !category || (item.categories || []).includes(category);
      return matchesDifficulty && matchesCategory;
    });
  }

  function updateAssessmentSummary(availableCount) {
    if (!assessmentSummaryNode) return;

    const { difficulty, category } = currentAssessmentFilters();
    const difficultyLabel =
      assessmentDifficultySelect?.selectedOptions?.[0]?.textContent || "Mixed levels";
    const categoryLabel = category || "All categories";
    const questionCount = Math.min(assessmentSize, availableCount);
    const focusText = focusBiasName ? ` Includes ${focusBiasName} when possible.` : "";

    assessmentSummaryNode.textContent = availableCount
      ? `${questionCount}-question run from ${availableCount} available scenarios. ${difficultyLabel} · ${categoryLabel}.${focusText}`
      : `No scenarios are currently available for ${difficultyLabel} · ${categoryLabel}.${focusText}`;
  }

  function pickAssessmentSet() {
    const chosen = [];
    const available = shuffle(filteredAssessmentBank());
    const maxCount = Math.min(assessmentSize, available.length);

    if (focusBias) {
      const focusedItem = shuffle(available.filter((item) => item.correctBias === focusBias))[0];
      if (focusedItem) {
        chosen.push(focusedItem);
      }
    }

    for (const item of available) {
      if (chosen.length >= maxCount) break;
      if (chosen.some((selected) => selected.id === item.id)) continue;
      chosen.push(item);
    }

    return shuffle(chosen).slice(0, maxCount);
  }

  function optionLabelHtml(name, value, content) {
    return `<label class="quiz-option"><input type="radio" name="${name}" value="${escapeHtml(value)}" /> <span>${content}</span></label>`;
  }

  function renderAssessmentItem(item, index) {
    const biasOptions = shuffle(item.biasOptions || []);
    const moveOptions = shuffle(item.moveOptions || []);
    const chips = [
      `<span class="teaching-pill">${escapeHtml(item.difficultyLabel || "Applied")}</span>`,
      ...(item.categories || []).slice(0, 2).map((categoryName) => `<span class="teaching-pill">${escapeHtml(categoryName)}</span>`),
    ].join("");

    return `
      <article class="category-card assessment-question-card" data-assessment-question>
        <p class="eyebrow">Scenario ${index + 1}</p>
        <h3 class="assessment-question-title">${escapeHtml(item.title)}</h3>
        <div class="teaching-pill-row">${chips}</div>
        <p class="card-copy">${escapeHtml(item.scenario)}</p>
        <p class="dialogue-prompt">Which bias is most likely doing the hidden work?</p>
        <div class="quiz-options">
          ${biasOptions
            .map((option) =>
              optionLabelHtml(
                `assessment-bias-${index}`,
                option.slug,
                `<strong>${escapeHtml(option.name)}</strong>`,
              ),
            )
            .join("")}
        </div>
        <p class="dialogue-prompt">Which next move would improve the process most?</p>
        <div class="quiz-options">
          ${moveOptions
            .map((option) => optionLabelHtml(`assessment-move-${index}`, option, escapeHtml(option)))
            .join("")}
        </div>
      </article>`;
  }

  function loadAssessmentSet() {
    const available = filteredAssessmentBank();
    syncAssessmentUrl();
    updateAssessmentSummary(available.length);
    currentAssessmentSet = pickAssessmentSet();

    if (assessmentEmptyNode) {
      assessmentEmptyNode.classList.toggle("hidden", currentAssessmentSet.length !== 0);
    }

    if (assessmentGradeButton) {
      assessmentGradeButton.disabled = currentAssessmentSet.length === 0;
    }

    if (assessmentItemsNode) {
      assessmentItemsNode.innerHTML = currentAssessmentSet
        .map((item, index) => renderAssessmentItem(item, index))
        .join("");
    }
    if (assessmentResultsNode) {
      assessmentResultsNode.innerHTML = "";
      assessmentResultsNode.classList.add("hidden");
    }
  }

  function performanceBand(score, total, type) {
    const ratio = total ? score / total : 0;

    if (ratio >= 0.9) {
      return type === "bias"
        ? {
            label: "Strong diagnostic read",
            note: "You are reliably naming the pressure. Try narrower category runs or the advanced tier next.",
          }
        : {
            label: "Strong repair sense",
            note: "You are choosing good process interventions, not just good labels.",
          };
    }

    if (ratio >= 0.7) {
      return type === "bias"
        ? {
            label: "Recognition is solid",
            note: "The main gains now come from harder overlap cases and nearby confusions.",
          }
        : {
            label: "Repair is forming",
            note: "You usually know how to improve the process, but some weaker interventions are still attractive.",
          };
    }

    if (ratio >= 0.45) {
      return type === "bias"
        ? {
            label: "Foundation is forming",
            note: "Spend more time on flagship pages and the foundational paths before pushing difficulty upward.",
          }
        : {
            label: "Repair needs practice",
            note: "Use self-checks, countermoves, and practice labs so the next move becomes easier to recognize.",
          };
    }

    return type === "bias"
      ? {
          label: "Start with the map",
          note: "Return to the foundational tier and the core bias pages so the families become easier to separate.",
        }
      : {
          label: "Start with the process moves",
          note: "Work the self-checks and practice labs before relying on mixed assessment again.",
        };
  }

  function recommendationText(biasScore, moveScore, total) {
    if (!total) {
      return "Load a scenario set first, then use the misses to decide whether you need more reference work or more repair practice.";
    }

    if (moveScore + 1 < biasScore) {
      return "You are naming the pressure faster than you are choosing the strongest intervention. Spend time on practice labs, self-checks, and countermoves.";
    }

    if (biasScore + 1 < moveScore) {
      return "Your repair sense is ahead of your labeling. Spend time on flagship pages and the nearby-confusions sections.";
    }

    if (biasScore / total >= 0.8 && moveScore / total >= 0.8) {
      return "This tier looks comfortable. Try a harder difficulty or narrow the run to one category for tighter comparison.";
    }

    return "Review the misses for patterns, then rerun the same difficulty once the weak spots are less mysterious.";
  }

  function gradeAssessmentSet() {
    if (!currentAssessmentSet.length) return;

    let biasScore = 0;
    let moveScore = 0;
    let perfectCount = 0;
    const questionCards = Array.from(
      biasAssessmentShell.querySelectorAll("[data-assessment-question]"),
    );

    const reviewCards = currentAssessmentSet.map((item, index) => {
      const chosenBias = document.querySelector(
        `input[name="assessment-bias-${index}"]:checked`,
      )?.value;
      const chosenMove = document.querySelector(
        `input[name="assessment-move-${index}"]:checked`,
      )?.value;
      const biasCorrect = chosenBias === item.correctBias;
      const moveCorrect = chosenMove === item.correctMove;
      const optionName =
        item.biasOptions.find((option) => option.slug === chosenBias)?.name || "No bias selected";
      const chosenMoveName = chosenMove || "No move selected";

      if (biasCorrect) biasScore += 1;
      if (moveCorrect) moveScore += 1;
      if (biasCorrect && moveCorrect) perfectCount += 1;

      const card = questionCards[index];
      if (card) {
        card.classList.toggle("assessment-question-correct", biasCorrect && moveCorrect);
        card.classList.toggle("assessment-question-incorrect", !(biasCorrect && moveCorrect));
      }

      return `
        <article class="category-card">
          <h3>Scenario ${index + 1}: ${escapeHtml(item.title)}</h3>
          <div class="teaching-pill-row">
            <span class="teaching-pill">${escapeHtml(item.difficultyLabel || "Applied")}</span>
            ${(item.categories || [])
              .slice(0, 2)
              .map((categoryName) => `<span class="teaching-pill">${escapeHtml(categoryName)}</span>`)
              .join("")}
          </div>
          <p class="card-copy">${escapeHtml(item.scenario)}</p>
          <p class="muted"><strong>Your bias call:</strong> ${escapeHtml(optionName)}</p>
          <p class="muted"><strong>Your move:</strong> ${escapeHtml(chosenMoveName)}</p>
          <p class="muted"><strong>Correct bias:</strong> <a class="text-link" href="${escapeHtml(item.correctBiasHref)}">${escapeHtml(item.correctBiasName)}</a></p>
          <p class="muted"><strong>Best move:</strong> ${escapeHtml(item.correctMove)}</p>
          <p class="muted"><strong>Why that bias fits:</strong> ${escapeHtml(item.biasExplanation)}</p>
          <p class="muted"><strong>Why that move helps:</strong> ${escapeHtml(item.moveExplanation)}</p>
        </article>`;
    });

    const biasBand = performanceBand(biasScore, currentAssessmentSet.length, "bias");
    const moveBand = performanceBand(moveScore, currentAssessmentSet.length, "move");

    if (assessmentResultsNode) {
      assessmentResultsNode.innerHTML = `
        <p class="eyebrow">Results</p>
        <h3 class="section-title">Score the diagnosis and the repair separately</h3>
        <p class="section-copy">A correct label matters, but a correct next move matters too. The strongest judgment work does both.</p>
        <div class="assessment-outcome-summary">
          <div class="assessment-outcome-group">
            <h4>Bias diagnosis</h4>
            <div class="assessment-outcome-row">
              <span class="assessment-outcome-chip assessment-outcome-chip-correct">${biasScore}/${currentAssessmentSet.length}</span>
            </div>
            <p class="muted"><strong>${escapeHtml(biasBand.label)}:</strong> ${escapeHtml(biasBand.note)}</p>
          </div>
          <div class="assessment-outcome-group">
            <h4>Best next move</h4>
            <div class="assessment-outcome-row">
              <span class="assessment-outcome-chip assessment-outcome-chip-correct">${moveScore}/${currentAssessmentSet.length}</span>
            </div>
            <p class="muted"><strong>${escapeHtml(moveBand.label)}:</strong> ${escapeHtml(moveBand.note)}</p>
          </div>
          <div class="assessment-outcome-group">
            <h4>Perfect scenarios</h4>
            <div class="assessment-outcome-row">
              <span class="assessment-outcome-chip assessment-outcome-chip-correct">${perfectCount}/${currentAssessmentSet.length}</span>
            </div>
          </div>
          <div class="assessment-outcome-group">
            <h4>What to do next</h4>
            <p class="muted">${escapeHtml(recommendationText(biasScore, moveScore, currentAssessmentSet.length))}</p>
          </div>
        </div>
        <div class="category-grid" style="margin-top: 18px;">
          ${reviewCards.join("")}
        </div>`;
      assessmentResultsNode.classList.remove("hidden");
      assessmentResultsNode.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  assessmentNewButton?.addEventListener("click", loadAssessmentSet);
  assessmentGradeButton?.addEventListener("click", gradeAssessmentSet);
  assessmentDifficultySelect?.addEventListener("change", loadAssessmentSet);
  assessmentCategorySelect?.addEventListener("change", loadAssessmentSet);
  hydrateAssessmentFiltersFromUrl();
  loadAssessmentSet();
}
