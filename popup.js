const storage =
  typeof browser !== "undefined" ? browser.storage.local : chrome.storage.local;

document.addEventListener("DOMContentLoaded", () => {
  const enableExtensionCheckbox = document.getElementById("enable-extension");
  const enableTextSpan = document.getElementById("enable-text"); // Access the span that will change text
  const domainInput = document.getElementById("domain-input");
  const addDomainButton = document.getElementById("add-domain");
  const domainsContainer = document.getElementById("domains");
  const countInfo = document.getElementById("count-info");
  const clearDataButton = document.getElementById("clear-data");
  const closedDomainsContainer = document.getElementById("closed-domains"); // Container to show closed domain counts

  // Initially hide the domains container and closed domains container
  domainsContainer.style.display = "none";
  closedDomainsContainer.style.display = "none";

  storage.get(
    ["isEnabled", "domains", "closeCount", "closedDomains"],
    (data) => {
      enableExtensionCheckbox.checked = data.isEnabled || false;
      const domains = data.domains || [];
      const closeCount = data.closeCount || 0;
      const closedDomains = data.closedDomains || {};

      updateDomainList(domains);
      updateClosedDomainsList(closedDomains);
      countInfo.textContent = `Total Closed Tabs: ${closeCount}`;

      // Update button text based on checkbox status
      updateButtonText(enableExtensionCheckbox.checked);
    },
  );

  enableExtensionCheckbox.addEventListener("change", () => {
    storage.set({ isEnabled: enableExtensionCheckbox.checked });
    updateButtonText(enableExtensionCheckbox.checked); // Update button text dynamically
  });

  // Function to update the button text based on whether the extension is enabled
  function updateButtonText(isChecked) {
    if (isChecked) {
      enableTextSpan.textContent = "Disable"; // Text when checked
    } else {
      enableTextSpan.textContent = "Enable"; // Text when unchecked
    }
  }

  // Make the span clickable as well (toggle checkbox when span clicked)
  enableTextSpan.addEventListener("click", () => {
    enableExtensionCheckbox.checked = !enableExtensionCheckbox.checked;
    enableExtensionCheckbox.dispatchEvent(new Event("change")); // Trigger change event to update storage and button text
  });

  // Add domain button functionality
  addDomainButton.addEventListener("click", () => {
    const newDomain = extractDomain(domainInput.value.trim());
    if (!newDomain) return;

    storage.get("domains", (data) => {
      const domains = data.domains || [];
      if (!domains.includes(newDomain)) {
        domains.push(newDomain);
        storage.set({ domains });
        updateDomainList(domains);
      }
    });

    domainInput.value = "";
  });

  // Add event listener for "Enter" key to add domain
  domainInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // Check if the pressed key is Enter
      addDomainButton.click(); // Trigger the "click" event of the "Add" button
    }
  });

  // Function to extract only the domain part from a full URL
  function extractDomain(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname; // Return only the hostname (e.g., www.example.com)
    } catch (e) {
      console.error("Invalid URL", e);
      return ""; // If URL is invalid, return empty string
    }
  }

  clearDataButton.addEventListener("click", () => {
    storage.set({ domains: [], closeCount: 0, closedDomains: {} }, () => {
      updateDomainList([]);
      updateClosedDomainsList({});
      countInfo.textContent = `Closed Tabs Count: 0`;
    });
  });

  function updateDomainList(domains) {
    // Show the domains container only if there are domains
    if (domains.length > 0) {
      domainsContainer.style.display = "block";
    } else {
      domainsContainer.style.display = "none";
    }

    domainsContainer.innerHTML = "";
    domains.forEach((domain) => {
      const domainItem = document.createElement("div");
      domainItem.style.display = "flex";
      domainItem.style.alignItems = "center";
      domainItem.style.width = "100%";

      domainItem.className = "domain-item";
      const domainName = document.createElement("span");
      domainName.textContent = domain;
      domainItem.appendChild(domainName);

      const removeButton = document.createElement("button");
      removeButton.style.marginRight = "10px";
      removeButton.textContent = "x"; // Change text to X
      removeButton.style.color = "red"; // White text
      removeButton.style.cursor = "pointer"; // Pointer cursor on hover
      removeButton.style.fontSize = "20px"; // Pointer cursor on hover
      removeButton.style.background = "transparent"; // Pointer cursor on hover
      removeButton.style.padding = "0"; // Pointer cursor on hover

      removeButton.onclick = () => {
        storage.get("domains", (data) => {
          const updatedDomains = data.domains.filter((d) => d !== domain);
          storage.set({ domains: updatedDomains });
          updateDomainList(updatedDomains);
        });
      };

      domainItem.appendChild(removeButton);
      domainsContainer.appendChild(domainItem);
    });
  }

  function updateClosedDomainsList(closedDomains) {
    // Show the closed domains container only if there are closed domains
    if (Object.keys(closedDomains).length > 0) {
      closedDomainsContainer.style.display = "block";
    } else {
      closedDomainsContainer.style.display = "none";
    }

    closedDomainsContainer.innerHTML = "";

    for (let domain in closedDomains) {
      const domainItem = document.createElement("div");
      domainItem.className = "domain-item";

      // Create a container for the domain name and the count
      const domainTextContainer = document.createElement("div");
      domainTextContainer.style.display = "flex";
      domainTextContainer.style.alignItems = "center";
      domainTextContainer.style.width = "100%";

      // Create the domain name element
      const domainName = document.createElement("span");
      domainName.textContent = domain;
      domainTextContainer.appendChild(domainName);

      // Create the "x" count element
      const countText = document.createElement("span");
      countText.textContent = `x${closedDomains[domain]}`;
      countText.style.color = "green";
      countText.style.fontSize = "12px";
      countText.style.fontWeight = "bold";
      countText.style.paddingLeft = "10px";
      domainTextContainer.appendChild(countText);

      // Append the domain text container to the domain item
      domainItem.appendChild(domainTextContainer);

      // Create the remove button
      const removeButton = document.createElement("button");
      removeButton.style.marginRight = "10px";
      removeButton.textContent = "x"; // Button text
      removeButton.style.color = "red"; // Button text color
      removeButton.style.cursor = "pointer"; // Pointer cursor on hover
      removeButton.style.fontSize = "20px"; // Font size for button
      removeButton.style.background = "transparent"; // Transparent background
      removeButton.style.padding = "0"; // No padding for button

      // Remove the domain from the storage when the button is clicked
      removeButton.onclick = () => {
        storage.get("closedDomains", (data) => {
          const updatedClosedDomains = { ...data.closedDomains };
          delete updatedClosedDomains[domain];
          storage.set({ closedDomains: updatedClosedDomains });
          updateClosedDomainsList(updatedClosedDomains);
        });
      };

      // Append the remove button to the domain item
      domainItem.appendChild(removeButton);

      // Append the domain item to the container
      closedDomainsContainer.appendChild(domainItem);
    }
  }
});
