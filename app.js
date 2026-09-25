const LOG_KEY = "insulinDoseLog";

function calculateDose(carbs, bg) {
  const base = Math.ceil(carbs / 12);
  const bolus = bg > 200 ? Math.ceil((bg - 120) / 50) : 0;
  const total = base + bolus;
  return { base, bolus, total };
}

function loadLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLog(entries) {
  localStorage.setItem(LOG_KEY, JSON.stringify(entries));
}

function appendLogEntry(entry) {
  const entries = loadLog();
  entries.push(entry);
  saveLog(entries);
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("dose-form");
  const carbsInput = document.getElementById("carbs-input");
  const bgInput = document.getElementById("bg-input");
  const errorMessage = document.getElementById("error-message");
  const result = document.getElementById("result");
  const resultBase = document.getElementById("result-base");
  const resultBolus = document.getElementById("result-bolus");
  const resultTotal = document.getElementById("result-total");

  const calcView = document.getElementById("calc-view");
  const logView = document.getElementById("log-view");
  const viewLogBtn = document.getElementById("view-log-btn");
  const backBtn = document.getElementById("back-btn");
  const clearLogBtn = document.getElementById("clear-log-btn");
  const logTableBody = document.getElementById("log-table-body");
  const logEmpty = document.getElementById("log-empty");
  const logTableWrap = document.getElementById("log-table-wrap");

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    result.hidden = true;
  }

  function clearError() {
    errorMessage.hidden = true;
    errorMessage.textContent = "";
  }

  function parsePositiveNumber(rawValue) {
    const value = Number(rawValue);
    if (rawValue === "" || Number.isNaN(value) || !Number.isFinite(value)) {
      return { valid: false };
    }
    if (value <= 0) {
      return { valid: false };
    }
    return { valid: true, value };
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError();

    const carbsRaw = carbsInput.value.trim();
    const bgRaw = bgInput.value.trim();
    const carbsResult = parsePositiveNumber(carbsRaw);
    const bgResult = parsePositiveNumber(bgRaw);

    const errors = [];
    if (!carbsResult.valid) {
      errors.push("Enter a valid total carbs amount (grams greater than 0).");
    }
    if (!bgResult.valid) {
      errors.push("Enter a valid blood glucose number (greater than 0).");
    }
    if (errors.length > 0) {
      showError(errors.join("\n"));
      return;
    }

    const carbs = carbsResult.value;
    const bg = bgResult.value;
    const { base, bolus, total } = calculateDose(carbs, bg);

    resultBase.textContent = base;
    resultBolus.textContent = bolus;
    resultTotal.textContent = total;
    result.hidden = false;

    appendLogEntry({
      timestamp: new Date().toISOString(),
      carbs,
      bg,
      base,
      bolus,
      total,
    });
  });

  function renderLog() {
    const entries = loadLog().slice().reverse();
    logTableBody.innerHTML = "";

    if (entries.length === 0) {
      logEmpty.hidden = false;
      logTableWrap.hidden = true;
      return;
    }

    logEmpty.hidden = true;
    logTableWrap.hidden = false;

    for (const entry of entries) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formatTimestamp(entry.timestamp)}</td>
        <td>${entry.carbs ?? "-"}</td>
        <td>${entry.bg}</td>
        <td>${entry.base}</td>
        <td>${entry.bolus}</td>
        <td>${entry.total}</td>
      `;
      logTableBody.appendChild(row);
    }
  }

  viewLogBtn.addEventListener("click", () => {
    renderLog();
    calcView.hidden = true;
    logView.hidden = false;
  });

  backBtn.addEventListener("click", () => {
    logView.hidden = true;
    calcView.hidden = false;
  });

  clearLogBtn.addEventListener("click", () => {
    if (confirm("Clear the entire calculation log? This cannot be undone.")) {
      saveLog([]);
      renderLog();
    }
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
});
