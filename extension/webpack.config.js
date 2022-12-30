const webpack = require('webpack'),
      path = require('path'),
      {CleanWebpackPlugin} = require('clean-webpack-plugin'),
      CopyWebpackPlugin = require('copy-webpack-plugin'),
      WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');

const T = {
    CHROME  : 'chrome',
    FIREFOX: 'firefox',
};


// TODO will be conditional on T.CHROME at some point
const v3 = false

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

const action_name = v3 ? 'action' : 'browser_action'

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


if (target === T.FIREFOX) {
    // chrome v2 doesn't support scripting api
    // code has a fallback just for that
    // need to get selected text
    permissions.push("scripting")
}


const content_security_policy = [
  "default-src 'self'",
  "connect-src " + endpoints('*:*').join(' '),

  // FFS, otherwise <style> directives on extension's pages not working??
  "style-src 'unsafe-inline'",
].join('; ')


const manifestExtra = {
    name: name,
    version: pkg.version,
    description: pkg.description,
    permissions: permissions,
    commands: commands,
    optional_permissions: optional_permissions,
    manifest_version: v3 ? 3 : 2,
    background: (v3 ? {
      service_worker: 'background.js',
      type: 'module',
    } : {
      scripts: [
        'webextension-polyfill.js',
        'background.js',
      ],
      persistent: false,
    }),
    content_security_policy: v3 ? {
      extension_pages: content_security_policy,
    } : content_security_policy,
}
manifestExtra[action_name] = action

if (v3) {
  manifestExtra['host_permissions'] = host_permissions
  manifestExtra['optional_host_permissions'] = optional_host_permissions
  manifestExtra.permissions.push("scripting")
} else {
  manifestExtra.permissions.push(...host_permissions)
  manifestExtra.optional_permissions.push(...optional_host_permissions)
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
    minimize: false,

    // split chunks is so vendors split out into separate js files
    // to prevent bloating individual source files
    // seems that at the moment we need to manually load the chunks in the corresponding
    // html files or manifest
    // split chunks doc recommend using webpack html plugin??
    splitChunks: {
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
    },
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
