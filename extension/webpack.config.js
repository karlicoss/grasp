const webpack = require('webpack'),
      path = require('path'),
      {CleanWebpackPlugin} = require('clean-webpack-plugin'),
      CopyWebpackPlugin = require('copy-webpack-plugin'),
      WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');

const T = {
    CHROME  : 'chrome',
    FIREFOX: 'firefox',
};


const env = {
  TARGET : process.env.TARGET,
  RELEASE: process.env.RELEASE,
  PUBLISH: process.env.PUBLISH,
  MANIFEST: process.env.MANIFEST,
}

// TODO will be conditional on T.CHROME at some point
const v3 = process.env.MANIFEST === '3'

const ext_id = process.env.EXT_ID

const pkg = require('./package.json');
const baseManifest = require('./src/manifest.json');

const release = env.RELEASE == 'YES' ? true : false;
const publish = env.PUBLISH == 'YES' ? true : false;
const dev = !release; // meh. maybe make up my mind?
const target = env.TARGET;

const name = "grasp" + (dev ? ' [dev]' : '');


// ugh. declarative formats are shit.

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
    }
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
    "storage",
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
    background['service_worker'] = 'background.js'
    background['scripts'] = [
      'background.js',
    ]
    // see header of background.js, this was for some experiments
    // NOTE: not working in firefox? just fails to load the manifest
    // background['type'] = 'module'
  } else {
    background['scripts'] = [
      'background.js',
    ]
  }
} else {
  background['scripts'] = [
    'background.js',
  ]
  background['persistent'] = false
}


const manifestExtra = {
    name: name,
    version: pkg.version,
    description: pkg.description,
    permissions: permissions,
    commands: commands,
    optional_permissions: optional_permissions,
    manifest_version: v3 ? 3 : 2,
    background: background,
}

if (target === T.FIREFOX) {
    // NOTE: chrome v3 works without content_security_policy??
    // but in firefox it refuses to make a request even when we allow hostname permission??
  manifestExtra.content_security_policy = (v3 ? {extension_pages: content_security_policy} : content_security_policy)
}


manifestExtra[action_name] = action
manifestExtra.content_scripts = [
  {
    "matches": ["<all_urls>"],
    "js": ["detect_dark_mode.js"],
  },
]

if (v3) {
  if (target === T.FIREFOX) {
    // firefox doesn't support optional host permissions
    // note that these will still have to be granted by user (unlike in chrome)
    manifestExtra['host_permissions'] = [...host_permissions, ...optional_host_permissions]
  } else {
    manifestExtra['host_permissions'] = host_permissions
    manifestExtra['optional_host_permissions'] = optional_host_permissions
  }
} else {
  manifestExtra.permissions.push(...host_permissions)
  manifestExtra.optional_permissions.push(...optional_host_permissions)
}

if (v3) {
  // this isn't really required in chrome, but without it, webext lint fails for chrome addon
  const gecko_id = target === T.FIREFOX ? ext_id : "{00000000-0000-0000-0000-000000000000}"
  manifestExtra['browser_specific_settings'] = {
    "gecko": {
      "id": gecko_id,
    },
  }
}


const buildPath = path.join(__dirname, 'dist', target);


const splitChunks = {
  // seems necessary, otherwise doesn't split out polyfill??
  chunks: 'all',
  cacheGroups: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name(module) {
        const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
        return packageName
      },
      // create chunk regardless size etc
      enforce: true,
    },
  },
}


const options = {
  mode: dev ? 'development' : 'production', // TODO map directly from MODE env var?
  node: {
    // no idea what does it mean... https://github.com/webpack/webpack/issues/5627#issuecomment-394290231
    // but it does get rid of some Function() which webpacka apparently generates
    global: false,
  },
  entry: {
    background  : path.join(__dirname, "src", "background.ts"),
    popup       : path.join(__dirname, "src", "popup.ts"),
    options_page: path.join(__dirname, "src", "options_page.ts"),
    detect_dark_mode: path.join(__dirname, "src", "detect_dark_mode.ts"),
  },
  output: {
      path: buildPath,
  },
  optimization: {
    // https://webpack.js.org/configuration/optimization
    // don't think minimize worth it for such a tiny extension
    minimize: false,

    // ugh. for some reason with chunks it's not working
    // splitChunks: (v3 && target === T.CHROME) ? false : splitChunks,
    splitChunks: false,
    // split chunks is so vendors split out into separate js files
    // to prevent bloating individual source files
    // seems that at the moment we need to manually load the chunks in the corresponding
    // html files or manifest
    // split chunks doc recommend using webpack html plugin??
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      // not sure if I really need css/html loader it since I'm not using any special features.. but whatever
      {
        test: /\.css$/,
        use: 'style-loader!css-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    // this is necessary to import .ts files
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CleanWebpackPlugin(), // ok, respects symlinks

    // without copy pluging, webpack only bundles js/json files
    new CopyWebpackPlugin({
      patterns: [
        { context: 'src', from: '**/*.html' },
        { context: 'src', from: '**/*.png'  },
      ]
    }),
    new WebpackExtensionManifestPlugin({
        config: {
            base: baseManifest,
            extend: manifestExtra,
        }
    }),
  ],
  // docs claim it's the slowest but pretty fast anyway
  devtool: 'source-map',
}


module.exports = options;
