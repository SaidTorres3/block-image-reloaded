// Polyfill for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const isFirefox = typeof browser !== 'undefined';

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

// Firefox uses webRequest API for better blocking performance
if (isFirefox) {
	let blockingEnabled = false;

	browserAPI.storage.local.get({ on: '1' }, function (result) {
		blockingEnabled = result.on === '1';
		console.log("Firefox: Initial blocking state:", blockingEnabled);
	});

	browserAPI.storage.onChanged.addListener(function (changes, namespace) {
		if (namespace === 'local' && changes.on) {
			blockingEnabled = changes.on.newValue === '1';
			console.log("Firefox: Blocking state changed to:", blockingEnabled);
		}
	});

	browserAPI.webRequest.onBeforeRequest.addListener(
		function (details) {
			console.log("Firefox: Image request detected:", details.url, "Blocking:", blockingEnabled);
			if (blockingEnabled) {
				return { cancel: true };
			}
			return { cancel: false };
		},
		{ urls: ["<all_urls>"], types: ["image"] },
		["blocking"]
	);
}

// Function to update rules and remove CSS based on 'on' state
function updateRulesAndCSS(onState) {
	// Chrome uses declarativeNetRequest
	if (!isFirefox) {
		if (onState === '1') {
			browserAPI.declarativeNetRequest.updateDynamicRules({
				addRules: [
					{
						id: 1,
						priority: 1,
						action: { type: "block" },
						condition: {
							urlFilter: "*",
							resourceTypes: ["image"]
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
}
