/**
 * Hides the usual cookie and consent banners, so a picture shows the page and not the banner
 * over it. Only in our browser; the site itself is not changed. A plain module (no server-only
 * import), so the gallery capture script in scripts/ can use it too.
 */
export const HIDE_BANNERS = `
#CybotCookiebotDialog, #usercentrics-root, #onetrust-consent-sdk, #cmplz-cookiebanner-container,
.cky-consent-container, .cc-window, .cookie-notice-container, #cookie-notice, #BorlabsCookieBox,
[id*="cookie" i][role="dialog"], [class*="cookie-banner" i], [class*="cookiebanner" i],
[id*="cookie-banner" i], [id*="consent-banner" i], [class*="consent-banner" i],
#lanyard_root, .ketch-fixed {
  display: none !important;
}
html, body { overflow: auto !important; }
`;
