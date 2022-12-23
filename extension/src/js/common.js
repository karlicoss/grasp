/* @flow */
export const COMMAND_CAPTURE_SIMPLE = 'capture-simple';

export const METHOD_CAPTURE_WITH_EXTRAS = 'captureWithExtras';

export function showNotification(text: string, priority: number=0) {
    chrome.notifications.create({
        'type': "basic",
        'title': "grasp",
        'message': text,
        'priority': priority,
        'iconUrl': 'unicorn.png',
    });
}

// $FlowFixMe
export function awrap(fn, ...args: Array<any>): Promise<any> {
    return new Promise((resolve, reject) => {
        // $FlowFixMe
        const cbb = (...xxx) => {
            const err = chrome.runtime.lastError;
            if (err) {
                reject(err);
            }
            resolve(...xxx);
        };
        // ugh. can't pass proper typed args down to chrome interfaces?
        // $FlowFixMe
        fn(...args, cbb);
    });
}
