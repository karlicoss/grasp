/* @flow */
import {get_options, set_options} from './options';

const SAVE_ID = 'save_id';
const PORT_ID = 'port_id';
const NOTIFICATION_ID = 'notification_id';
const DEFAULT_TAGS_ID = 'default_tags_id';
// TODO specify capture path here?

function getPort(): HTMLInputElement {
    return ((document.getElementById(PORT_ID): any): HTMLInputElement);
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
        getPort().value = opts.port;
        getDefaultTags().value = opts.default_tags;
        getEnableNotification().checked = opts.notification;
    });
}

function saveOptions() {
    const opts = {
        port: getPort().value, // TODO validate??
        default_tags: getDefaultTags().value,
        notification: getEnableNotification().checked,
    };
    set_options(opts, () => { console.log('fewf'); alert('Saved!'); });
}


document.addEventListener('DOMContentLoaded', restoreOptions);
getSaveButton().addEventListener('click', saveOptions);
