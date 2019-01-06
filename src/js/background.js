/* @flow */
// TODO do I really need to annotate all files with @flow??

import {COMMAND_CAPTURE_SIMPLE, METHOD_CAPTURE_WITH_EXTRAS, showNotification} from './common';
import {defaultTagStr, capture_url} from './options';

type Params = {
    url: string,
    title: ?string,
    selection: ?string,
    comment: ?string,
    tag_str: ?string,
}


function makeCaptureRequest(
    params: Params,
) {
    const data = JSON.stringify(params);
    console.log(`[background] capturing ${data}`);

    var request = new XMLHttpRequest();
    request.open('POST', capture_url(), true);
    request.onreadystatechange = () => {
        if (request.readyState != 4) {
            return;
        }
        console.log('[background] status:', request.status);
        if (request.status >= 200 && request.status < 400) { // success
            var response = JSON.parse(request.responseText);
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

function capture(comment: ?string = null, tag_str: ?string = null) {
    chrome.tabs.query({currentWindow: true, active: true }, tabs => {
        const tab = tabs[0];
        if (tab.url == null) {
            showNotification('ERROR: trying to capture null');
            return;
        }
        if (tag_str === null) {
            tag_str = defaultTagStr();
        }

        const url: string = tab.url;
        const title: ?string = tab.title;

        // console.log('action!');
        // ugh.. https://stackoverflow.com/a/19165930/706389
        chrome.tabs.executeScript( {
            code: "window.getSelection().toString();"
        }, selections => {
            const selection = selections == null ? null : selections[0];
            makeCaptureRequest({
                url: url,
                title: title,
                selection: selection,
                comment: comment,
                tag_str: tag_str,
            });
        });
    });
}


chrome.commands.onCommand.addListener(command => {
    if (command === COMMAND_CAPTURE_SIMPLE) {
        capture(null, null);
    }
});

chrome.runtime.onMessage.addListener((message: any, sender: chrome$MessageSender, sendResponse) => {
    if (message.method === METHOD_CAPTURE_WITH_EXTRAS) {
        const comment = message.comment;
        const tag_str = message.tag_str;
        capture(comment, tag_str);
    }
});

// TODO handle cannot access chrome:// url??
