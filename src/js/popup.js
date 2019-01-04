/* @flow */

import {CAPTURE_SELECTED_METHOD} from './common';

function captureSelected () {
    // TODO add command to run capture server as a hint??
    const url = "TODO FIXME";
    console.log(`[popup] capturing ${url}`);
    chrome.runtime.sendMessage({
        'method': CAPTURE_SELECTED_METHOD,
        'url': url,
    }, resp => {
        console.log("[popup] captured!");
    });
}

document.addEventListener('DOMContentLoaded', captureSelected);
