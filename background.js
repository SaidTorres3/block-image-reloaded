// Polyfill for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Initialize 'on' state in storage
browserAPI.storage.local.get({ on: '1' }, function (result) {
	updateIcon(result.on);
	updateRulesAndCSS(result.on);
});

// Function to update icon based on 'on' state
function updateIcon(onState) {
	const iconPath = onState === '1' ? "images/icon19.png" : "images/icon19-disabled.png";
	browserAPI.action.setIcon({ path: iconPath });
}

// Toggle 'on' state when icon is clicked
browserAPI.action.onClicked.addListener(function () {
	browserAPI.storage.local.get({ on: '1' }, function (result) {
		const newState = result.on === '1' ? '0' : '1';
		browserAPI.storage.local.set({ on: newState }, function () {
			updateIcon(newState);
			updateRulesAndCSS(newState);
			// Reload the current active tab to apply changes
			browserAPI.tabs.query({ active: true, currentWindow: true }, function (tabs) {
				if (tabs[0]) {
					browserAPI.tabs.reload(tabs[0].id);
				}
			});
		});
	});
});

// Function to update rules and remove CSS based on 'on' state
function updateRulesAndCSS(onState) {
	if (onState === '1') {
		browserAPI.declarativeNetRequest.updateDynamicRules({
			addRules: [
				{
					id: 1,
					priority: 1,
					action: { type: "block" },
					condition: {
						urlFilter: "|http",
						resourceTypes: ["image"],
						excludedInitiatorDomains: [
							"recaptcha.net",
							"www.google.com",
							"google.com",
							"gstatic.com",
							"cloudflare.com",
							"captcha.com",
							"hcaptcha.com",
							"cfassets.io"
						]
					}
				}
			],
			removeRuleIds: []
		});
	} else {
		browserAPI.declarativeNetRequest.updateDynamicRules({
			addRules: [],
			removeRuleIds: [1]
		});
	}
}

// Inject or remove CSS based on 'on' state on tab update
browserAPI.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	browserAPI.storage.local.get({ on: '1' }, function (result) {
		const isFirefox = typeof browser !== 'undefined';
		const protectedSchemes = isFirefox 
			? ["chrome://", "about:", "moz-extension://"]
			: ["chrome://", "chrome-extension://"];
		
		const isProtectedUrl = protectedSchemes.some(scheme => tab.url && tab.url.startsWith(scheme));
		
		if (result.on === '1' && tab.url && !isProtectedUrl) {
			browserAPI.scripting.insertCSS({
				target: { tabId: tabId },
				css: "img { visibility: hidden; }"
			}).catch((error) => {
				console.warn("Failed to inject CSS:", error);
			});
		} else {
			browserAPI.scripting.removeCSS({
				target: { tabId: tabId },
				css: "img { visibility: hidden; }"
			}).catch((error) => {
				console.warn("Failed to remove CSS:", error);
			});
		}
	});
});
