// Inject CSS immediately to hide images while they're being blocked
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Check if blocking is enabled
browserAPI.storage.local.get({ on: '1' }, function (result) {
	if (result.on === '1') {
		// Inject style immediately
		const style = document.createElement('style');
		style.id = 'block-image-style';
		style.textContent = 'img { display: none !important; }';
		(document.head || document.documentElement).appendChild(style);
	}
});
