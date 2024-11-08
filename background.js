// Initialize 'on' state in storage
chrome.storage.local.get({ on: '1' }, function (result) {
	updateIcon(result.on);
	updateRulesAndCSS(result.on);
});

// Function to update icon based on 'on' state
function updateIcon(onState) {
	const iconPath = onState === '1' ? "images/icon19.png" : "images/icon19-disabled.png";
	chrome.action.setIcon({ path: iconPath });
}

// Toggle 'on' state when icon is clicked
chrome.action.onClicked.addListener(function () {
	chrome.storage.local.get({ on: '1' }, function (result) {
		const newState = result.on === '1' ? '0' : '1';
		chrome.storage.local.set({ on: newState }, function () {
			updateIcon(newState);
			updateRulesAndCSS(newState);
			// Reload the current active tab to apply changes
			chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
				if (tabs[0]) {
					chrome.tabs.reload(tabs[0].id);
				}
			});
		});
	});
});

// Function to update rules and remove CSS based on 'on' state
function updateRulesAndCSS(onState) {
	if (onState === '1') {
		// Add rule to block images
		chrome.declarativeNetRequest.updateDynamicRules({
			addRules: [
				{
					id: 1,
					priority: 1,
					action: { type: "redirect", redirect: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" } },
					condition: {
						urlFilter: "*",
						resourceTypes: ["image", "media"]
					}
				}
			],
			removeRuleIds: []
		});
	} else {
		// Remove the rule to stop blocking images
		chrome.declarativeNetRequest.updateDynamicRules({
			addRules: [],
			removeRuleIds: [1]
		});
	}
}

// Inject or remove CSS based on 'on' state on tab update
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	chrome.storage.local.get({ on: '1' }, function (result) {
		if (result.on === '1' && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
			// Inject CSS to hide images
			chrome.scripting.insertCSS({
				target: { tabId: tabId },
				css: "img { visibility: hidden; }"
			}).catch((error) => {
				console.warn("Failed to inject CSS:", error);
			});
		} else {
			// Remove the injected CSS if the extension is off
			chrome.scripting.removeCSS({
				target: { tabId: tabId },
				css: "img { visibility: hidden; }"
			}).catch((error) => {
				console.warn("Failed to remove CSS:", error);
			});
		}
	});
});