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
    TARGET : process.env.TARGET, // TODO assert not null?
    RELEASE: process.env.RELEASE,
    PUBLISH: process.env.PUBLISH,
};

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

const action_name = 'browser_action'

const commands = {
    "capture-simple": {
        "description": "Quick capture: url, title and selection",
        "suggested_key": {
            "default": `Ctrl+${modifier}+C`,
            "mac":  `Command+${modifier}+C`,
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
if (target == T.FIREFOX) {
     action['browser_style'] = true
}


// prepare for manifest v3
const host_permissions = [
    "http://localhost/capture",
    "https://localhost/capture",
]


const optional_permissions = [
    "http://*/capture",
    "https://*/capture",
]


// TODO make permissions literate
const permissions = [
    "storage",
    "notifications",

    // need to query active tab and get its url/title
    "activeTab",  

    ...host_permissions,
]

if (target === T.FIREFOX) {
    // chrome v2 doesn't support scripting api
    // code has a fallback just for that
    // need to get selected text
    permissions.push("scripting")
}


const manifestExtra = {
    name: name,
    version: pkg.version,
    description: pkg.description,
    permissions: permissions,
    commands: commands,
    optional_permissions: optional_permissions,
}
manifestExtra[action_name] = action


if (dev) {
    manifestExtra.content_security_policy = "script-src 'self' 'unsafe-eval'; object-src 'self'";
}

if (target === T.CHROME) {
    manifestExtra.options_ui = {chrome_style: true};
}
if (target === T.FIREFOX) {
    manifestExtra.options_ui = {browser_style: true};
}

const buildPath = path.join(__dirname, 'dist', target);

const options = {
  mode: dev ? 'development' : 'production', // TODO map directly from MODE env var?
  node: {
    // no idea what does it mean... https://github.com/webpack/webpack/issues/5627#issuecomment-394290231
    // but it does get rid of some Function() which webpacka apparently generates
    global: false,
  },
  entry: {
    background  : path.join(__dirname, "src", "js", "background"),
    popup       : path.join(__dirname, "src", "js", "popup"),
    options_page: path.join(__dirname, "src", "js", "options_page"),
  },
  output: {
      path: buildPath,
  },
  optimization: {
    // https://webpack.js.org/configuration/optimization
    // don't think minimize worth it for such a tiny extension
    minimize: false
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
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
  plugins: [
    new CleanWebpackPlugin(), // ok, respects symlinks

    // without copy pluging, webpack only bundles js/json files
    new CopyWebpackPlugin({
      patterns: [
        { context: 'src', from: '**/*.html' },
        { context: 'src', from: '**/*.png'  },
        { from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js'},
      ]
    }),
    new WebpackExtensionManifestPlugin({
        config: {
            base: baseManifest,
            extend: manifestExtra,
        }
    }),
  ]
};

// TODO https://webpack.js.org/configuration/devtool
if (dev) {
  // ??? don't remember what it was for, but webpack complains about it now
  // options.devtool = "cheap-module-eval-source-map";
}

module.exports = options;
