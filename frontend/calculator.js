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
        <td colspan="7" class="text-muted text-center">No saved calculations yet.</td>
      </tr>
    `;
    return;
  }

  historyBody.innerHTML = allCalculations
    .map(item => {
      const roiPercent =
        Number.isFinite(Number(item.roiPercent))
          ? Number(item.roiPercent)
          : Number.isFinite(Number(item.roi_percent))
            ? Number(item.roi_percent)
            : (Number(item.initial) > 0
                ? (Number(item.profit) / Number(item.initial)) * 100
                : 0);

      return `
      <tr>
        <td>${item.title}</td>
        <td>${Number(item.initial).toFixed(2)}</td>
        <td>${Number(item.rate_percent).toFixed(2)}</td>
        <td>${Number(item.years).toFixed(2)}</td>
        <td>${Number(item.final_amount).toFixed(2)}</td>
        <td>${Number(item.profit).toFixed(2)}</td>
        <td>${roiPercent.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger delete-calc" data-id="${item._id}" title="Delete">
            <i class="bi bi-x-lg"></i>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// Handle delete button clicks (event delegation)
historyBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-calc');
  if (!btn) return;

  const id = btn.dataset.id;
  if (!id) return;

  if (!confirm('Delete this calculation? This cannot be undone.')) return;

  try {
    showLoading(true);
    const resp = await apiClient.deleteCalculation(id);
    if (resp.success) {
      showSuccess('Calculation deleted');
      await loadCalculations();
    } else {
      showError('Failed to delete calculation');
    }
  } catch (err) {
    showError('Error deleting calculation');
  } finally {
    showLoading(false);
  }
});

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
  let roiPercent = (roi / initial) * 100;

  let resultDiv = document.getElementById("result");
  resultDiv.classList.remove("d-none");

  resultDiv.innerHTML = `
    <strong>Final Amount:</strong> RM ${finalAmount.toFixed(2)} <br>
    <strong>Profit (ROI):</strong> RM ${roi.toFixed(2)}
    <strong>ROI Percentage:</strong> ${roiPercent.toFixed(2)}%
  `;

  latestCalculation = {
    initial,
    ratePercent: rate * 100,
    years,
    finalAmount,
    roi,
    roiPercent
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
      showError("Failed to save calculation.");
    }
  } catch (error) {
    const errorMessage = error?.message || "Error saving calculation.";
    if (errorMessage.includes("401") || errorMessage.toLowerCase().includes("authorization")) {
      showError("Your session has expired. Please log in again.");
      window.location.href = "login.html";
      return;
    }

    showError(errorMessage);
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
