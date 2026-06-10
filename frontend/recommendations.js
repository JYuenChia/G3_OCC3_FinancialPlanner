const API_URL = "http://localhost:3000/api";

let goals = [];
let selectedGoalId = null;

// Helper functions for UI state management
function showElement(id) {
  document.getElementById(id).style.display = "block";
}

function hideElement(id) {
  document.getElementById(id).style.display = "none";
}

function showError(message) {
  document.getElementById("errorMessage").textContent = message;
  showElement("errorAlert");
  hideElement("loadingSpinner");
}

function hideError() {
  hideElement("errorAlert");
}

// Fetch user's goals
async function loadGoals() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/goals`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to load goals (${response.status})`,
      );
    }

    const data = await response.json();
    goals = data.data || data.goals || [];
    populateGoalsSelect();

    if (goals.length === 0) {
      showElement("emptyState");
      if (document.getElementById("noGoalSelectedState"))
        hideElement("noGoalSelectedState");
      if (document.getElementById("recommendationsContent"))
        hideElement("recommendationsContent");
    } else {
      hideElement("emptyState");
      if (!selectedGoalId) {
        if (document.getElementById("noGoalSelectedState"))
          showElement("noGoalSelectedState");
        if (document.getElementById("recommendationsContent"))
          hideElement("recommendationsContent");
      }
    }
  } catch (error) {
    showError("Error loading goals: " + error.message);
  }
}

// Populate goals dropdown
function populateGoalsSelect() {
  const select = document.getElementById("goalSelect");
  select.innerHTML = '<option value="">-- Choose a goal --</option>';

  goals.forEach((goal) => {
    const option = document.createElement("option");
    option.value = goal.id;
    option.textContent = goal.title;
    select.appendChild(option);
  });
}

// Handle goal selection
document.getElementById("goalSelect").addEventListener("change", async (e) => {
  selectedGoalId = e.target.value;

  if (selectedGoalId) {
    if (document.getElementById("noGoalSelectedState"))
      hideElement("noGoalSelectedState");
    if (document.getElementById("recommendationsContent"))
      showElement("recommendationsContent");

    // Automatically load recommendations for the selected goal
    loadRecommendations();
    compareStrategies();
    toggleIdleIndicator("recommendationsContainer", false);
    toggleIdleIndicator("comparisonContainer", false);
    toggleIdleIndicator("investmentGrowthContainer", false);
  } else {
    if (goals.length === 0) {
      showElement("emptyState");
      if (document.getElementById("noGoalSelectedState"))
        hideElement("noGoalSelectedState");
    } else {
      hideElement("emptyState");
      if (document.getElementById("noGoalSelectedState"))
        showElement("noGoalSelectedState");
    }
    if (document.getElementById("recommendationsContent"))
      hideElement("recommendationsContent");
  }
});
function destroyExistingCharts() {
  const chartContainer = document.getElementById("investmentGrowthChart");
  if (chartContainer) {
    const chartInstance = Chart.getChart(chartContainer);
    if (chartInstance) {
      chartInstance.destroy();
    }
  }
}

// Load recommendations for selected goal
async function loadRecommendations() {
  if (!selectedGoalId) {
    showError("Please select a goal");
    return;
  }
  destroyExistingCharts(); // Clear any existing charts before loading new data
  showElement("loadingSpinner");
  hideError();

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(
      `${API_URL}/recommendations/${selectedGoalId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `Failed to load recommendations (${response.status})`,
      );
    }

    const data = await response.json();
    displayRecommendations(data);
  } catch (error) {
    showError("Error loading recommendations: " + error.message);
  } finally {
    hideElement("loadingSpinner");
  }
}

// Display recommendation
function displayRecommendations(data) {
  document.getElementById("strategyGoalTitle").textContent = data.goalTitle;
  document.getElementById("strategyTimeline").textContent = data.timelineYears;
  document.getElementById("strategyMonthly").textContent =
    data.monthlyContribution.toLocaleString();
  document.getElementById("strategyName").textContent = data.name;
  document.getElementById("strategyReturn").textContent = (
    data.expectedAnnualReturn * 100
  ).toFixed(1);
  document.getElementById("strategyProjectedValue").textContent =
    data.projectedFinalValue.toLocaleString();
  document.getElementById("strategyDescription").textContent = data.description;

  // Update asset allocation bars
  const stocks = data.allocation.stocks;
  const bonds = data.allocation.bonds;

  document.getElementById("stocksAllocation").style.width = stocks + "%";
  document.getElementById("stocksPercent").textContent = stocks;
  document.getElementById("bondsAllocation").style.width = bonds + "%";
  document.getElementById("bondsPercent").textContent = bonds;

  // Validate and store all strategies globally
  if (data.allStrategies) {
    window.currentStrategies = data.allStrategies;
    window.currentSelectedStrategyKey = data.selectedStrategy || "aggressive";

    // Auto-select the correct radio button based on selectedStrategyKey
    const stratBtn = document.getElementById(
      `btn${window.currentSelectedStrategyKey.charAt(0).toUpperCase() + window.currentSelectedStrategyKey.slice(1)}`,
    );
    if (stratBtn) stratBtn.checked = true;

    updateChartFromState();
  } else {
    console.error("Invalid strategies data: ", data);
    showError("Unable to display investment growth graph due to missing data.");
  }
}

// Update chart based on currently selected strategy and timeframe
function updateChartFromState() {
  if (!window.currentStrategies || !window.currentSelectedStrategyKey) return;
  const strat = window.currentStrategies[window.currentSelectedStrategyKey];
  if (!strat || !strat.growthData) return;

  const timeFrameInputs = document.getElementsByName("timeframe");
  let selectedTimeframe = "Years";
  for (const input of timeFrameInputs) {
    if (input.checked) selectedTimeframe = input.value;
  }

  destroyExistingCharts();
  renderInvestmentGrowth(
    selectedTimeframe === "Years" ? strat.growthData : strat.monthlyGrowthData,
    selectedTimeframe,
  );
}

// Render investment growth graph
function renderInvestmentGrowth(data, type = "Years") {
  const ctx = document.getElementById("investmentGrowthChart").getContext("2d");
  const labels = type === "Years" ? data.years : data.labels;
  const maxValue = Math.max(...data.values);
  const suggestedMax = maxValue * 1.1; // Add 10% padding for dynamic Y-axis scaling

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels, // Array of years or months
      datasets: [
        {
          label: "Total Value (With Interest)",
          data: data.values, // Array of values
          borderColor: "#007bff",
          backgroundColor: "rgba(0, 123, 255, 0.2)",
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: type,
          },
        },
        y: {
          title: {
            display: true,
            text: "Value (RM)",
          },
          suggestedMax: suggestedMax,
        },
      },
    },
  });
}

function animateCountUp(element, targetValue, formatter, duration = 1000) {
  if (!element) return;

  const startTime = performance.now();
  const startValue = 0;

  function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function tick(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const currentValue =
      startValue + (targetValue - startValue) * easeOutCubic(progress);
    element.textContent = formatter(currentValue);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function animateBarFill(element, targetPercent, duration = 1000) {
  if (!element) return;

  const clampedTarget = Math.max(0, Math.min(100, targetPercent));
  const startTime = performance.now();

  function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function tick(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const currentValue = clampedTarget * easeOutCubic(progress);
    element.style.width = `${currentValue}%`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  element.style.width = "0%";
  requestAnimationFrame(tick);
}

function renderContributionMetrics(strategies) {
  const container = document.getElementById("comparisonMetrics");
  if (!container) return;

  const strategyOrder = ["aggressive", "balanced", "conservative"];
  const orderedStrategies = strategyOrder
    .map((key) => ({ key, ...strategies[key] }))
    .filter((strategy) => strategy.name);

  container.innerHTML = orderedStrategies
    .map(
      (strategy) => `
        <div class="strategy-metric-card metric-${strategy.key}">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
            <div>
              <p class="strategy-metric-label mb-1">Contribution Efficiency</p>
              <h6 class="mb-0 text-dark">${strategy.name}</h6>
            </div>
            <span class="strategy-metric-pill">RM ${strategy.monthlyContribution.toLocaleString()}/mo</span>
          </div>
          <div class="d-flex align-items-end gap-2 mb-2">
            <span class="strategy-metric-value" data-efficiency-value="${strategy.key}">${strategy.monthlyContribution === 0 ? "Already on track" : "0.00x"}</span>
            <span class="strategy-metric-suffix" data-efficiency-suffix="${strategy.key}">${strategy.monthlyContribution === 0 ? "no additional monthly contribution needed" : "projected value per RM contributed"}</span>
          </div>
          <div class="strategy-metric-bar" aria-hidden="true">
            <div
              class="strategy-metric-bar-fill"
              data-efficiency-bar="${strategy.key}"
            ></div>
          </div>
          <div class="strategy-metric-meta mt-2">
            Total contributions: RM ${strategy.totalContributions.toLocaleString()} · Score ${strategy.contributionEfficiencyScore}/100
          </div>
        </div>
      `,
    )
    .join("");

  const maxEfficiency = Math.max(
    ...orderedStrategies.map(
      (strategy) => strategy.contributionEfficiency || 0,
    ),
    0,
  );

  orderedStrategies.forEach((strategy) => {
    const valueElement = container.querySelector(
      `[data-efficiency-value="${strategy.key}"]`,
    );
    const suffixElement = container.querySelector(
      `[data-efficiency-suffix="${strategy.key}"]`,
    );
    const barElement = container.querySelector(
      `[data-efficiency-bar="${strategy.key}"]`,
    );

    if (strategy.monthlyContribution === 0) {
      if (valueElement) {
        valueElement.textContent =
          strategy.contributionEfficiencyLabel || "Already on track";
      }
      if (suffixElement) {
        suffixElement.textContent = "no additional monthly contribution needed";
      }
      animateBarFill(barElement, 100);
      return;
    }

    animateCountUp(
      valueElement,
      strategy.contributionEfficiency || 0,
      (value) => `${value.toFixed(2)}x`,
    );
    if (suffixElement) {
      suffixElement.textContent = "projected value per RM contributed";
    }
    animateBarFill(barElement, strategy.contributionEfficiencyScore || 0);
  });

  if (!maxEfficiency) {
    container.innerHTML = "";
  }
}
// Compare strategies
async function compareStrategies() {
  if (!selectedGoalId) {
    showError("Please select a goal");
    return;
  }

  showElement("loadingSpinner");
  hideError();

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/strategies/compare`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ goal_id: selectedGoalId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to compare strategies (${response.status})`,
      );
    }

    const data = await response.json();
    displayComparison(data);
  } catch (error) {
    showError("Error comparing strategies: " + error.message);
  } finally {
    hideElement("loadingSpinner");
  }
}

// Display strategy comparison
function displayComparison(data) {
  document.getElementById("comparisonTimeline").textContent =
    data.timelineYears;

  renderContributionMetrics(data.strategies);

  const tableBody = document.getElementById("comparisonTableBody");
  tableBody.innerHTML = "";

  const strategyOrder = ["aggressive", "balanced", "conservative"];

  strategyOrder.forEach((key) => {
    const strategy = data.strategies[key];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong class="text-dark">${strategy.name}</strong></td>
      <td>Stocks: ${strategy.allocation.stocks}% | Bonds: ${strategy.allocation.bonds}%</td>
      <td>${(strategy.expectedAnnualReturn * 100).toFixed(1)}%</td>
      <td>RM ${strategy.monthlyContribution.toLocaleString()}</td>
      <td>RM ${strategy.projectedValue.toLocaleString()}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Function to toggle idle indicator
function toggleIdleIndicator(containerId, isIdle) {
  const container = document.getElementById(containerId);
  console.log(container[0]);
  if (isIdle) {
    container.classList.add("idle-indicator");
  } else {
    container.classList.remove("idle-indicator");
  }
}

// Example usage: Toggle idle indicator for recommendations container
// Call this function when the container is idle or active
// toggleIdleIndicator("recommendationsContainer", true); // Add idle indicator
// toggleIdleIndicator("recommendationsContainer", false); // Remove idle indicator

// Import Chart.js library
const loadChartJs = async () => {
  if (!window.Chart) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = () => console.log("Chart.js loaded");
    document.head.appendChild(script);
  }
};

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  loadChartJs();
  loadGoals();

  // Timeframe Toggle Listeners
  const btnYears = document.getElementById("btnYears");
  const btnMonths = document.getElementById("btnMonths");
  if (btnYears && btnMonths) {
    btnYears.addEventListener("change", updateChartFromState);
    btnMonths.addEventListener("change", updateChartFromState);
  }

  // Strategy Toggle Listeners
  const strategyRadios = document.getElementsByName("strategyToggle");
  strategyRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.checked) {
        window.currentSelectedStrategyKey = e.target.value;
        updateChartFromState();
      }
    });
  });
});
