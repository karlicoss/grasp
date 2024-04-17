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
  "default-src 'self'",
  "connect-src " + endpoints('*:*').join(' '),

  // FFS, otherwise <style> directives on extension's pages not working??
  "style-src 'unsafe-inline'",
].join('; ')


const background = {}

if (v3) {
  if (target === T.CHROME) {
    background['service_worker'] = 'background.js'
    // see header of background.js, this was for some experiments
    // NOTE: not working in firefox? just fails to load the manifest
    // background['type'] = 'module'
  } else {
    background['scripts'] = [
      'webextension-polyfill.js',
      'background.js',
    ]
  }
} else {
  background['scripts'] = [
    'webextension-polyfill.js',
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
    content_security_policy: v3 ? {
      extension_pages: content_security_policy,
    } : content_security_policy,
}
manifestExtra[action_name] = action

if (v3) {
  manifestExtra['host_permissions'] = host_permissions

  // FIXME not sure if firefox supports this??
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1766026
  manifestExtra['optional_host_permissions'] = optional_host_permissions
  if (target === T.FIREFOX) {
    manifestExtra['browser_specific_settings'] = {
      "gecko": {
        "id": ext_id,
      },
    }
  }
} else {
  manifestExtra.permissions.push(...host_permissions)
  manifestExtra.optional_permissions.push(...optional_host_permissions)
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

    // ugh. for some reason with chunks it's not working
    splitChunks: (v3 && target === T.CHROME) ? false : splitChunks,
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
