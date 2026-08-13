// Polyfill for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const isFirefox = typeof browser !== 'undefined';

// Rule IDs managed by the extension
const BLOCK_RULE_IMAGE_ID = 1;
const BLOCK_RULE_XHR_MEDIA_ID = 2;
const ALLOW_RULE_CAPTCHA_DOMAINS_ID = 10;
const ALLOW_RULE_CAPTCHA_PATHS_ID = 11;

const ALL_RULE_IDS = [
	BLOCK_RULE_IMAGE_ID,
	BLOCK_RULE_XHR_MEDIA_ID,
	ALLOW_RULE_CAPTCHA_DOMAINS_ID,
	ALLOW_RULE_CAPTCHA_PATHS_ID
];

function getBlockingRules() {
	return [
		// 1. Block standard image requests globally
		{
			id: BLOCK_RULE_IMAGE_ID,
			priority: 1,
			action: { type: "block" },
			condition: {
				urlFilter: "*",
				resourceTypes: ["image"]
			}
		},
		// 2. Block image extensions fetched via XHR/Fetch/Media/Other
		{
			id: BLOCK_RULE_XHR_MEDIA_ID,
			priority: 1,
			action: { type: "block" },
			condition: {
				regexFilter: "\\.(jpe?g|png|gif|webp|avif|bmp|ico|svg)($|\\?|#)",
				isUrlFilterCaseSensitive: false,
				resourceTypes: ["xmlhttprequest", "other", "media"]
			}
		},
		// 3. Higher-priority Allow rule for known CAPTCHA challenge domains
		{
			id: ALLOW_RULE_CAPTCHA_DOMAINS_ID,
			priority: 2,
			action: { type: "allow" },
			condition: {
				regexFilter: "^https?://([^/]+\\.)?(recaptcha\\.net|hcaptcha\\.com|challenges\\.cloudflare\\.com|arkoselabs\\.com|geetest\\.com)/.*",
				isUrlFilterCaseSensitive: false,
				resourceTypes: ["image", "xmlhttprequest", "other", "sub_frame"]
			}
		},
		// 4. Higher-priority Allow rule for captcha URL paths (e.g. google.com/recaptcha)
		{
			id: ALLOW_RULE_CAPTCHA_PATHS_ID,
			priority: 2,
			action: { type: "allow" },
			condition: {
				urlFilter: "*/recaptcha/*",
				isUrlFilterCaseSensitive: false,
				resourceTypes: ["image", "xmlhttprequest", "other"]
			}
		}
	];
}

// Initialize 'on' state in storage on load
browserAPI.storage.local.get({ on: '1' }, async function (result) {
	updateIcon(result.on);
	await updateRulesAndCSS(result.on);
});

// Ensure icon and rules are set on browser startup
browserAPI.runtime.onStartup.addListener(function() {
	browserAPI.storage.local.get({ on: '1' }, async function (result) {
		updateIcon(result.on);
		await updateRulesAndCSS(result.on);
	});
});

// Ensure icon and rules are set immediately when extension is installed or updated
browserAPI.runtime.onInstalled.addListener(function() {
	browserAPI.storage.local.get({ on: '1' }, async function (result) {
		updateIcon(result.on);
		await updateRulesAndCSS(result.on);
	});
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

// Function to update declarativeNetRequest rules based on 'on' state
async function updateRulesAndCSS(onState) {
	if (onState === '1') {
		await browserAPI.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: ALL_RULE_IDS,
			addRules: getBlockingRules()
		});
	} else {
		await browserAPI.declarativeNetRequest.updateDynamicRules({
			removeRuleIds: ALL_RULE_IDS,
			addRules: []
		});
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
