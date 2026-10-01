// Popup Script for Web Bug & Error Inspector

let currentTabId = null;
let currentTabUrl = "";
let latestData = {
  logs: [],
  webVitals: {},
  a11yIssues: [],
  linkResults: null
};

document.addEventListener("DOMContentLoaded", async () => {
  // Setup tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Query active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    currentTabId = tab.id;
    currentTabUrl = tab.url || "";
    document.getElementById("page-url").textContent = currentTabUrl.replace(/^https?:\/\//, "");

    // Load initial data
    loadPageData();
  } catch (err) {
    console.error("Failed to query tab:", err);
  }

  // Event Listeners
  document.getElementById("btn-clear-logs").addEventListener("click", clearLogs);
  document.getElementById("btn-scan-links").addEventListener("click", runLinkScan);
  document.getElementById("btn-scan-a11y").addEventListener("click", runA11yScan);
  document.getElementById("btn-toggle-pesticide").addEventListener("click", togglePesticide);
  document.getElementById("btn-export").addEventListener("click", exportReport);
});

async function loadPageData() {
  if (!currentTabId) return;

  try {
    const res = await chrome.tabs.sendMessage(currentTabId, { action: "GET_PAGE_DATA" });
    if (!res) return;

    latestData.logs = res.logs || [];
    latestData.webVitals = res.webVitals || {};

    renderErrors(latestData.logs);
    renderVitals(latestData.webVitals);

    const toggleBtn = document.getElementById("btn-toggle-pesticide");
    if (res.pesticideActive) {
      toggleBtn.classList.add("active");
      toggleBtn.textContent = "Disable";
    } else {
      toggleBtn.classList.remove("active");
      toggleBtn.textContent = "Enable";
    }
  } catch (e) {
    const list = document.getElementById("error-list");
    list.innerHTML = `<div class="empty-state">Unable to inspect this page (e.g. chrome:// or internal URL). Try refreshing or navigating to any standard web page.</div>`;
  }
}

function renderVitals(vitals) {
  const statCls = document.getElementById("stat-cls");
  const statLcp = document.getElementById("stat-lcp");
  const perfBreakdown = document.getElementById("perf-breakdown");

  if (vitals.cls !== undefined) {
    statCls.textContent = vitals.cls.toFixed(3);
    statCls.style.color = vitals.cls > 0.1 ? "#ef4444" : "#10b981";
  }

  if (vitals.lcp !== null && vitals.lcp !== undefined) {
    statLcp.textContent = `${vitals.lcp}ms`;
    statLcp.style.color = vitals.lcp > 2500 ? "#ef4444" : "#10b981";
  } else {
    statLcp.textContent = "N/A";
  }

  perfBreakdown.textContent = `TTFB: ${vitals.ttfb ? vitals.ttfb + "ms" : "--"} | DOM Ready: ${
    vitals.domReadyTime ? vitals.domReadyTime + "ms" : "--"
  } | Page Load: ${vitals.pageLoadTime ? vitals.pageLoadTime + "ms" : "--"}`;
}

function renderErrors(logs) {
  const list = document.getElementById("error-list");
  const statErrors = document.getElementById("stat-errors");
  const statWarnings = document.getElementById("stat-warnings");

  let errCount = 0;
  let warnCount = 0;

  logs.forEach((l) => {
    if (l.level === "error") errCount++;
    if (l.level === "warning") warnCount++;
  });

  statErrors.textContent = errCount;
  statWarnings.textContent = warnCount;

  if (logs.length === 0) {
    list.innerHTML = `<div class="empty-state">No runtime errors or console issues detected on this page. 🎉</div>`;
    return;
  }

  list.innerHTML = "";
  logs.forEach((log) => {
    const card = document.createElement("div");
    card.className = `item-card ${log.level}`;

    card.innerHTML = `
      <div class="item-header">
        <span class="item-badge">${log.category || log.level}</span>
        <span class="item-time">${log.timestamp || ""}</span>
      </div>
      <div class="item-title">${escapeHtml(log.title || "Log Entry")}</div>
      <div class="item-msg">${escapeHtml(log.message || "")}</div>
      ${log.filename ? `<div class="item-time">Location: ${escapeHtml(log.filename)}:${log.lineno || 0}</div>` : ""}
    `;
    list.appendChild(card);
  });
}

async function runLinkScan() {
  const btn = document.getElementById("btn-scan-links");
  const list = document.getElementById("links-list");
  const summary = document.getElementById("links-summary");

  btn.textContent = "Scanning...";
  btn.disabled = true;

  try {
    const res = await chrome.tabs.sendMessage(currentTabId, { action: "RUN_LINK_CHECK" });
    latestData.linkResults = res;

    summary.classList.remove("hidden");
    summary.textContent = `Scanned ${res.totalChecked} items: Found ${res.brokenCount} broken.`;

    if (res.brokenItems.length === 0 && res.warningItems.length === 0) {
      list.innerHTML = `<div class="empty-state">All checked links and images loaded successfully! ✅</div>`;
    } else {
      list.innerHTML = "";
      res.brokenItems.forEach((item) => {
        const card = document.createElement("div");
        card.className = "item-card error";
        card.innerHTML = `
          <div class="item-header">
            <span class="item-badge">BROKEN ${item.type}</span>
            <span class="item-time">Status: ${item.status}</span>
          </div>
          <div class="item-title">${escapeHtml(item.url)}</div>
        `;
        list.appendChild(card);
      });

      res.warningItems.forEach((item) => {
        const card = document.createElement("div");
        card.className = "item-card warning";
        card.innerHTML = `
          <div class="item-header">
            <span class="item-badge">TIMEOUT / UNCONFIRMED</span>
            <span class="item-time">${item.status}</span>
          </div>
          <div class="item-title">${escapeHtml(item.url)}</div>
        `;
        list.appendChild(card);
      });
    }
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Link scan failed. Make sure page is loaded.</div>`;
  } finally {
    btn.textContent = "Scan Links & Images";
    btn.disabled = false;
  }
}

async function runA11yScan() {
  const btn = document.getElementById("btn-scan-a11y");
  const list = document.getElementById("a11y-list");

  btn.textContent = "Auditing...";
  btn.disabled = true;

  try {
    const res = await chrome.tabs.sendMessage(currentTabId, { action: "RUN_A11Y_AUDIT" });
    latestData.a11yIssues = res.issues || [];

    if (latestData.a11yIssues.length === 0) {
      list.innerHTML = `<div class="empty-state">No semantic or accessibility violations found! 🌟</div>`;
    } else {
      list.innerHTML = "";
      latestData.a11yIssues.forEach((issue) => {
        const card = document.createElement("div");
        card.className = `item-card ${issue.severity}`;
        card.innerHTML = `
          <div class="item-header">
            <span class="item-badge">${issue.type} • ${issue.severity}</span>
          </div>
          <div class="item-title">${escapeHtml(issue.title)}</div>
          <div class="item-msg">${escapeHtml(issue.detail)}</div>
          <div class="item-recommendation">Fix: ${escapeHtml(issue.recommendation)}</div>
        `;
        list.appendChild(card);
      });
    }
  } catch (err) {
    list.innerHTML = `<div class="empty-state">A11y audit failed. Make sure page is loaded.</div>`;
  } finally {
    btn.textContent = "Audit Page";
    btn.disabled = false;
  }
}

async function togglePesticide() {
  const btn = document.getElementById("btn-toggle-pesticide");
  try {
    const res = await chrome.tabs.sendMessage(currentTabId, { action: "TOGGLE_PESTICIDE" });
    if (res && res.active) {
      btn.classList.add("active");
      btn.textContent = "Disable";
    } else {
      btn.classList.remove("active");
      btn.textContent = "Enable";
    }
  } catch (err) {
    console.error("Failed to toggle layout outline:", err);
  }
}

async function clearLogs() {
  try {
    await chrome.tabs.sendMessage(currentTabId, { action: "CLEAR_LOGS" });
    await chrome.runtime.sendMessage({ action: "CLEAR_TAB_LOGS", tabId: currentTabId });
    latestData.logs = [];
    renderErrors([]);
  } catch (_) {}
}

async function exportReport() {
  const btn = document.getElementById("btn-export");
  const origText = btn.textContent;

  let report = `# Bug & Error Inspection Report\n`;
  report += `**URL**: ${currentTabUrl}\n`;
  report += `**Date**: ${new Date().toLocaleString()}\n\n`;

  report += `## 1. Web Vitals & Performance\n`;
  report += `- CLS: ${latestData.webVitals.cls ?? "N/A"}\n`;
  report += `- LCP: ${latestData.webVitals.lcp ? latestData.webVitals.lcp + "ms" : "N/A"}\n`;
  report += `- TTFB: ${latestData.webVitals.ttfb ? latestData.webVitals.ttfb + "ms" : "N/A"}\n`;
  report += `- Page Load Time: ${latestData.webVitals.pageLoadTime ? latestData.webVitals.pageLoadTime + "ms" : "N/A"}\n\n`;

  report += `## 2. Runtime Errors & Console Logs (${latestData.logs.length})\n`;
  if (latestData.logs.length === 0) {
    report += `*No runtime errors detected.*\n\n`;
  } else {
    latestData.logs.forEach((log, i) => {
      report += `### ${i + 1}. [${log.level.toUpperCase()}] ${log.title}\n`;
      report += `\`\`\`\n${log.message}\n\`\`\`\n`;
      if (log.filename) report += `*Location: ${log.filename}:${log.lineno || 0}*\n\n`;
    });
  }

  if (latestData.a11yIssues.length > 0) {
    report += `## 3. Accessibility & DOM Issues (${latestData.a11yIssues.length})\n`;
    latestData.a11yIssues.forEach((issue, i) => {
      report += `### ${i + 1}. ${issue.title}\n`;
      report += `- Detail: ${issue.detail}\n`;
      report += `- Recommendation: ${issue.recommendation}\n\n`;
    });
  }

  if (latestData.linkResults && latestData.linkResults.brokenItems.length > 0) {
    report += `## 4. Broken Links & Dead Media (${latestData.linkResults.brokenItems.length})\n`;
    latestData.linkResults.brokenItems.forEach((b, i) => {
      report += `- [${b.type}] ${b.url} (Status: ${b.status})\n`;
    });
    report += `\n`;
  }

  try {
    await navigator.clipboard.writeText(report);
    btn.textContent = "✅ Copied!";
    setTimeout(() => {
      btn.textContent = origText;
    }, 2000);
  } catch (err) {
    alert("Copied to console!");
    console.log(report);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
