// Initialize variables
const saveBtn = document.getElementById("saveBtn");
const saveForm = document.getElementById("saveForm");
const calcTitleInput = document.getElementById("calcTitle");
const historyBody = document.getElementById("historyBody");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const roiForm = document.getElementById("roiForm");
const saveModal = new bootstrap.Modal(document.getElementById("saveModal"));
let latestCalculation = null;
let allCalculations = [];

// Load calculations from backend
async function loadCalculations() {
  try {
    const response = await apiClient.getCalculations();
    if (response.success) {
      allCalculations = response.calculations || [];
      renderHistory();
    }
  } catch (error) {
    showError("Failed to load calculation history");
    allCalculations = [];
    renderHistory();
  }
}

// Render history table
function renderHistory() {
  if (!allCalculations.length) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-muted text-center">No saved calculations yet.</td>
      </tr>
    `;
    return;
  }

  historyBody.innerHTML = allCalculations
    .map(item => `
      <tr>
        <td>${item.title}</td>
        <td>${Number(item.initial).toFixed(2)}</td>
        <td>${Number(item.rate_percent).toFixed(2)}</td>
        <td>${Number(item.years).toFixed(2)}</td>
        <td>${Number(item.final_amount).toFixed(2)}</td>
        <td>${Number(item.profit).toFixed(2)}</td>
      </tr>
    `)
    .join("");
}

// Handle ROI form submission
roiForm.addEventListener("submit", function(e) {
  e.preventDefault();

  let initial = parseFloat(document.getElementById("initial").value);
  let rate = parseFloat(document.getElementById("rate").value) / 100;
  let years = parseFloat(document.getElementById("years").value);

  // Validation
  if (initial <= 0 || rate <= 0 || years <= 0) {
    alert("Please enter valid positive values!");
    return;
  }

  // Calculation
  let finalAmount = initial * Math.pow((1 + rate), years);
  let roi = finalAmount - initial;

  let resultDiv = document.getElementById("result");
  resultDiv.classList.remove("d-none");

  resultDiv.innerHTML = `
    <strong>Final Amount:</strong> RM ${finalAmount.toFixed(2)} <br>
    <strong>Profit (ROI):</strong> RM ${roi.toFixed(2)}
  `;

  latestCalculation = {
    initial,
    ratePercent: rate * 100,
    years,
    finalAmount,
    roi
  };

  saveBtn.disabled = false;
});

// Handle save button click
saveBtn.addEventListener("click", function() {
  if (!latestCalculation) {
    alert("Please calculate first before saving.");
    return;
  }

  calcTitleInput.value = "";
  saveModal.show();
});

// Handle save form submission
saveForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const title = calcTitleInput.value.trim();

  if (!title) {
    showError("Please enter a title.");
    return;
  }

  try {
    showLoading(true);
    const response = await apiClient.saveCalculation(title, latestCalculation);
    
    if (response.success) {
      showSuccess("Calculation saved successfully!");
      await loadCalculations();
      saveModal.hide();
    } else {
      showError("Failed to save calculation");
    }
  } catch (error) {
    showError("Error saving calculation");
  } finally {
    showLoading(false);
  }
});

// Handle form reset
roiForm.addEventListener("reset", function() {
  latestCalculation = null;
  saveBtn.disabled = true;
  document.getElementById("result").classList.add("d-none");
});

// Handle clear history button
clearHistoryBtn.addEventListener("click", async function() {
  if (!confirm("Are you sure you want to clear all calculation history? This cannot be undone.")) {
    return;
  }

  try {
    showLoading(true);
    const response = await apiClient.clearAllCalculations();
    
    if (response.success) {
      showSuccess("All calculations cleared!");
      await loadCalculations();
    } else {
      showError("Failed to clear calculations");
    }
  } catch (error) {
    showError("Error clearing calculations");
  } finally {
    showLoading(false);
  }
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", function() {
  checkAuthState();
  loadCalculations();
});
