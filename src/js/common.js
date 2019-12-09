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

export function chromePermissionsRequest(params: any) {
    return awrap(chrome.permissions.request, params);
}

export function chromePermissionsContains(params: any) {
    return awrap(chrome.permissions.contains, params);
}

// TODO ugh. use promises already...
// TODO fuck. doesn't seem to work for Firefox at all...
// just getting  Error: "An unexpected error occurred" background.bundle.js
// seems like this bug https://bugzilla.mozilla.org/show_bug.cgi?id=1382953
export function ensurePermissions(cb: () => void) {
    const needs_check = false; // TODO FIXME
    if (!needs_check) {
        cb();
        return;
    }

    const back = chrome.extension.getBackgroundPage().console;
    function onResponse(response) {
        const err = chrome.runtime.lastError;
        console.error("ERROR!", err);
        if (response) {
            back.info("Permission was granted");
            cb();
        } else {
            showNotification(`ERROR: Permission was refused`);
        }
    }
    const perms = {
        // TODO FIXME only if it's not localhost?
        origins: ["https://*/capture"],
    };
    // TODO improve message somehow???
    chrome.permissions.request(perms, onResponse);
    // browser.permissions.request(perms).then(onResponse, error => {
    //     back.error("ERROR!!!!", error);
    // });
}
