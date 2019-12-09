/* @flow */

import {METHOD_CAPTURE_WITH_EXTRAS, ensurePermissions} from './common';
import {get_options} from './options';

// TODO template it in html too?
const BUTTON_ID = 'button_id';
const COMMENT_ID = 'comment_id';
const TAGS_ID = 'tags_id';


type State = {
    comment: string,
    tag_str: string,
};


function save_state(state: ?State) {
    window.localStorage.setItem('state', JSON.stringify(state));
}

function load_state(): ?State {
    const sts =  window.localStorage.getItem('state') || null;
    return JSON.parse(sts);
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

function getState(): State {
    const comment_text = getComment().value;
    const tag_str = getTags().value;
    return {
        'comment': comment_text,
        'tag_str': tag_str,
    };
}

function restoreState(state: ?State) {
    if (state == null) {
        // comment just relies on default
        get_options(opts => {getTags().value = opts.default_tags;});
    } else {
        getComment().value = state.comment;
        getTags().value    = state.tag_str;
    }
}

function submitComment () {
    // TODO focus
    const state = getState();

    ensurePermissions(() => {
        chrome.runtime.sendMessage({
            'method': METHOD_CAPTURE_WITH_EXTRAS,
            ...state,
        }, () => {
            console.log("[popup] captured!");
        });
        window.submitted = true;
        window.close();
    });
}

// $FlowFixMe
function ctrlEnterSubmit(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        submitComment();
    }
}


// https://stackoverflow.com/a/6003829/706389
function moveCaretToEnd(el) {
    if (typeof el.selectionStart == "number") {
        el.selectionStart = el.selectionEnd = el.value.length;
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

    getButton().addEventListener('click', submitComment);

    window.submitted = false;

    const state = load_state();
    restoreState(state);
    save_state(null); // clean
}

document.addEventListener('DOMContentLoaded', setupPage);


window.addEventListener('unload', () => {
    if (!window.submitted) {
        save_state(getState());
    }
}, true);
