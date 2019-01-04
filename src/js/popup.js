/* @flow */

import {CAPTURE_SELECTED_METHOD} from './common';

function captureSelected () {
    // TODO add command to run capture server as a hint??
    console.log('[popup] capturing!');
    chrome.runtime.sendMessage({
        'method': CAPTURE_SELECTED_METHOD,
    }, resp => {
        console.log("[popup] captured!");
    });
}

document.addEventListener('DOMContentLoaded', captureSelected);
