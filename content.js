// Inject CSS immediately to hide images while they're being blocked
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Check if blocking is enabled
browserAPI.storage.local.get({ on: '1' }, function (result) {
	if (result && result.on === '1') {
		// Do not inject in CAPTCHA frames or challenge endpoints
		const isCaptcha = /recaptcha|hcaptcha|challenges\.cloudflare\.com|arkoselabs|geetest/i.test(window.location.href);
		if (isCaptcha) {
			return;
		}

		// Inject style immediately
		const style = document.createElement('style');
		style.id = 'block-image-style';
		style.textContent = `
			img:not([src*="recaptcha"]):not([src*="hcaptcha"]):not([src*="challenges.cloudflare.com"]),
			picture,
			video[poster] {
				display: none !important;
			}
		`;
		(document.head || document.documentElement).appendChild(style);
	}
});
