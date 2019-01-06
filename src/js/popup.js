/* @flow */

import {METHOD_CAPTURE_WITH_EXTRAS} from './common';

// TODO template it in html too?
const BUTTON_ID = 'button_id';
const COMMENT_ID = 'comment_id';

function getComment(): HTMLInputElement {
    const comment = ((document.getElementById(COMMENT_ID) : any): HTMLInputElement);
    return comment;
}

function getButton(): HTMLElement {
    const button = ((document.getElementById(BUTTON_ID): any): HTMLElement);
    return button;
}

function submitComment () {
    const comment_text = getComment().value;
    // TODO focus
    chrome.runtime.sendMessage({
        'method': METHOD_CAPTURE_WITH_EXTRAS,
        'comment': comment_text,
    }, resp => {
        console.log("[popup] captured!");
    });
    window.close();
}

function setupPage () {
    const comment = getComment();
    comment.focus();
    // $FlowFixMe
    comment.addEventListener('keydown', e => {
	      if (e.ctrlKey && e.key === 'Enter') {
		        submitComment();
	      }
    });
    getButton().addEventListener('click', submitComment);
}

document.addEventListener('DOMContentLoaded', setupPage);
