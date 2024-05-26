import assert from 'assert'

import pkg from './package.json' with { type: "json" }

const T = {
    CHROME : 'chrome',
    FIREFOX: 'firefox',
}


// ugh. declarative formats are shit.
export function generateManifest({
    target,  // str
    version, // str
    release,     // bool
    ext_id   // str
} = {}) {
    assert(target)
    assert(version)
    assert(release !== null)
    assert(ext_id)

    const v3 = version == '3'

    // Firefox wouldn't let you rebind its default shortcuts most of which use Shift
    // On the other hand, Chrome wouldn't let you use Alt
    const modifier = target === T.CHROME ? 'Shift' : 'Alt'

    const action_name = v3 ? 'action' : 'browser_action'

    const commands = {
        "capture-simple": {
            "description": "Quick capture: url, title and selection",
            "suggested_key": {
                "default": `Ctrl+${modifier}+H`,
                "mac":  `Command+${modifier}+H`,
            },
        },
    }

    commands[`_execute_${action_name}`] = {
        "description": "Capture page, with extra information",
        "suggested_key": {
            "default": `Ctrl+${modifier}+Y`,
            "mac":  `Command+${modifier}+Y`,
        },
    }


    const action = {
        "default_icon": "img/unicorn.png",
        "default_popup": "popup.html",
        "default_title": "Capture page, with extra information",
    }


    const endpoints = (domain) => [
        "http://"  + domain + "/capture",
        "https://" + domain + "/capture",
    ]


    // prepare for manifest v3
    const host_permissions = endpoints('localhost')
    const optional_host_permissions = endpoints('*')


    // TODO make permissions literate
    const permissions = [
        // for keeping extension settings
        "storage",

        // for showing notification about successful capture or errors
        "notifications",

        // need to query active tab and get its url/title
        "activeTab",
    ]


    const optional_permissions = []

    if (target === T.FIREFOX || v3) {
        // chrome v2 doesn't support scripting api
        // code has a fallback just for that
        // (needed to get selected text)
        permissions.push("scripting")
    }


    const content_security_policy = [
        "script-src 'self'",  // this must be specified when overriding, otherwise it complains
        /// also this works, but it seems that default-src somehow shadows style-src???
        // "default-src 'self'",
        // "style-src 'unsafe-inline'", // FFS, otherwise <style> directives on extension's pages not working??
        ///

        // also need to override it to eclude 'upgrade-insecure-requests' in manifest v3?
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy#upgrade_insecure_network_requests_in_manifest_v3
        // NOTE: could be connect-src http: https: to allow all?
        // but we're specifically allowing endpoints that have /capture in them
        "connect-src " + endpoints('*:*').join(' '),
    ].join('; ')


    const background = {}
    if (v3) {
        if (target === T.CHROME) {
            // webext lint will warn about this since it's not supported in firefox yet
            background['service_worker'] = 'background.js'

            // this isn't supported in chrome manifest v3 (chrome warns about unsupported field)
            // but without it webext lint fails
            background['scripts'] = ['background.js']
        } else {
            background['scripts'] = ['background.js']
        }
    } else {
        background['scripts'] = ['background.js']
        background['persistent'] = false
    }
    background['type'] = 'module'  // hmm seems like it works in firefox v2 too now??

    const manifest = {
        name: pkg.name + (release ? '' : ' [dev]'),
        version: pkg.version,
        description: pkg.description,
        permissions: permissions,
        commands: commands,
        optional_permissions: optional_permissions,
        manifest_version: v3 ? 3 : 2,
        background: background,
        icons: {
            '128': 'img/unicorn.png'
        },
        options_ui: {
            page: 'options.html',
            open_in_tab: true,
        },
    }
    manifest[action_name] = action

    if (target === T.FIREFOX) {
        // NOTE: chrome v3 works without content_security_policy??
        // but in firefox it refuses to make a request even when we allow hostname permission??
        manifest.content_security_policy = (v3 ? {extension_pages: content_security_policy} : content_security_policy)
    }

    manifest.content_scripts = [
        {
            "matches": ["<all_urls>"],
            "js": ["detect_dark_mode.js"],
        },
    ]

    if (v3) {
        if (target === T.FIREFOX) {
            // firefox doesn't support optional_host_permissions yet
            // see https://bugzilla.mozilla.org/show_bug.cgi?id=1766026
            // and https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_permissions#host_permissions
            // note that these will still have to be granted by user (unlike in chrome)
            manifest.host_permissions = host_permissions
            manifest.optional_permissions.push(...optional_host_permissions)
        } else {
            manifest.host_permissions = host_permissions
            manifest.optional_host_permissions = optional_host_permissions
        }
    } else {
        manifest.permissions.push(...host_permissions)
        manifest.optional_permissions.push(...optional_host_permissions)
    }

    if (target === T.FIREFOX || v3) {
        // for firefox, this is required during publishing?
        // this isn't really required in chrome, but without it, webext lint fails for chrome addon
        const gecko_id = target === T.FIREFOX ? ext_id : '{00000000-0000-0000-0000-000000000000}'
        manifest['browser_specific_settings'] = {
            'gecko': {
                'id': gecko_id,
            },
        }
    }
    return manifest
}
