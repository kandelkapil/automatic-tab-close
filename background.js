const browserAPI = typeof browser !== "undefined" ? browser : chrome;

// Initialize or retrieve closed tab data and whitelist
function initializeStorage() {
  browserAPI.storage.local.get(
    [
      "closedTabCount",
      "closedTabUrls",
      "whitelistDomains",
      "reverseCloseDomains",
      "reverseCloseEnabled",
    ],
    (result) => {
      if (!result.closedTabCount)
        browserAPI.storage.local.set({ closedTabCount: 0 });
      if (!result.closedTabUrls)
        browserAPI.storage.local.set({ closedTabUrls: [] });
      if (!result.whitelistDomains)
        browserAPI.storage.local.set({ whitelistDomains: [] });
      if (!result.reverseCloseDomains)
        browserAPI.storage.local.set({ reverseCloseDomains: [] });
      if (result.reverseCloseEnabled === undefined)
        browserAPI.storage.local.set({ reverseCloseEnabled: false });
    }
  );
}

// Check if the reverse close feature is enabled
function isReverseCloseEnabled() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get("reverseCloseEnabled", (result) => {
      resolve(result.reverseCloseEnabled || false);
    });
  });
}

// Check if a URL's domain is in the reverse close list
function isDomainInReverseCloseList(url) {
  return new Promise((resolve) => {
    const domain = new URL(url).hostname;
    browserAPI.storage.local.get("reverseCloseDomains", (result) => {
      const reverseCloseList = result.reverseCloseDomains || [];
      resolve(reverseCloseList.includes(domain));
    });
  });
}

// Check if a URL's domain is in the whitelist
function isDomainWhitelisted(url) {
  return new Promise((resolve) => {
    const domain = new URL(url).hostname;
    browserAPI.storage.local.get("whitelistDomains", (result) => {
      const whitelist = result.whitelistDomains || [];
      resolve(whitelist.includes(domain));
    });
  });
}

// Increment the closed tab count and store the URL
function recordClosedTab(tabUrl) {
  if (!tabUrl) return; // Prevent recording if URL is empty

  browserAPI.storage.local.get(
    ["closedTabCount", "closedTabUrls"],
    (result) => {
      const newCount = (result.closedTabCount || 0) + 1;
      const newUrls = [...(result.closedTabUrls || []), tabUrl];
      browserAPI.storage.local.set({
        closedTabCount: newCount,
        closedTabUrls: newUrls,
      });
    }
  );
}

// Listen for new tab creation and detect if it was programmatically opened
browserAPI.tabs.onCreated.addListener(async (tab) => {
  if (tab.openerTabId) {
    const reverseCloseEnabled = await isReverseCloseEnabled();

    // Add listener to check when the tab is updated
    const listener = async (tabId, changeInfo, updatedTab) => {
      if (
        tabId === tab.id &&
        changeInfo.url &&
        updatedTab.url &&
        updatedTab.url !== "about:blank"
      ) {
        if (reverseCloseEnabled) {
          // Get the opener tab
          const openerTab = await browserAPI.tabs.get(tab.openerTabId);
          const openerDomain = new URL(openerTab.url).hostname;

          // Check if the opener domain is in the reverse close list
          const inReverseCloseList = await isDomainInReverseCloseList(
            openerTab.url
          );
          if (inReverseCloseList) {
            // Record closed tab with the correct URL before closing it
            recordClosedTab(updatedTab.url);
            browserAPI.tabs.remove(tab.id);
            return; // Exit here as reverse close handled the tab
          }
        } else {
          // Check whitelist only if reverse close is disabled
          const isWhitelisted = await isDomainWhitelisted(updatedTab.url);
          if (!isWhitelisted) {
            // Record closed tab with the correct URL
            recordClosedTab(updatedTab.url);
            browserAPI.tabs.remove(tab.id);
          }
        }
        // Remove listener after handling the tab
        browserAPI.tabs.onUpdated.removeListener(listener);
      }
    };

    // Add the listener for URL updates
    browserAPI.tabs.onUpdated.addListener(listener);
  }
});

// Clear storage when the extension is uninstalled
browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === "uninstall") {
    browserAPI.storage.local.clear();
  }
});

initializeStorage();
