const hasDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches

// TODO this won't be typechecked though.. maybe need to make it TS aware only?
// or maybe fine to import browser here, just remove unused stuff to keep content script small?

// @ts-expect-error browser should be available in browser context
chrome.runtime.sendMessage({
    method: 'DARK_MODE',
    hasDarkMode: hasDarkMode,
})
