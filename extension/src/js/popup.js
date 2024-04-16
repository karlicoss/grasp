/* @flow */


import {METHOD_CAPTURE_WITH_EXTRAS} from './common'
import {getOptions} from './options'

// TODO template it in html too?
const BUTTON_ID = 'button_id';
const COMMENT_ID = 'comment_id';
const TAGS_ID = 'tags_id';


/*
 *  normal popup logging is pretty annoying because chrome closes devtools
 */
/* eslint-disable no-unused-vars */
function logbg(msg: any) {
    console.error('%o', msg)
    chrome.runtime.sendMessage({
        method: 'logging',
        source: 'popup.js',
        data: msg,
    })
}


type State = {|
    comment: string,
    tag_str: string,
|}


function saveState(state: ?State) {
    window.localStorage.setItem('state', JSON.stringify(state))
}


function clearState() {
    saveState(null)
}


function loadState(): ?State {
    const sts =  window.localStorage.getItem('state') || null
    return JSON.parse(sts)
}


function getComment(): HTMLInputElement {
    const comment = ((document.getElementById(COMMENT_ID): any): HTMLInputElement);
    return comment;
}


function getTags(): HTMLInputElement {
    const tags = ((document.getElementById(TAGS_ID): any): HTMLInputElement);
    return tags;
}


function getButton(): HTMLElement {
    const button = ((document.getElementById(BUTTON_ID): any): HTMLElement);
    return button;
}


function getUiState(): State {
    const comment_text = getComment().value;
    const tag_str = getTags().value;
    return {
        'comment': comment_text,
        'tag_str': tag_str,
    };
}


async function restoreState(state: ?State) {
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


function submitCapture () {
    const state = getUiState()

    // ugh, not sure what it doesn't like
    // tbh it's such a fucking mess with chrome flow annotations not receiving update anymore and manifest v3
    // $FlowFixMe
    chrome.runtime.sendMessage({
        'method': METHOD_CAPTURE_WITH_EXTRAS,
        ...state,
    }, () => {
        window.justSubmitted = true
        clearState()

        // TODO not sure about this?
        window.close()
        console.log("[popup] captured!");
    })

}


// todo not sure if can define const here??
var ctrlEnterSubmit: KeyboardEventListener = (e) => {
    // note: there is also e.metaKey which triggers on mac when cmd is pressed
    // but it doesn't seem to allow chords like cmd+Enter
    if ((e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
        submitCapture()
    }
}


// https://stackoverflow.com/a/6003829/706389
function moveCaretToEnd(el: HTMLInputElement) {
    if (typeof el.selectionStart == "number") {
        el.selectionStart = el.selectionEnd = el.value.length;
    // $FlowFixMe https://github.com/facebook/flow/issues/8705
    } else if (typeof el.createTextRange != "undefined") {
        el.focus();
        var range = el.createTextRange();
        range.collapse(false);
        range.select();
    }
}


function setupPage () {
    const comment = getComment();
    comment.focus();
    comment.addEventListener('keydown', ctrlEnterSubmit);

    const tags = getTags();
    tags.addEventListener('keydown', ctrlEnterSubmit);
    tags.addEventListener('focus', () => moveCaretToEnd(tags)); // to put cursor to the end of tags when tabbed

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
        if (!window.justSubmitted) {
            saveState(getUiState())
        }
    }
})
