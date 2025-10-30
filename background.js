// Polyfill for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const isFirefox = typeof browser !== 'undefined';

// Context menu ID
const CONTEXT_MENU_ID = 'toggle-block-images';

// Initialize 'on' state in storage
browserAPI.storage.local.get({ on: '1' }, async function (result) {
	updateIcon(result.on);
	await updateRulesAndCSS(result.on);
	createContextMenu(result.on);
});

// Function to create/update context menu
function createContextMenu(onState) {
	browserAPI.contextMenus.remove(CONTEXT_MENU_ID, function() {
		// Ignore errors if menu doesn't exist yet
		if (browserAPI.runtime.lastError) {
			// Menu doesn't exist, which is fine
		}
		
		// Create the context menu with the appropriate title
		const title = onState === '1' 
			? browserAPI.i18n.getMessage('context_menu_unblock')
			: browserAPI.i18n.getMessage('context_menu_block');
		
		browserAPI.contextMenus.create({
			id: CONTEXT_MENU_ID,
			title: title,
			contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
		});
	});
}

// Listen for context menu clicks
browserAPI.contextMenus.onClicked.addListener(function(info, tab) {
	if (info.menuItemId === CONTEXT_MENU_ID) {
		// Toggle the state
		browserAPI.storage.local.get({ on: '1' }, async function (result) {
			const newState = result.on === '1' ? '0' : '1';
			browserAPI.storage.local.set({ on: newState }, async function () {
				updateIcon(newState);
				await updateRulesAndCSS(newState);
				createContextMenu(newState);
				// Reload the tab where the context menu was clicked
				if (tab && tab.id) {
					browserAPI.tabs.reload(tab.id);
				}
			});
		});
	}
});

// Function to update icon based on 'on' state
function updateIcon(onState) {
	const iconPath = onState === '1' ? "images/icon19.png" : "images/icon19-disabled.png";
	browserAPI.action.setIcon({ path: iconPath });
}

// Toggle 'on' state when icon is clicked
browserAPI.action.onClicked.addListener(function () {
	browserAPI.storage.local.get({ on: '1' }, async function (result) {
		const newState = result.on === '1' ? '0' : '1';
		browserAPI.storage.local.set({ on: newState }, async function () {
			updateIcon(newState);
			await updateRulesAndCSS(newState);
			createContextMenu(newState);
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
async function updateRulesAndCSS(onState) {
	// Chrome uses declarativeNetRequest
	if (!isFirefox) {
		// Get existing dynamic rules
		const existingRules = await browserAPI.declarativeNetRequest.getDynamicRules();
		const ruleExists = existingRules.some(rule => rule.id === 1);
		
		if (onState === '1') {
			// If rule doesn't exist, add it. If it exists, do nothing (it's already blocking)
			if (!ruleExists) {
				await browserAPI.declarativeNetRequest.updateDynamicRules({
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
			}
		} else {
			// Remove the rule if it exists
			if (ruleExists) {
				await browserAPI.declarativeNetRequest.updateDynamicRules({
					addRules: [],
					removeRuleIds: [1]
				});
			}
		}
	}
}
