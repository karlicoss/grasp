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

    if (url == null) {
        showNotification('ERROR: trying to capture null');
        return;
    }

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

            var explain = "";
            if (request.status === 0) {
                explain = `Unavaiable: ${capture_url()}`;
            }
            showNotification(`ERROR: ${request.status}: ${explain}`, 1);
            // TODO crap, doesn't really seem to respect urgency...
        }
    };
    request.onerror = () => {
        console.log(request);
    };

    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.send(data);
}


// TODO mm. not sure if should do browserAction.onclicked instead?? I suppose it's more flexible??
// TODO hmm. content script or js??
// chrome.runtime.onMessage.addListener((message: any, sender: chrome$MessageSender, sendResponse) => {
//     if (message.method === CAPTURE_SELECTED_METHOD) {
//     }
// });

// TODO handle cannot access chrome:// url??
// TODO ok, need to add comment popup?
chrome.browserAction.onClicked.addListener(tab => {
    const url = tab.url;

    // console.log('action!');
    // ugh.. https://stackoverflow.com/a/19165930/706389
    chrome.tabs.executeScript( {
        code: "window.getSelection().toString();"
    }, selections => {
        const selection = selections == null ? null : selections[0];
        makeCaptureRequest(
            url,
            selection
        );
    });
});
