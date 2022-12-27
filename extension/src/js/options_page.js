/* @flow */
import {getOptions, setOptions} from './options'
import {ensurePermissions, hasPermissions} from './permissions'


const ENDPOINT_ID       = 'endpoint_id';
const HAS_PERMISSION_ID = 'has_permission_id';
const NOTIFICATION_ID   = 'notification_id';
const DEFAULT_TAGS_ID   = 'default_tags_id';
const SAVE_ID = 'save_id';


function getEndpoint(): HTMLInputElement {
    return ((document.getElementById(ENDPOINT_ID): any): HTMLInputElement);
}

function getDefaultTags(): HTMLInputElement {
    return ((document.getElementById(DEFAULT_TAGS_ID): any): HTMLInputElement);
    //  TODO if empty, return null?
}

function getEnableNotification(): HTMLInputElement {
    return ((document.getElementById(NOTIFICATION_ID): any): HTMLInputElement);
}

function getSaveButton(): HTMLInputElement {
    return ((document.getElementById(SAVE_ID): any): HTMLInputElement);
}

function getHasPermission(): HTMLElement {
    return ((document.getElementById(HAS_PERMISSION_ID): any): HTMLElement);
}


// ugh. needs a better name..
async function refreshPermissionValidation(endpoint: string) {
    const has = await hasPermissions(endpoint)
    const pstyle = getHasPermission().style
    if (has) {
        console.debug('Got permisssions, nothing to worry about.')
        pstyle.display = 'none'
        return
    }
    console.debug('Whoops, no permissions to access %s', endpoint)
    // TODO maybe just show button? but then it would need to be reactive..
    pstyle.display = 'block'
}


async function restoreOptions() {
    getSaveButton().addEventListener('click', saveOptions)

    const opts = await getOptions()
    getEndpoint().value = opts.endpoint
    getDefaultTags().value = opts.default_tags
    getEnableNotification().checked = opts.notification
    await refreshPermissionValidation(opts.endpoint)
}


async function saveOptions() {
    // TODO could also check for permissions and display message?

    const endpoint = getEndpoint().value
    await ensurePermissions(endpoint)
    refreshPermissionValidation(endpoint)

    const opts = {
        endpoint: endpoint,
        default_tags: getDefaultTags().value,
        notification: getEnableNotification().checked,
    }
    await setOptions(opts)

    // hmm seems that regular alert() doesn't work in chrome anymore
    chrome.extension.getBackgroundPage().alert('Saved!')
}


document.addEventListener('DOMContentLoaded', restoreOptions)
