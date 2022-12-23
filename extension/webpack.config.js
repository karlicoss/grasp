const webpack = require('webpack'),
      path = require('path'),
      CleanWebpackPlugin = require('clean-webpack-plugin'),
      CopyWebpackPlugin = require('copy-webpack-plugin'),
      WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');
// TODO remove plugins from package.json

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

// Firefox wouldn't let you rebind its default shortcuts most of which use Shift
// On the other hand, Chrome wouldn't let you use Alt
const modifier = target === T.CHROME ? 'Shift' : 'Alt';

// ugh. declarative formats are shit.
const commandsExtra = {
    "capture-simple": {
        "suggested_key": {
            "default": `Ctrl+${modifier}+C`,
            "mac":  `Command+${modifier}+C`
        }
    },
    "_execute_browser_action": {
        "suggested_key": {
            "default": `Ctrl+${modifier}+Y`,
            "mac":  `Command+${modifier}+Y`
        }
    },
};

// TODO make permissions literate
const permissions = [
    "storage",
    "notifications",
    "activeTab",
    "http://localhost/capture",
    "https://localhost/capture"
];


const manifestExtra = {
    name: name,
    version: pkg.version,
    description: pkg.description,
    permissions: permissions,
    commands: commandsExtra,
    optional_permissions: [
        "http://*/capture",
        "https://*/capture",
    ],
};

if (dev) {
    manifestExtra.content_security_policy = "script-src 'self' 'unsafe-eval'; object-src 'self'";
}

if (target === T.CHROME) {
    manifestExtra.options_ui = {chrome_style: true};
}
if (target === T.FIREFOX) {
    manifestExtra.options_ui = {browser_style: true};
    manifestExtra.browser_action = {browser_style: true};
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
      publicPath: '', // https://stackoverflow.com/a/64715069
      path: buildPath,
      filename: "[name].js",
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
        exclude: /node_modules/,
        use: {
            loader: 'babel-loader',
        }
      },
      {
        test: /\.css$/,
        loader: "style-loader!css-loader", // TODO different from promnesia??
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin([buildPath + "/*"]),
    new CopyWebpackPlugin([
        { from: 'src/img/*.png', flatten: true },
        { from: 'src/*.html'   , flatten: true },
    ]),
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
  options.devtool = "cheap-module-eval-source-map";
}

module.exports = options;
