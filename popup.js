// Helper function to extract only the domain name from a URL
function getBaseDomain(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    return url; // Return the original URL if parsing fails
  }
}

// Display the closed tab data with grouped domains and counts
function displayClosedTabData() {
  chrome.storage.local.get(["closedTabCount", "closedTabUrls"], (result) => {
    document.getElementById(
      "closedTabCount"
    ).textContent = `Total closed tabs: ${result.closedTabCount || 0}`;

    const closedTabUrlsDiv = document.getElementById("closedTabUrls");

    // Check if there are closed tabs to display
    if (result.closedTabUrls && result.closedTabUrls.length > 0) {
      closedTabUrlsDiv.style.display = "block"; // Show the div when there are items
      closedTabUrlsDiv.innerHTML = ""; // Clear previous content

      // Count occurrences of each domain
      const domainCounts = {};
      result.closedTabUrls.forEach((url) => {
        const domain = getBaseDomain(url);
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      });

      // Display each domain with its count
      Object.entries(domainCounts).forEach(([domain, count], index) => {
        const urlElement = document.createElement("div");
        urlElement.className = "tab-info";

        const link = document.createElement("a");
        link.href = `https://${domain}`;
        link.target = "_blank";
        link.textContent = `${index + 1}. ${domain}`;

        // Add count display next to domain if more than once
        const countText = document.createElement("span");
        countText.style.marginLeft = "5px";
        countText.style.fontWeight = "bold";
        countText.textContent = count > 1 ? `x${count}` : "";

        urlElement.appendChild(link);
        urlElement.appendChild(countText);
        closedTabUrlsDiv.appendChild(urlElement);
      });
    } else {
      closedTabUrlsDiv.style.display = "none"; // Hide if no closed tabs
    }
  });
}

// Display the whitelist domains with a remove button and show/hide the list container based on content
function displayWhitelist() {
  chrome.storage.local.get("whitelistDomains", (result) => {
    const whitelistDiv = document.getElementById("whitelistDomains");

    // Check if there are domains in the whitelist
    if (result.whitelistDomains && result.whitelistDomains.length > 0) {
      whitelistDiv.style.display = "block"; // Show the div when there are items
      whitelistDiv.innerHTML = ""; // Clear previous content

      result.whitelistDomains.forEach((domain) => {
        const domainElement = document.createElement("div");
        domainElement.className = "whitelist-item";

        const domainText = document.createElement("span");
        domainText.textContent = domain;

        const removeBtn = document.createElement("span");
        removeBtn.className = "remove-btn";
        removeBtn.textContent = "✖";
        removeBtn.addEventListener("click", () =>
          removeDomainFromWhitelist(domain)
        );

        domainElement.appendChild(domainText);
        domainElement.appendChild(removeBtn);
        whitelistDiv.appendChild(domainElement);
      });
    } else {
      whitelistDiv.style.display = "none"; // Hide if list is empty
    }
  });
}

// Add domain to the whitelist
function addDomainToWhitelist() {
  const input = document.getElementById("whitelistInput");
  const domain = input.value.trim();

  if (domain) {
    chrome.storage.local.get("whitelistDomains", (result) => {
      const whitelist = result.whitelistDomains || [];
      if (!whitelist.includes(domain)) {
        whitelist.push(domain);
        chrome.storage.local.set(
          { whitelistDomains: whitelist },
          displayWhitelist
        );
      }
    });
  }
  input.value = "";
}

// Remove domain from the whitelist
function removeDomainFromWhitelist(domain) {
  chrome.storage.local.get("whitelistDomains", (result) => {
    const whitelist = result.whitelistDomains || [];
    const updatedWhitelist = whitelist.filter((item) => item !== domain);
    chrome.storage.local.set(
      { whitelistDomains: updatedWhitelist },
      displayWhitelist
    );
  });
}

// Display the reverse close list with a remove button and show/hide the list container based on content
function displayReverseCloseList() {
  chrome.storage.local.get("reverseCloseDomains", (result) => {
    const reverseCloseDiv = document.getElementById("reverseCloseDomains");

    // Check if there are domains in the reverse close list
    if (result.reverseCloseDomains && result.reverseCloseDomains.length > 0) {
      reverseCloseDiv.style.display = "block"; // Show the div when there are items
      reverseCloseDiv.innerHTML = ""; // Clear previous content

      result.reverseCloseDomains.forEach((domain) => {
        const domainElement = document.createElement("div");
        domainElement.className = "reverse-close-item";

        const domainText = document.createElement("span");
        domainText.textContent = domain;

        const removeBtn = document.createElement("span");
        removeBtn.className = "remove-btn";
        removeBtn.textContent = "✖";
        removeBtn.addEventListener("click", () =>
          removeDomainFromReverseClose(domain)
        );

        domainElement.appendChild(domainText);
        domainElement.appendChild(removeBtn);
        reverseCloseDiv.appendChild(domainElement);
      });
    } else {
      reverseCloseDiv.style.display = "none"; // Hide if list is empty
    }
  });
}

// Add domain to the reverse close list
function addDomainToReverseClose() {
  const input = document.getElementById("reverseCloseInput");
  const domain = input.value.trim();

  if (domain) {
    chrome.storage.local.get("reverseCloseDomains", (result) => {
      const reverseCloseList = result.reverseCloseDomains || [];
      if (!reverseCloseList.includes(domain)) {
        reverseCloseList.push(domain);
        chrome.storage.local.set(
          { reverseCloseDomains: reverseCloseList },
          displayReverseCloseList
        );
      }
    });
  }
  input.value = "";
}

// Remove domain from the reverse close list
function removeDomainFromReverseClose(domain) {
  chrome.storage.local.get("reverseCloseDomains", (result) => {
    const reverseCloseList = result.reverseCloseDomains || [];
    const updatedList = reverseCloseList.filter((item) => item !== domain);
    chrome.storage.local.set(
      { reverseCloseDomains: updatedList },
      displayReverseCloseList
    );
  });
}

// Clear all entries from closed tabs, whitelist, and reverse close lists
function clearAllBlockedLists() {
  chrome.storage.local.clear(() => {
    displayClosedTabData(); // Refresh closed tab data
    displayWhitelist(); // Refresh whitelist display
    displayReverseCloseList(); // Refresh reverse close list display
  });
}

// Save the state of the Reverse Close checkbox
function saveReverseCloseState() {
  const isChecked = document.getElementById("reverseCloseCheckbox").checked;
  chrome.storage.local.set({ reverseCloseEnabled: isChecked });
}

// Restore the state of the Reverse Close checkbox on load
function restoreReverseCloseState() {
  chrome.storage.local.get("reverseCloseEnabled", (result) => {
    const isChecked = result.reverseCloseEnabled || false;
    document.getElementById("reverseCloseCheckbox").checked = isChecked;
    toggleReverseCloseInput();
  });
}

// Helper function to toggle the display of Reverse Close input fields
function toggleReverseCloseInput() {
  const isChecked = document.getElementById("reverseCloseCheckbox").checked;
  document.getElementById("reverseCloseInput").style.display = isChecked
    ? "block"
    : "none";
  document.getElementById("addReverseCloseBtn").style.display = isChecked
    ? "block"
    : "none";
}

// Initialize display and event listeners
document.addEventListener("DOMContentLoaded", () => {
  displayClosedTabData();
  displayWhitelist();
  displayReverseCloseList();
  restoreReverseCloseState(); // Restore the checkbox state on load

  document
    .getElementById("addWhitelistBtn")
    .addEventListener("click", addDomainToWhitelist);
  document
    .getElementById("addReverseCloseBtn")
    .addEventListener("click", addDomainToReverseClose);
  document
    .getElementById("reverseCloseCheckbox")
    .addEventListener("change", () => {
      toggleReverseCloseInput();
      saveReverseCloseState(); // Save the checkbox state when it changes
    });
  document
    .getElementById("clearAllBtn")
    .addEventListener("click", clearAllBlockedLists);
});
