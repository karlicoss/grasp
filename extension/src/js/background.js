/* @flow */
// TODO do I really need to annotate all files with @flow??


import {COMMAND_CAPTURE_SIMPLE, METHOD_CAPTURE_WITH_EXTRAS, showNotification} from './common'
import {getOptions} from './options'
import type {Options} from './options'


type Params = {
    url: string,
    title: ?string,
    selection: ?string,
    comment: ?string,
    tag_str: ?string,
}


async function makeCaptureRequest(
    params: Params,
    options: Options,
) {
    if (params.tag_str == null) {
        params.tag_str = options.default_tags
    }

    const endpoint = options.endpoint

    const data = JSON.stringify(params)
    console.log(`capturing ${data} via ${endpoint}`)


    // TODO maybe handle catch first and then again?

    await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: data,
    }).catch((err: Error) => {
        // fetch only rejects when host is unavailable
        console.error(err)
        throw new Error(`${endpoint} unavailable, check if server is running`)
    }).then(async response => {
        if (!response.ok) { // http error
            throw new Error(`${endpoint}: HTTP ${response.status} ${response.statusText}`)
        }
        const jres = await response.json()
        const path = jres.path
        console.log(`success: ${jres}`);
        if (options.notification) {
            showNotification(`OK: captured to ${path}`);
        }
    }).catch((err: Error) => {
        console.error(err)
        // todo make sure we catch errors from then clause too?
        const error_message = `ERROR: ${err.toString()}`
        console.error(error_message);
        showNotification(error_message, 1);
        // TODO crap, doesn't really seem to respect urgency...
    })
}


// TODO ugh. need defensive error handling on the very top...
async function capture(comment: ?string = null, tag_str: ?string = null) {
    const tabs = await browser.tabs.query({currentWindow: true, active: true})
    const tab = tabs[0]
    if (tab.url == null) {
        // todo await?
        showNotification('ERROR: trying to capture null')
        return
    }
    const url: string = tab.url
    const title: ?string = tab.title


    const payload = (selection: ?string) => {
        return {
            url: url,
            title: title,
            selection: selection,
            comment: comment,
            tag_str: tag_str,
        }
    }

    const opts = await getOptions()

    const has_scripting = 'scripting' in chrome
    if (has_scripting) {
        // TODO switch to polyfill and add flow types
        // scripting is already promise based so it should be oly change to types
        // $FlowFixMe
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => window.getSelection().toString()
        }, results => {
            const [res] = results // should only inject in one frame, so just one result
            const selection = res.result
            makeCaptureRequest(payload(selection), opts)
        })
    } else {
        const selections = await browser.tabs.executeScript({
            code: "window.getSelection().toString();"
        })
        const selection = selections == null ? null : selections[0]
        await makeCaptureRequest(payload(selection), opts)
    }
}


chrome.commands.onCommand.addListener(command => {
    if (command === COMMAND_CAPTURE_SIMPLE) {
        // todo await
        capture(null, null)
    }
})


chrome.runtime.onMessage.addListener((message: any, sender: chrome$MessageSender, sendResponse) => {  // eslint-disable-line no-unused-vars
    if (message.method === 'logging') {
        console.error("[%s] %o", message.source, message.data)
    }
    if (message.method === METHOD_CAPTURE_WITH_EXTRAS) {
        const comment = message.comment;
        const tag_str = message.tag_str;
        // todo await
        capture(comment, tag_str)
    }
})

// TODO handle cannot access chrome:// url??

