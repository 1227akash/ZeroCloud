// Background Service Worker for Web Bug & Error Inspector

const tabData = {};

function initTab(tabId) {
  if (!tabData[tabId]) {
    tabData[tabId] = {
      errorsCount: 0,
      warningsCount: 0
    };
  }
}

function updateBadge(tabId) {
  const data = tabData[tabId];
  if (!data || data.errorsCount === 0) {
    if (data && data.warningsCount > 0) {
      chrome.action.setBadgeText({ tabId, text: String(data.warningsCount) });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#F59E0B" }); // Amber
    } else {
      chrome.action.setBadgeText({ tabId, text: "" });
    }
  } else {
    chrome.action.setBadgeText({ tabId, text: String(data.errorsCount) });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#EF4444" }); // Red
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;

  if (message.action === "REPORT_LOG" && tabId) {
    initTab(tabId);
    if (message.log.level === "error") {
      tabData[tabId].errorsCount += 1;
    } else if (message.log.level === "warning") {
      tabData[tabId].warningsCount += 1;
    }
    updateBadge(tabId);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "CLEAR_TAB_LOGS" && message.tabId) {
    tabData[message.tabId] = { errorsCount: 0, warningsCount: 0 };
    updateBadge(message.tabId);
    sendResponse({ success: true });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabData[tabId] = { errorsCount: 0, warningsCount: 0 };
    updateBadge(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabData[tabId];
});
