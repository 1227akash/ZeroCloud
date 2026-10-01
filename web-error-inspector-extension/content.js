// Content script (Isolated World)
let collectedLogs = [];
let pesticideActive = false;
let webVitals = {
  cls: 0,
  lcp: null,
  domReadyTime: null,
  pageLoadTime: null,
  ttfb: null
};

// 1. Capture logs from injected script in main world
window.addEventListener("__WEB_INSPECTOR_LOG__", (event) => {
  const log = event.detail;
  collectedLogs.unshift(log); // newest first
  if (collectedLogs.length > 200) collectedLogs.pop(); // keep last 200

  // Inform background service worker to update badge
  try {
    chrome.runtime.sendMessage({
      action: "REPORT_LOG",
      log: { level: log.level }
    });
  } catch (_) {}
});

// 2. Track Performance & Web Vitals
try {
  // Navigation Timing
  window.addEventListener("load", () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) {
        webVitals.domReadyTime = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
        webVitals.pageLoadTime = Math.round(nav.loadEventEnd - nav.startTime);
        webVitals.ttfb = Math.round(nav.responseStart - nav.requestStart);
      }
    }, 500);
  });

  // CLS Observer
  const clsObserver = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (!entry.hadRecentInput) {
        webVitals.cls = Number((webVitals.cls + entry.value).toFixed(4));
      }
    }
  });
  clsObserver.observe({ type: "layout-shift", buffered: true });

  // LCP Observer
  const lcpObserver = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      webVitals.lcp = Math.round(lastEntry.startTime);
    }
  });
  lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
} catch (e) {
  // PerformanceObserver not supported on some URLs
}

// 3. Accessibility (A11y) Scanner
function runA11yAudit() {
  const issues = [];

  // Check images missing alt attribute
  document.querySelectorAll("img").forEach((img) => {
    if (!img.hasAttribute("alt")) {
      issues.push({
        type: "a11y",
        severity: "error",
        title: "Missing <img> alt text",
        detail: `Image src: ${img.src.substring(0, 70)}...`,
        recommendation: "Add descriptive alt='' or alt='' for decorative images."
      });
    }
  });

  // Check buttons without accessible name
  document.querySelectorAll("button").forEach((btn) => {
    const text = btn.innerText.trim();
    const aria = btn.getAttribute("aria-label") || btn.getAttribute("aria-labelledby");
    if (!text && !aria && !btn.querySelector("svg, img")) {
      issues.push({
        type: "a11y",
        severity: "error",
        title: "Empty <button>",
        detail: `Button has no text, svg, or aria-label: ${btn.outerHTML.substring(0, 60)}`,
        recommendation: "Provide text content or aria-label for screen readers."
      });
    }
  });

  // Check links without accessible text
  document.querySelectorAll("a").forEach((a) => {
    const text = a.innerText.trim();
    const aria = a.getAttribute("aria-label") || a.getAttribute("aria-labelledby");
    const hasVisual = a.querySelector("img, svg");
    if (!text && !aria && !hasVisual && a.href) {
      issues.push({
        type: "a11y",
        severity: "warning",
        title: "Empty link <a> tag",
        detail: `Link to ${a.href.substring(0, 60)} has no text content.`,
        recommendation: "Add text or an aria-label describing the link destination."
      });
    }
  });

  // Check inputs without associated label or aria-label
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.type === "hidden" || input.type === "submit" || input.type === "button") return;
    const id = input.id;
    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
    const isWrappedInLabel = input.closest("label");
    const hasAria = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");

    if (!hasLabel && !isWrappedInLabel && !hasAria) {
      issues.push({
        type: "a11y",
        severity: "warning",
        title: `Unlabeled form control <${input.tagName.toLowerCase()}>`,
        detail: `Name: '${input.name || ""}', Placeholder: '${input.placeholder || ""}'`,
        recommendation: "Associate with a <label for='...'> or add aria-label."
      });
    }
  });

  // Check duplicate IDs
  const idMap = {};
  document.querySelectorAll("[id]").forEach((el) => {
    const id = el.id.trim();
    if (id) {
      if (idMap[id]) {
        issues.push({
          type: "dom",
          severity: "error",
          title: `Duplicate DOM ID: #${id}`,
          detail: `Multiple elements share id="${id}". Breaks DOM queries and accessibility.`,
          recommendation: "DOM IDs must be unique per page."
        });
      } else {
        idMap[id] = true;
      }
    }
  });

  // Check heading order
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  let lastLevel = 0;
  for (const h of headings) {
    const level = parseInt(h.tagName.substring(1), 10);
    if (lastLevel > 0 && level > lastLevel + 1) {
      issues.push({
        type: "a11y",
        severity: "warning",
        title: `Skipped heading level <${h.tagName.toLowerCase()}>`,
        detail: `Jumped directly from <h${lastLevel}> to <h${level}>: "${h.innerText.substring(0, 40)}"`,
        recommendation: "Do not skip heading levels (e.g. h1 to h3) to maintain document hierarchy."
      });
    }
    lastLevel = level;
  }

  return issues;
}

// 4. Broken Link & Resource Scanner
async function runLinkCheck() {
  const links = Array.from(document.querySelectorAll("a[href]"));
  const images = Array.from(document.querySelectorAll("img[src]"));
  const results = {
    totalChecked: 0,
    brokenCount: 0,
    brokenItems: [],
    warningItems: []
  };

  // Check broken images directly from DOM
  images.forEach((img) => {
    results.totalChecked += 1;
    if (img.complete && img.naturalWidth === 0 && img.src) {
      results.brokenCount += 1;
      results.brokenItems.push({
        type: "image",
        status: 404,
        url: img.src,
        element: `<img src="${img.src.substring(0, 50)}...">`
      });
    }
  });

  // Check page links (limit first 25 to avoid rate-limiting or freezing)
  const uniqueUrls = [...new Set(links.map((a) => a.href).filter((h) => h.startsWith("http")))].slice(0, 25);

  const checks = uniqueUrls.map(async (url) => {
    results.totalChecked += 1;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status >= 400) {
        results.brokenCount += 1;
        results.brokenItems.push({ type: "link", status: res.status, url });
      }
    } catch (err) {
      // Aborted or network failure
      if (err.name === "AbortError") {
        results.warningItems.push({ type: "link", status: "Timeout (4s)", url });
      }
    }
  });

  await Promise.allSettled(checks);
  return results;
}

// 5. Pesticide CSS Toggle
function togglePesticide() {
  pesticideActive = !pesticideActive;
  let styleEl = document.getElementById("__web_inspector_pesticide");

  if (pesticideActive) {
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "__web_inspector_pesticide";
      styleEl.textContent = `
        div { outline: 1px solid #3b82f6 !important; }
        header, nav, footer { outline: 2px solid #10b981 !important; }
        article, section, main { outline: 2px solid #8b5cf6 !important; }
        button, a, input, select, textarea { outline: 2px dashed #f59e0b !important; }
        h1, h2, h3, h4, h5, h6 { outline: 1px solid #ef4444 !important; }
        p, span, label { outline: 1px dotted #ec4899 !important; }
        img, svg, video { outline: 2px solid #06b6d4 !important; }
      `;
      document.head.appendChild(styleEl);
    }
  } else {
    if (styleEl) {
      styleEl.remove();
    }
  }
  return pesticideActive;
}

// 6. Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_PAGE_DATA") {
    sendResponse({
      logs: collectedLogs,
      webVitals: webVitals,
      pesticideActive: pesticideActive,
      title: document.title,
      url: window.location.href
    });
    return true;
  }

  if (request.action === "RUN_A11Y_AUDIT") {
    const issues = runA11yAudit();
    sendResponse({ issues });
    return true;
  }

  if (request.action === "RUN_LINK_CHECK") {
    runLinkCheck().then((data) => {
      sendResponse(data);
    });
    return true;
  }

  if (request.action === "TOGGLE_PESTICIDE") {
    const active = togglePesticide();
    sendResponse({ active });
    return true;
  }

  if (request.action === "CLEAR_LOGS") {
    collectedLogs = [];
    sendResponse({ success: true });
    return true;
  }
});
