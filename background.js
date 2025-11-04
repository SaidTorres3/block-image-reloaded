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
if (browserAPI.contextMenus) {
	const CONTEXT_MENU_ID = 'toggle-block-images';

	// Helper: get title for state ('1' = blocking enabled)
	function getTitleForState(onValue) {
		const v = String(onValue);
		return v === '1'
			? browserAPI.i18n.getMessage('context_menu_unblock')
			: browserAPI.i18n.getMessage('context_menu_block');
	}

	// Helper: try updating the context menu title, and create it if it doesn't exist.
	function setContextMenuTitle(onValue) {
		const title = getTitleForState(onValue);

		// Try to update first (works if item already exists)
		try {
			browserAPI.contextMenus.update(CONTEXT_MENU_ID, { title: title }, function() {
				if (browserAPI.runtime && browserAPI.runtime.lastError) {
					// If update failed because it doesn't exist (or any other error), try creating it.
					// Log the error for diagnostics but proceed to create.
					console.log('contextMenus.update failed:', browserAPI.runtime.lastError.message || browserAPI.runtime.lastError);
					browserAPI.contextMenus.create({
						id: CONTEXT_MENU_ID,
						title: title,
						contexts: ['all']
					}, function() {
						if (browserAPI.runtime && browserAPI.runtime.lastError) {
							console.log('contextMenus.create failed:', browserAPI.runtime.lastError.message || browserAPI.runtime.lastError);
						} else {
							console.log('Context menu created successfully');
						}
					});
				}
			});
		} catch (e) {
			// Defensive: if contextMenus.update throws synchronously, attempt to create
			console.log('contextMenus.update threw, creating menu. Error:', e && e.message ? e.message : e);
			try {
				browserAPI.contextMenus.create({
					id: CONTEXT_MENU_ID,
					title: title,
					contexts: ['all']
				}, function() {
					if (browserAPI.runtime && browserAPI.runtime.lastError) {
						console.log('contextMenus.create failed:', browserAPI.runtime.lastError.message || browserAPI.runtime.lastError);
					} else {
						console.log('Context menu created successfully');
					}
				});
			} catch (e2) {
				console.log('contextMenus.create threw:', e2 && e2.message ? e2.message : e2);
			}
		}
	}

	// Register the click handler FIRST (immediately, not in a callback)
	browserAPI.contextMenus.onClicked.addListener(async function(info, tab) {
		if (info.menuItemId === CONTEXT_MENU_ID) {
			const result = await new Promise(resolve => {
				browserAPI.storage.local.get({ on: '1' }, resolve);
			});
			const newState = result && String(result.on) === '1' ? '0' : '1';

			await new Promise(resolve => {
				browserAPI.storage.local.set({ on: newState }, resolve);
			});

			updateIcon(newState);
			await updateRulesAndCSS(newState);
			// Try to update the context menu title immediately
			setContextMenuTitle(newState);
			if (tab && tab.id) {
				browserAPI.tabs.reload(tab.id);
			}
		}
	});

	// Listen for storage changes to update menu (robust against service worker restarts)
	browserAPI.storage.onChanged.addListener(function(changes, namespace) {
		if (namespace === 'local' && changes.on && browserAPI.contextMenus) {
			setContextMenuTitle(changes.on.newValue);
		}
	});

	// Ensure the context menu exists with the right title on startup
	browserAPI.storage.local.get({ on: '1' }, function (result) {
		setContextMenuTitle(result && result.on ? result.on : '1');
	});
}
