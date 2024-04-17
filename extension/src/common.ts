import browser from "webextension-polyfill"

// NOTE: keep consistent with webpack.config.js
export const COMMAND_CAPTURE_SIMPLE = 'capture-simple'

export const METHOD_CAPTURE_WITH_EXTRAS = 'captureWithExtras'

export function showNotification(text: string, priority: number=0) {
    browser.notifications.create({
        'type': "basic",
        'title': "grasp",
        'message': text,
        'priority': priority,
        'iconUrl': 'img/unicorn.png',
    })
}
