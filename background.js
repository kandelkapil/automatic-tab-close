const storage = typeof browser !== "undefined" ? browser.storage.local : chrome.storage.local;

let trackedTabs = {}; // Keeps track of parent tab ID and its originating domain

// Function to update the enable/disable state
function updateExtensionState(isEnabled) {
  storage.set({ isEnabled }, () => {
    if (isEnabled) {
      console.log("Extension is enabled.");
      // Force domain check for all open tabs immediately after enabling
      forceDomainCheck(); 
    } else {
      console.log("Extension is disabled.");
      // Optionally clear tracked tabs if needed
      trackedTabs = {};
    }
  });
}

// Listen for changes in the enable/disable checkbox and immediately toggle the state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleState") {
    storage.get("isEnabled", (data) => {
      const isEnabled = data.isEnabled || false;
      updateExtensionState(!isEnabled); // Toggle the state
    });
  }
});

// Force domain check for all open tabs, including those that are already open
function forceDomainCheck() {
  chrome.tabs.query({}, (tabs) => {
    storage.get(["isEnabled", "domains"], (data) => {
      const { isEnabled, domains } = data;
      if (isEnabled && domains) {
        tabs.forEach((tab) => {
          try {
            const tabUrl = new URL(tab.url);
            // Check if the current tab's domain is in the list
            if (domains.includes(tabUrl.hostname)) {
              trackedTabs[tab.id] = tabUrl.hostname; // Mark this tab as a tracked origin
            } else {
              // If the domain doesn't match, close the tab (if necessary)
              chrome.tabs.remove(tab.id, () => {
                console.log(`Tab closed due to domain mismatch: ${tabUrl.hostname}`);
              });
            }
          } catch (e) {
            // Ignore any invalid URL errors
          }
        });
      }
    });
  });
}

// Track the domain of each tab when it finishes loading or when a new tab is created
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    storage.get(["isEnabled", "domains"], (data) => {
      const { isEnabled, domains } = data;
      if (isEnabled && domains) {
        try {
          const tabUrl = new URL(tab.url);
          // Check if the current tab's domain is in the list
          if (domains.includes(tabUrl.hostname)) {
            trackedTabs[tabId] = tabUrl.hostname; // Mark this tab as a tracked origin
          } else {
            // If domain doesn't match, close the tab
            chrome.tabs.remove(tabId, () => {
              console.log(`Tab closed due to domain mismatch: ${tabUrl.hostname}`);
            });
          }
        } catch (e) {
          // Ignore any invalid URL errors
        }
      }
    });
  }
});

// Add a listener for new tab creations
chrome.tabs.onCreated.addListener((tab) => {
  storage.get(["isEnabled", "domains"], (data) => {
    const { isEnabled, domains } = data;
    if (isEnabled && domains) {
      try {
        const tabUrl = new URL(tab.url);
        if (domains.includes(tabUrl.hostname)) {
          trackedTabs[tab.id] = tabUrl.hostname; // Mark this tab as a tracked origin
        } else {
          chrome.tabs.remove(tab.id, () => {
            console.log(`Tab closed due to domain mismatch: ${tabUrl.hostname}`);
          });
        }
      } catch (e) {
        // Ignore any invalid URL errors
      }
    }
  });
});

// When a new tab is created via a link (target="_blank")
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  storage.get(["isEnabled", "domains", "closeCount", "closedDomains"], (data) => {
    const { isEnabled, domains, closeCount, closedDomains } = data;
    if (isEnabled && domains) {
      const openerTabId = details.sourceTabId;
      const newTabUrl = new URL(details.url);

      // Check if the opener tab's domain is in the tracked list
      if (trackedTabs[openerTabId]) {
        // Compare the opener tab's domain with the new tab's domain
        if (trackedTabs[openerTabId] === newTabUrl.hostname) {
          console.log("Tab opened with matching domain:", newTabUrl.hostname);
        } else {
          chrome.tabs.remove(details.tabId, () => {
            const updatedClosedDomains = { ...closedDomains };
            if (updatedClosedDomains[newTabUrl.hostname]) {
              updatedClosedDomains[newTabUrl.hostname] += 1;
            } else {
              updatedClosedDomains[newTabUrl.hostname] = 1;
            }

            // Store the updated closed domains and increment closeCount
            storage.set({
              closeCount: (closeCount || 0) + 1,
              closedDomains: updatedClosedDomains,
            });

            console.log("Tab closed due to domain mismatch:", newTabUrl.hostname);
          });
        }
      }
    }
  });
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
        // Trigger the domain check after adding a new domain
        forceDomainCheck();
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
    const updatedDomains = domains.filter((domain) => domain !== domainToRemove);
    storage.set({ domains: updatedDomains }, () => {
      console.log(`Domain ${domainToRemove} removed.`);
      // Trigger the domain check after removing a domain
      forceDomainCheck();
    });
  });
}
