Build status: [![CircleCI](https://circleci.com/gh/karlicoss/grasp.svg?style=svg)](https://circleci.com/gh/karlicoss/grasp)

Grasp is a browser extension [Chrome](https://chrome.google.com/webstore/detail/org-grasp/ohhbcfjmnbmgkajljopdjcaokbpgbgfa) and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/grasp), which adds a button/keybinding to capture current page title and url,
possibly selected text, additional comments or tags and adds it into your [Org Mode](https://orgmode.org/) file.

[Screenshot](https://user-images.githubusercontent.com/291333/51799721-a984eb80-221c-11e9-9612-8eb7f553dc01.png), [short demo](https://www.youtube.com/watch?v=Z8Bk-IazdGo).

Install from Chrome store:

* [localhost only version](https://chrome.google.com/webstore/detail/org-grasp/ohhbcfjmnbmgkajljopdjcaokbpgbgfa)
* [any host version](https://chrome.google.com/webstore/detail/org-grasp-any-host/gcfhlnaalomahoampfjhinmgjikkkgep) (the only difference are permissions in manifest)

Install from addons.mozilla.org:

* [localhost only version](https://addons.mozilla.org/en-US/firefox/addon/org-grasp-for-org-capture/)

Install from a zip: [releases](https://github.com/karlicoss/grasp/releases).

# Running
In the simplest setup, the server runs locally, and you can use 'localhost' version of the extension. If you have to work on a computer where you can't run python scripts,
or your target capture file is just not there, you can selfhost the server part elsewhere and use the 'any host' version. Don't forget to set the endpoint in extension settings!

1. Install server counterpart as systemd service (to autostart it): `server/setup --path /path/to/your/capture.org [--port <custom port>] [--template <custom org-capture template>]`.

    Or alternatively, just run it directly if you don't want to autostart it: `server/grasp_server.py --path /path/to/your/capture.org [--port <custom_port>] [--template <custom org-capture template>]`.
2. Install chrome extension and configure hotkeys

That's it! If you're using custom port make sure it's same as in the extension settings (default is `12212`).

# Motivation
Why use org-capture? Well, it's hard to explain, maybe some other time... However if you do know you want to use it instead/alongside your browser bookmarks, by default
you don't have much choice and have to copy everything manually. For an experienced enough Org Mode user it's a torture. 

For a while, I used [the only](https://github.com/sprig/org-capture-extension) Chrome extension for that (as for January 2019). However, it relies on setting up MIME
handler which is quite flaky for many people (me included). What is more, capturing via org template requires always running emacs daemon, which might be too much for some people.
But the worst thing is if capturing fails, you have to way of knowing about it. After losing few days of captured stuff due to MIME handler mysteriously not working,
I got fed up and figured it's time to implement something more reliable. 

My approach still requires a running server, but it's a simple python script which simply appends a text entry to a text file. The backend always responds back and in case anything
fails, you get a notification.
There is a collateral benefit though is that you can potentially use anything as a backend and storage file, e.g. you might be more of a Markdown or Todo.txt fan (let me know if you are interested in that!).

Main feature of this extension is that you can also add a comment and tags to the information you are capturing.

The only downside so far is that it's not as well integrated with emacs as its builtin capture templates. E.g. currently you can't point at a specific header in org file, it would just append at the end.
However, if that's a stopper for you, please let me know, I could come up with something!

# Requirements
No third party dependencies! Just `python3`.


# Potentional improvements
* see [todos](./TODO.org)

# Permissions used
* `storage` for settings
* `notifications` for showing error notification
* `activeTab` for requesting url, title and selected text
* `http://localhost/capture` for talking with backend
* `content_security_policy` needed for webpack

# Building extension
The most up-to-date instructions should be in [CI config](./.circleci/config.yml).

You're gonna need `npm` for building extension.

    npm install
    npm run build
    
After that you can find the extension in `build` directory and 'Load unpacked** if necessary. There is also Flow and Eslint set up.

## building any host version
If you do need unresticted url permissions, build the extensions like that: `ANY_HOST=yes npm run build`.

## building for Firefox
Default target is Chrome. use `TARGET=firefox npm run build` to build for firefox. The code is actually same, the only differences are minor appearance adjustments in manifest.

# Credits
* Icon made by <a href="https://www.freepik.com/" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" 			    title="Flaticon">www.flaticon.com</a>, licensed by <a href="http://creativecommons.org/licenses/by/3.0/" 			    title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a>
* [Original Org Capture extension](https://github.com/sprig/org-capture-extension)
* [Boilerplate for Webpack Chrome extension](https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate)
