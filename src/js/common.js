/* @flow */
import {getOptions} from './options';

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


// TODO fuck. doesn't seem to work for Firefox at all...
// just getting  Error: "An unexpected error occurred" background.bundle.js
// seems like this bug https://bugzilla.mozilla.org/show_bug.cgi?id=1382953
export function ensurePermissions(cb: () => void) {
    const back = chrome.extension.getBackgroundPage().console;

    getOptions().then(opts => {
        const endpoint = opts.endpoint;
        // that's capable of handling default (localhost), so shouldn't prompt
        const perms = {
            origins: [
                endpoint,
            ],
        };
        return chromePermissionsContains(perms).then(has => {
            if (has) {
                // no need to do anything
                return true;
            } else {
                return chromePermissionsRequest(perms);
            }
        });
    }).then(granted => {
        if (granted) {
            back.info("Permission was granted");
            cb();
        } else {
            const err = chrome.runtime.lastError;
            const msg = err ? String(err) : 'Permission was refused';
            showNotification(`ERROR: ${msg}`);
        }
    });
    // TODO improve message somehow???
}
