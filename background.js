// Polyfill for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const isFirefox = typeof browser !== 'undefined';

// Initialize 'on' state in storage
browserAPI.storage.local.get({ on: '1' }, async function (result) {
	updateIcon(result.on);
	await updateRulesAndCSS(result.on);
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
async function updateRulesAndCSS(onState) {
	// Both Chrome and Firefox use declarativeNetRequest
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

// ========== Context Menu Feature (Desktop only) ==========
// This code runs independently and won't affect the main functionality
setTimeout(function() {
	try {
		if (browserAPI.contextMenus) {
			const CONTEXT_MENU_ID = 'toggle-block-images';
			
			// Get initial state to set correct title
			browserAPI.storage.local.get({ on: '1' }, function (result) {
				const title = result.on === '1' 
					? browserAPI.i18n.getMessage('context_menu_unblock')
					: browserAPI.i18n.getMessage('context_menu_block');
				
				// Create context menu with correct title from the start
				browserAPI.contextMenus.create({
					id: CONTEXT_MENU_ID,
					title: title,
					contexts: ['all']
				}, function() {
					if (browserAPI.runtime.lastError) {
						console.log('Context menu creation failed:', browserAPI.runtime.lastError);
					} else {
						console.log('Context menu created successfully');
					}
				});
			});
			
			// Listen for storage changes to update menu
			browserAPI.storage.onChanged.addListener(function(changes, namespace) {
				if (namespace === 'local' && changes.on && browserAPI.contextMenus) {
					const title = changes.on.newValue === '1' 
						? browserAPI.i18n.getMessage('context_menu_unblock')
						: browserAPI.i18n.getMessage('context_menu_block');
					
					browserAPI.contextMenus.update(CONTEXT_MENU_ID, { title: title }, function() {
						if (browserAPI.runtime.lastError) {
							// Ignore errors
						}
					});
				}
			});
			
			// Handle context menu clicks
			browserAPI.contextMenus.onClicked.addListener(function(info, tab) {
				if (info.menuItemId === CONTEXT_MENU_ID) {
					browserAPI.storage.local.get({ on: '1' }, async function (result) {
						const newState = result.on === '1' ? '0' : '1';
						browserAPI.storage.local.set({ on: newState }, async function () {
							updateIcon(newState);
							await updateRulesAndCSS(newState);
							if (tab && tab.id) {
								browserAPI.tabs.reload(tab.id);
							}
						});
					});
				}
			});
		}
	} catch (e) {
		console.log('Context menu not available:', e);
	}
}, 100);
