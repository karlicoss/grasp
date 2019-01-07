Build status: [![CircleCI](https://circleci.com/gh/karlicoss/grasp.svg?style=svg)](https://circleci.com/gh/karlicoss/grasp)

Grasp is an [extension for Chrome](https://chrome.google.com/webstore/detail/grasp-extension/ohhbcfjmnbmgkajljopdjcaokbpgbgfa) (Firefox support is in progress), which adds a button/keybinding to capture current page title and url,
possibly selected text, additional comments or tags and send it into your [Org Mode](https://orgmode.org/) file.

[See a short demo](https://www.youtube.com/watch?v=Z8Bk-IazdGo).

# Requirements
* `pip3 install --user hug` for [Hug](http://www.hug.rest/) HTTP server.

# Running
1. Install server counterpart as systemd service: `server/setup`.
2. Install chrome extension and configure hotkeys

That's it! Currently port `12212` is hardcoded, but it will be configurable.

# Motivation
Why use org-capture? Well, it's hard to explain, maybe some other time... However if you do know you want to use it instead/alongside your browser bookmarks, by default
you don't have much choice and have to copy everything manually. For an average Org Mode user it's a torture. 

For a while, I used [the only](https://github.com/sprig/org-capture-extension) Chrome extension for that (as for January 2019). However, it relies on setting up MIME
handler which is quite flaky for many people. What is more, capturing via org template requires always running emacs daemon, which might be too much for some people.
But the worst thing is if capturing fails, you have to way of knowing about it. After losing few days of captured stuff due to MIME handler mysteriously not working,
I got fed up and figured it's time to implement something more reliable. 

My approach still requires a running server, but it's a simple python script which simply appends a text entry to a text file. The backend always responds back and in case anything
fails, you get a notification.

Extra collateral benefit is that you can potentially add anything as a backend, e.g. you might be more of a Markdown or Todo.txt fan (let me know if you are interested in that!).

# Potentional improvements
* due to server counterpart, one could even run it elsewhere, not necessarily on localhost
* also see [todos](./TODO.org)

# Building extension
The most up-to-date instructions should be in [CI config](./.circleci/config.yml).

You're gonna need `npm` for building extension.

    npm install
    npm run build
    
After that you can find the extension in `build` directory and 'Load unpacked' if necessary. There is also Flow and Eslint set up.

# Permissions used
* `notifications` for showing error notification
* `activeTab` for requesting url, title and selected text
* `http://localhost/capture` for talking with backend

* `content_security_policy` needed for webpack.

# Credits
* Icon made by <a href="https://www.freepik.com/" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" 			    title="Flaticon">www.flaticon.com</a>, licensed by <a href="http://creativecommons.org/licenses/by/3.0/" 			    title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a>
* [Original Org Capture extension](https://github.com/sprig/org-capture-extension)
* [Boilerplate for Webpack Chrome extension](https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate))
