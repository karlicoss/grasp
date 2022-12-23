/* @flow */
import {showNotification, awrap} from './common';
import {getOptions} from './options';


export function chromePermissionsRequest(params: any): Promise<any> {
    return awrap(chrome.permissions.request, params);
}

export function chromePermissionsContains(params: any): Promise<any> {
    return awrap(chrome.permissions.contains, params);
}


function urlForPermissionsCheck(url: string): string {
    var u = new URL(url);

    u.port = '';
    // firefox doesn't like port numbers
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns#Invalid_match_patterns

    // also toString adds a trailing slash, otherwise Firefox is also confused
    return u.toString();
}

export function hasPermissions(endpoint: string): Promise<any> {
    const perms = {
        origins: [
            urlForPermissionsCheck(endpoint),
        ],
    };
    return chromePermissionsContains(perms);
}

export function ensurePermissions(endpoint: string): Promise<any> {
    const perms = {
        origins: [
            urlForPermissionsCheck(endpoint),
        ],
    };
    // shouldn't prompt if we already have the permission
    return chromePermissionsRequest(perms);
}

// just keeping the old one for the reference...

// TODO fuck. doesn't seem to work for Firefox at all...
// just getting  Error: "An unexpected error occurred" background.bundle.js
// seems like this bug https://bugzilla.mozilla.org/show_bug.cgi?id=1382953
function ensurePermissions_old(cb: () => void) { // eslint-disable-line no-unused-vars
    const back = chrome.extension.getBackgroundPage().console;

    getOptions().then(opts => {
        const endpoint = opts.endpoint;
        // that's capable of handling default (localhost), so shouldn't prompt
        const perms = {
            origins: [
                urlForPermissionsCheck(endpoint),
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
    }).catch(err => {
        // TODO eh, use generic defensify instead...
        console.error(err);
        showNotification(`ERROR: ${err}`);
    });
    // TODO improve message somehow???
}
