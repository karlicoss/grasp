/* @flow */
// TODO do I really need to annotate all files with @flow??

import {CAPTURE_SELECTED_METHOD, showNotification} from './common';
import {capture_url} from './config';

function makeCaptureRequest(
    url: string,
    selection: ?string=null,
    comment: ?string=null,
    // TODO anything alse??
) {
    const data = JSON.stringify({
        'url': url,
        'selection': selection,
        'comment': comment,
    });


    var request = new XMLHttpRequest();
    console.log(`[background] capturing ${data}`);

    request.open('POST', capture_url(), true);
    request.onreadystatechange = () => {
        if (request.readyState != 4) {
            return;
        }
        console.log('[background] status:', request.status);
        if (request.status >= 200 && request.status < 400) { // success
            var response = JSON.parse(request.response);
            console.log(`[background] success: ${response}`);
            showNotification(`OK: ${response}`);
        } else {
            // TODO more error context?
            console.log(`[background] ERROR: ${request.status}`);
            showNotification(`ERROR: ${request.status}`, 1);
            // TODO crap, doesn't really seem to respect urgency...
        }
    };

    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.send(data);
}

chrome.runtime.onMessage.addListener((message: any, sender: chrome$MessageSender, sendResponse) => {
    if (message.method === CAPTURE_SELECTED_METHOD) {
        makeCaptureRequest(message.url);
    }
});
