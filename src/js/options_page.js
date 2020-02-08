/* @flow */
import {get_options, set_options} from './options';
import {ensurePermissions} from './permissions';

const ENDPOINT_ID = 'endpoint_id';
const NOTIFICATION_ID = 'notification_id';
const DEFAULT_TAGS_ID = 'default_tags_id';
// TODO specify capture path here?

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

function restoreOptions() {
    get_options(opts => {
        getEndpoint().value = opts.endpoint;
        getDefaultTags().value = opts.default_tags;
        getEnableNotification().checked = opts.notification;
    });
}

function saveOptions() {
    // TODO could also check for permissions and display message?

    const endpoint = getEndpoint().value;
    ensurePermissions(endpoint);

    const opts = {
        endpoint: endpoint,
        default_tags: getDefaultTags().value,
        notification: getEnableNotification().checked,
    };
    set_options(opts, () => { alert('Saved!'); });
}


document.addEventListener('DOMContentLoaded', restoreOptions);
getSaveButton().addEventListener('click', saveOptions);
