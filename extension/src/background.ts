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


import {COMMAND_CAPTURE_SIMPLE, METHOD_CAPTURE_WITH_EXTRAS, showNotification} from './common.js'
import {getOptions} from './options.js'
import type {Options} from './options.js'
import { hasPermissions } from './permissions.js'


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

    // Ugh. this is kinda idiotic.
    // We can't call ensurePermissions here, getting "permissions.request may only be called from a user input handler" error
    // even though it's called from the keyboard shortcut???
    // so the best we can do is try to check and at least show a more helful error
    // also relevant https://bugzilla.mozilla.org/show_bug.cgi?id=1811608

    const has = await hasPermissions(endpoint)
    if (!has) {
        // kinda awkward to open options page here etc, but fine for now
        browser.tabs.create({url: 'options.html'})
        throw new Error(`${endpoint}: no permissions detected!\nApprove the endpoint in extension settings, and repeat capture after that.`)
    }

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
        throw new Error(`${endpoint} unavailable, check if server is running: ${(err as Error).toString()}`)
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


async function capture(comment: string | null = null, tag_str: string | null = null): Promise<boolean> {
    /**
     * Returns whether capture has succeeded
     */
    const tabs = await browser.tabs.query({currentWindow: true, active: true})
    const tab = tabs[0]
    if (tab.url == null) {
        // todo when does this happen?
        showNotification('ERROR: trying to capture null')
        return false
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
        return true
    } catch (err) {
        console.error(err)
        // todo make sure we catch errors from then clause too?
        const error_message = `ERROR: ${(err as Error).toString()}`
        console.error(error_message)
        showNotification(error_message, 1)  // todo crap, doesn't really seem to respect urgency...
        return false
    }
}


browser.commands.onCommand.addListener((command: string) => {
    if (command === COMMAND_CAPTURE_SIMPLE) {
        // not checking return value here, can't really do much?
        capture(null, null)  // todo await?
    }
})


// ok so sadly it seems like async listener doesn't really work in chrome due to a bug
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage#sending_an_asynchronous_response_using_a_promise
// also see https://stackoverflow.com/questions/44056271/chrome-runtime-onmessage-response-with-async-await
browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (_arg: any) => void) => {
    if (message.method === 'logging') {
        console.error("[%s] %o", message.source, message.data)
    }
    if (message.method === METHOD_CAPTURE_WITH_EXTRAS) {
        const comment = message.comment
        const tag_str = message.tag_str

        // NOTE: calling async directly doesn't work here in firefox
        // (getting "Could not establish connection. Receiving end does not exist" error)
        // I guess has something to do with micro (async) vs macro (setTimeout) tasks
        // although if anything I'd expect macro tasks to work worse :shrug:
        setTimeout(async () => {
            // this will be handled in the popup
            const success = await capture(comment, tag_str)
            sendResponse({success: success})
        })
        return true  // means 'async response'
    }
    if (message.method == 'DARK_MODE') {
        const icon_path = message.hasDarkMode ? 'img/unicorn_dark.png' : 'img/unicorn.png'

        // manifest v2 doesn't have browser.action
        const action = browser.action ? browser.action : browser.browserAction
        action.setIcon({path: icon_path})
    }
})
