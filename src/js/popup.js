/* @flow */

import {METHOD_CAPTURE_WITH_EXTRAS} from './common';

// TODO template it in html too?
const BUTTON_ID = 'button_id';
const COMMENT_ID = 'comment_id';
const TAGS_ID = 'tags_id';

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

function submitComment () {
    const comment_text = getComment().value;
    const tag_str = getTags().value;
    // TODO focus
    chrome.runtime.sendMessage({
        'method': METHOD_CAPTURE_WITH_EXTRAS,
        'comment': comment_text,
        'tag_str': tag_str,
    }, () => {
        console.log("[popup] captured!");
    });
    window.close();
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
}

document.addEventListener('DOMContentLoaded', setupPage);
