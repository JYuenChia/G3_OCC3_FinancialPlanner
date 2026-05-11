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
    } else {
      hideElement("emptyState");
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
    // Automatically load recommendations for the selected goal
    loadRecommendations();
    compareStrategies();
    toggleIdleIndicator("recommendationsContainer", false);
    toggleIdleIndicator("comparisonContainer", false);
    toggleIdleIndicator("investmentGrowthContainer", false);
  } else {
    hideElement("emptyState");
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

  // Validate and render investment growth graph
  if (
    data.growthData &&
    Array.isArray(data.growthData.years) &&
    Array.isArray(data.growthData.values)
  ) {
    renderInvestmentGrowth(data.growthData);
  } else {
    console.error("Invalid growth data: ", data.growthData);
    showError("Unable to display investment growth graph due to missing data.");
  }
}

// Render investment growth graph
function renderInvestmentGrowth(data) {
  const ctx = document.getElementById("investmentGrowthChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: data.years, // Array of years
      datasets: [
        {
          label: "Investment Value",
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
            text: "Years",
          },
        },
        y: {
          title: {
            display: true,
            text: "Value ($)",
          },
        },
      },
    },
  });
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

  const tableBody = document.getElementById("comparisonTableBody");
  tableBody.innerHTML = "";

  const strategyOrder = ["aggressive", "balanced", "conservative"];

  strategyOrder.forEach((key) => {
    const strategy = data.strategies[key];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${strategy.name}</strong></td>
      <td>Stocks: ${strategy.allocation.stocks}% | Bonds: ${strategy.allocation.bonds}%</td>
      <td>${(strategy.expectedAnnualReturn * 100).toFixed(1)}%</td>
      <td>$${strategy.monthlyContribution.toLocaleString()}</td>
      <td>$${strategy.projectedValue.toLocaleString()}</td>
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
});
