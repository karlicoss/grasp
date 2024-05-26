import browser from "webextension-polyfill"

import {METHOD_CAPTURE_WITH_EXTRAS} from './common.js'
import {getOptions} from './options.js'

// TODO template it in html too?
const BUTTON_ID = 'button_id'
const COMMENT_ID = 'comment_id'
const TAGS_ID = 'tags_id'


/*
 *  normal popup logging is pretty annoying because chrome closes devtools when the popup is closed
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
function logbg(msg: any) {
    console.error('%o', msg)
    browser.runtime.sendMessage({
        method: 'logging',
        source: 'popup.js',
        data: msg,
    })
}


type State = {
    comment: string
    tag_str: string
}


function saveState(state: State | null) {
    window.localStorage.setItem('state', JSON.stringify(state))
}


function clearState() {
    saveState(null)
}


function loadState(): State | null {
    const sts =  window.localStorage.getItem('state') || null
    return sts === null ? null : JSON.parse(sts)
}


function getComment(): HTMLInputElement {
    return document.getElementById(COMMENT_ID) as HTMLInputElement
}


function getTags(): HTMLInputElement {
    return document.getElementById(TAGS_ID) as HTMLInputElement
}


function getButton(): HTMLElement {
    return document.getElementById(BUTTON_ID) as HTMLElement
}


function getUiState(): State {
    const comment_text = getComment().value
    const tag_str = getTags().value
    return {
        'comment': comment_text,
        'tag_str': tag_str,
    }
}


async function restoreState(state: State | null) {
    // @ts-expect-error
    window.justSubmitted = false
    if (state == null) {
        // comment just relies on default
        const opts = await getOptions()
        getTags().value = opts.default_tags
    } else {
        getComment().value = state.comment
        getTags().value    = state.tag_str
    }
}


async function submitCapture () {
    const state = getUiState()

    const message = {
        'method': METHOD_CAPTURE_WITH_EXTRAS,
        ...state,
    }

    const result = await browser.runtime.sendMessage(message)
    if (result.success) {
        // @ts-expect-error
        window.justSubmitted = true
        clearState()
        console.log("[popup] captured!")
    } else {
        // if capture wasn't successful, keep the state intact
    }
    window.close()
}


const ctrlEnterSubmit = (e: KeyboardEvent) => {
    // note: there is also e.metaKey which triggers on mac when cmd is pressed
    // but it doesn't seem to allow chords like cmd+Enter
    if ((e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
        submitCapture()
    }
}


// https://stackoverflow.com/a/6003829/706389
function moveCaretToEnd(el: HTMLInputElement) {
    if (typeof el.selectionStart == "number") {
        el.selectionStart = el.selectionEnd = el.value.length
    // @ts-expect-error
    } else if (typeof el.createTextRange != "undefined") {
        el.focus()
        // @ts-expect-error
        const range = el.createTextRange()
        range.collapse(false)
        range.select()
    }
}


function setupPage () {
    const comment = getComment()
    comment.focus()
    comment.addEventListener('keydown', ctrlEnterSubmit)

    const tags = getTags()
    tags.addEventListener('keydown', ctrlEnterSubmit)
    tags.addEventListener('focus', () => moveCaretToEnd(tags)) // to put cursor to the end of tags when tabbed

    getButton().addEventListener('click', submitCapture)

    const state = loadState()
    restoreState(state)
}


// hmm interesting that on chrome we can use visibilitychange for both
// on firefox dev edition however 'visible' doesn't fire, only 'hidden' :shrug:
document.addEventListener('DOMContentLoaded', setupPage)
window.addEventListener('visibilitychange', (_: Event) => {
    // event doesn't contain visibility status
    // docs recomment to use this instead of unload
    const visible = document.visibilityState === 'visible'
    if (!visible) {
        // if we just sent, no need to save anything
        // @ts-ignore
        if (!window.justSubmitted) {
            saveState(getUiState())
        }
    }
})
