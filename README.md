Grasp is a browser extension for [Chrome](https://chrome.google.com/webstore/detail/org-grasp/ohhbcfjmnbmgkajljopdjcaokbpgbgfa) and [Firefox](https://addons.mozilla.org/en-US/firefox/addon/grasp), which adds a button/keybinding to capture current page title and url,
possibly selected text, additional comments or tags and adds it into your [Org Mode](https://orgmode.org/) file.

[Screenshot](https://user-images.githubusercontent.com/291333/51799721-a984eb80-221c-11e9-9612-8eb7f553dc01.png), [short demo](https://www.youtube.com/watch?v=Z8Bk-IazdGo).

- [Chrome](https://chrome.google.com/webstore/detail/org-grasp/ohhbcfjmnbmgkajljopdjcaokbpgbgfa)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/grasp)
- or, install from a zip: [releases](https://github.com/karlicoss/grasp/releases).

# Running
In the simplest setup, the server runs locally, and you can use 'localhost' version of the extension. If you have to work on a computer where you can't run python scripts,
or your target capture file is just not there, you can selfhost the server part elsewhere. Don't forget to set the endpoint in extension settings!

## Setup
- install `grasp_backend` package: `pip3 install --user grasp-backend`
- install systemd/launchd service to autorun grasp
  
  `python3 -m grasp_backend setup --path /path/to/your/capture.org [--port <custom port>] [--template <custom org-capture template>]`
  
  Or alternatively, just run it directly if you don't want to autostart `python3 -m grasp_backend serve --path /path/to/your/capture.org [--port <custom port>] [--template <custom org-capture template>]`

- install chrome extension and configure hotkeys

That's it! If you're using custom port make sure it's the same as in the extension settings (default is `12212`).

## Configuration

[Here](https://github.com/karlicoss/grasp/blob/af24c991579986cec73695daa8318e7831049305/server/org_tools.py#L91-L109) you can find some references for the `--template` syntax.

If you are looking for more flexible formatting that's not supported by template syntax, see [config.py.example](misc/config.py.example).
You can modify it to your liking and pass as `--config` to `grasp_backend setup` command.

# Motivation
Why use org-capture? Well, it's hard to explain, maybe some other time... However, if you do know you want to use it instead of/alongside your browser bookmarks, by default
you don't have much choice and have to copy everything manually. For an experienced enough org-mode user it's no less than a torture. 

This tool:

- \+ shows a notification when capturing fails/succeeds, so you won't lose your notes
- \+ doesn't require always running Emacs, simply appends an org-mode text entry to a file
- \+ can capture things that org-protocol can't handle (e.g. extra comment or tags)
- \+ can potentially use any plaintext format as a storage.

     E.g. you might be more of a Markdown or Todo.txt fan (let me know if you are interested in that!).
- \- doesn't talk to Emacs, so can't benefit from Emacs capture templates
    
     E.g. currently you can't point at a specific header in an org file, it would just append at the end.

- \- requires running a small HTTP server
     
     However, there are no dependencies apart from python3, so in many ways, it's even more portable than Emacs.

Comparison with similar tools:

## [org-capture-extension](https://github.com/sprig/org-capture-extension)

- \- relies on [org-protocol](https://orgmode.org/worg/org-contrib/org-protocol.html) and MIME handler: flaky for many people and has no feedback whether capture failed or succeeded
     
     Losing few days of captured stuff due to MIME handler mysteriously not working was the main motivator for me to develop grasp.

- \- requires always running Emacs, which might not be the case for some people
- \+ relies on org-protocol, so can potentially be better integrated with Emacs and your org-mode files

## [org-protocol-capture-html](https://github.com/alphapapa/org-protocol-capture-html)

Same pros/cons as `org-capture-extension` as it's relying on org-protocol.

In addition:

- \+ using a bookmarklet, hence browser-agnostic
- \+ capable of on the fly HTML to org-mode markup conversion

# Potential improvements
* see [todos](./TODO.org)

# Permissions used
* `http://localhost/capture` for talking with the backend
  
   If you want to use an external URL as an endpoint, you will be prompted for a permission dynamically.
  
* `storage` for settings
* `notifications` for showing notification
* `activeTab` for requesting page info

# Building & developing
The most up-to-date instructions should be in [CI config](./.circleci/config.yml).

You need `npm` for building the extension.

    npm install
    ./build --target <browser> # e.g. ./build --target chrome or ./build --target firefox
    
After that you can find the extension in `dist` directory and 'Load unpacked** if necessary. There is also Flow and Eslint set up.

## testing and linting
Check [CI config](./.github/workflows/main.yml) to figure out all the checks I'm doing.

There are some end2end tests which check both web extension and the browser, but require GUI, so they can't run on github actions. You can run them manually though.

- `pytest -s --pyargs tests.test_end2end`

## publishing

- run `./publish` to generate extension zip files

- firefox: `./build --firefox --release --lint --sign`

  After than, upload the signed `xpi` file on [AMO](https://addons.mozilla.org/en-GB/developers/addon/grasp/versions)
  
- chrome:  `./build --chrome  --release --lint`

  After that, upload the zip (generated by publish script) on [Web store](https://chrome.google.com/webstore/developer/dashboard)

# Credits
* Icon made by <a href="https://www.freepik.com/" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" 			    title="Flaticon">www.flaticon.com</a>, licensed by <a href="http://creativecommons.org/licenses/by/3.0/" 			    title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a>
* [Original Org Capture extension](https://github.com/sprig/org-capture-extension)
* [Boilerplate for Webpack Chrome extension](https://github.com/samuelsimoes/chrome-extension-webpack-boilerplate)
