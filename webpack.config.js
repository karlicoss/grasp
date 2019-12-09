var webpack = require("webpack"),
    path = require("path"),
    fileSystem = require("fs"),
    env = require("./utils/env"),
    CleanWebpackPlugin = require("clean-webpack-plugin"),
    CopyWebpackPlugin = require("copy-webpack-plugin"),
    HtmlWebpackPlugin = require("html-webpack-plugin"),
    WriteFilePlugin = require("write-file-webpack-plugin"),
    WebpackExtensionManifestPlugin = require("webpack-extension-manifest-plugin");

const pkg = require('./package.json');
const baseManifest = require('./src/manifest.json');

const target = env.TARGET;
const dev = env.NODE_ENV === "development";

const pkg_name = (env.ANY_HOST ? "grasp (any host)" : "grasp") + (dev ? ' [dev]' : '');

// TODO make permissions literate
const permissions = [
    "storage",
    "notifications",
    "activeTab",
    "http://localhost/capture",
    "https://localhost/capture"
];

if (env.ANY_HOST) {
    permissions.push("https://*/capture");
}


// Firefox wouldn't let you rebind its default shortcuts most of which use Shift
// On the other hand, Chrome wouldn't let you use Alt
const modifier = target === 'chrome' ? 'Shift' : 'Alt';

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

const manifestExtra = {
    name: pkg_name,
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

if (target === 'chrome') {
    manifestExtra.options_ui = {chrome_style: true};
}
if (target === 'firefox') {
    manifestExtra.options_ui = {browser_style: true};
    manifestExtra.browser_action = {browser_style: true};
}

// load the secrets
var alias = {};

var secretsPath = path.join(__dirname, ("secrets." + env.NODE_ENV + ".js"));

var fileExtensions = ["jpg", "jpeg", "png", "gif", "eot", "otf", "svg", "ttf", "woff", "woff2"];

if (fileSystem.existsSync(secretsPath)) {
  alias["secrets"] = secretsPath;
}

const build_path = path.join(__dirname, "dist"); // TODO target??

var options = {
  mode: 'production',
  optimization: {
    // https://webpack.js.org/configuration/optimization
    // don't thing minimize worth it for suck a tiny extension
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
  resolve: {
    alias: alias
  },
  plugins: [
    // clean the build folder
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
    new WriteFilePlugin()
  ]
};

// TODO https://webpack.js.org/configuration/devtool
if (env.NODE_ENV === "development") {
  options.devtool = "cheap-module-eval-source-map";
}

module.exports = options;
