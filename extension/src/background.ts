// hmm this works if you declare type: module in manifest
// but it injects the script's contents statically?
// I assume this is only processed with webpack
// import * as browser from "./browser-polyfill"

// this works with v3 but NOT if type: module
// also unclear how to make it work with webpack??
// const manifestVersion = chrome.runtime.getManifest().manifest_version
// if (manifestVersion == 3) {
//     // for v3 it's provided via manifest
//     try {
//         /* eslint-disable no-undef */
//         importScripts('./browser-polyfill.js')
//     } catch (e) {
//         console.error(e)
//     }
// }


// this works for v2 both in chrome and firefox
// for v3
// - in chrome it works if type: module, but somehow NOT if we define chunks??
//   without type: module this isn't working
// - in firefox it just works :shrug:
//   but firefox foesn't allow type: module??
// could it be bug in chrome??
// import * as browser from "webextension-polyfill"


import browser from "webextension-polyfill"


import {COMMAND_CAPTURE_SIMPLE, METHOD_CAPTURE_WITH_EXTRAS, showNotification} from './common'
import {getOptions} from './options'
import type {Options} from './options'


type Params = {
    url: string
    title: string | null
    selection: string | null
    comment: string | null
    tag_str: string | null
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

    let response: Response
    try {
        response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: data,
        })
    } catch (err) {
        console.error(err)
        // fetch only throws when host is unavailable
        throw new Error(`${endpoint} unavailable, check if server is running`)
    }

    if (!response.ok) { // http error
        throw new Error(`${endpoint}: HTTP ${response.status} ${response.statusText}`)
    }

    const jres = await response.json()
    const path = jres.path
    console.log(`success: ${JSON.stringify(jres)}`)
    if (options.notification) {
        showNotification(`OK: captured to ${path}`)
    }
}


// TODO ugh. need defensive error handling on the very top...
async function capture(comment: string | null = null, tag_str: string | null = null) {
    const tabs = await browser.tabs.query({currentWindow: true, active: true})
    const tab = tabs[0]
    if (tab.url == null) {
        // todo await?
        showNotification('ERROR: trying to capture null')
        return
    }
    const url: string = tab.url
    const title: string | null = tab.title || null


    const payload = (selection: string | null) => {
        return {
            url: url,
            title: title,
            selection: selection,
            comment: comment,
            tag_str: tag_str,
        }
    }

    const opts = await getOptions()

    // @ts-expect-error
    const has_scripting = 'scripting' in chrome
    let selection
    if (has_scripting) {
        const tab_id = tab.id as number
        // TODO switch to polyfill and add flow types
        // scripting is already promise based so it should be oly change to types
        const results = await browser.scripting.executeScript({
            target: {tabId: tab_id},
            func: () => window.getSelection()!.toString()
        })
        const [res] = results // should only inject in one frame, so just one result
        selection = res.result
    } else {
        const selections = await browser.tabs.executeScript({
            code: "window.getSelection().toString();"
        })
        selection = selections == null ? null : selections[0]
    }

    try {
        await makeCaptureRequest(payload(selection), opts)
    } catch (err) {
        console.error(err)
        // todo make sure we catch errors from then clause too?
        const error_message = `ERROR: ${(err as Error).toString()}`
        console.error(error_message)
        showNotification(error_message, 1)
        // TODO crap, doesn't really seem to respect urgency...
    }
}


browser.commands.onCommand.addListener(command => {
    if (command === COMMAND_CAPTURE_SIMPLE) {
        // todo await
        capture(null, null)
    }
})


browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: () => void) => {
    if (message.method === 'logging') {
        console.error("[%s] %o", message.source, message.data)
    }
    if (message.method === METHOD_CAPTURE_WITH_EXTRAS) {
        const comment = message.comment
        const tag_str = message.tag_str
        // todo await
        capture(comment, tag_str)
        sendResponse()
    }
})

// TODO handle cannot access chrome:// url??

