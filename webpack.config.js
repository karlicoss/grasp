const webpack = require('webpack'),
      path = require('path'),
      CleanWebpackPlugin = require('clean-webpack-plugin'),
      CopyWebpackPlugin = require('copy-webpack-plugin'),
      WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin'),
      HtmlWebpackPlugin = require('html-webpack-plugin');
// TODO remove plugins from package.json

const T = {
    CHROME  : 'chrome',
    FIREFOX: 'firefox',
};

const env = {
    TARGET : process.env.TARGET, // TODO assert not null?
    RELEASE: process.env.RELEASE,
};

const pkg = require('./package.json');
const baseManifest = require('./src/manifest.json');

const release = env.RELEASE == 'YES' ? true : false;
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

var fileExtensions = ["jpg", "jpeg", "png", "gif", "eot", "otf", "svg", "ttf", "woff", "woff2"];

const build_path = path.join(__dirname, "dist"); // TODO target??

var options = {
  mode: 'production', // TODO eh??
  optimization: {
    // https://webpack.js.org/configuration/optimization
    // don't think minimize worth it for such a tiny extension
    minimize: false
  },
  entry: {
    popup     : path.join(__dirname, "src", "js", "popup.js"),
    options   : path.join(__dirname, "src", "js", "options_page.js"),
    background: path.join(__dirname, "src", "js", "background.js")
  },
  output: {
      path: build_path,
      // TODO why bundle???
      filename: "[name].bundle.js",
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
        loader: "style-loader!css-loader",
        exclude: /node_modules/
      },
      {
        test: new RegExp('\.(' + fileExtensions.join('|') + ')$'),
        loader: "file-loader?name=[name].[ext]",
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
    new CleanWebpackPlugin([build_path + "/*"]),
    new CopyWebpackPlugin([
        { from: 'src/img/*.png', flatten: true },
    ]),
    // expose and write the allowed env vars on the compiled bundle
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV)
    }),
    new WebpackExtensionManifestPlugin({
        config: {
            base: baseManifest,
            extend: manifestExtra,
        }
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "popup.html"),
      filename: "popup.html",
        chunks: ["popup"],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "options.html"),
      filename: "options.html",
      chunks: ["options"]
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "background.html"),
      filename: "background.html",
      chunks: ["background"]
    }),
  ]
};

// TODO https://webpack.js.org/configuration/devtool
if (dev) {
  options.devtool = "cheap-module-eval-source-map";
}

module.exports = options;
