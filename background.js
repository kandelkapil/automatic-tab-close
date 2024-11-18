const storage =
  typeof browser !== "undefined" ? browser.storage.local : chrome.storage.local;

// Function to update the extension's enable/disable state
function updateExtensionState(isEnabled) {
  storage.set({ isEnabled }, () => {
    if (isEnabled) {
      console.log("Extension is enabled.");
    } else {
      console.log("Extension is disabled.");
    }
  });
}

// Listen for messages to toggle the extension state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleState") {
    storage.get("isEnabled", (data) => {
      const isEnabled = data?.isEnabled || false;
      updateExtensionState(!isEnabled);
    });
  }
});

// Handle new tab navigation (e.g., opening a link from another tab)
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  storage.get(
    ["isEnabled", "domains", "closeCount", "closedDomains"],
    (data) => {
      const { isEnabled, domains, closeCount, closedDomains } = data;

      if (isEnabled && domains?.length) {
        const currentDomain = new URL(details?.url)?.hostname;
        const isFromValidDomain = domains?.includes(currentDomain);
        const sourceTabId = details?.sourceTabId;
        const currentTabId = details?.tabId;
        chrome.tabs.get(sourceTabId, (tab) => {
          if (tab && tab?.url) {
            const sourceDomain = new URL(tab.url)?.hostname;
            const isSourceDomainNotInDomainList = !domains?.includes(sourceDomain);
            if (isSourceDomainNotInDomainList || isFromValidDomain) return;
            chrome.tabs.remove(currentTabId, () => {
              const updatedClosedDomains = { ...closedDomains };
              updatedClosedDomains[currentDomain] =
                (updatedClosedDomains[currentDomain] || 0) + 1;

              storage.set({
                closeCount: (closeCount || 0) + 1,
                closedDomains: updatedClosedDomains,
              });

              console.log(
                `Tab closed due to domain mismatch: ${currentDomain} onCreatedNavigationTarget`
              );
            });
          }
        });
      }
    }
  );
});

// Clear data on uninstall
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "uninstall") {
    storage.clear();
  }
});

// Function to add a new domain
function addDomain(newDomain) {
  storage.get("domains", (data) => {
    const domains = data.domains || [];
    if (!domains.includes(newDomain)) {
      domains.push(newDomain);
      storage.set({ domains }, () => {
        console.log(`Domain ${newDomain} added.`);
        forceDomainCheck(); // Check all tabs after domain is added
      });
    } else {
      console.log(`Domain ${newDomain} already exists.`);
    }
  });
}

// Function to remove a domain
function removeDomain(domainToRemove) {
  storage.get("domains", (data) => {
    const domains = data.domains || [];
    const updatedDomains = domains.filter(
      (domain) => domain !== domainToRemove
    );
    storage.set({ domains: updatedDomains }, () => {
      console.log(`Domain ${domainToRemove} removed.`);
      forceDomainCheck(); // Check all tabs after domain is removed
    });
  });
}
