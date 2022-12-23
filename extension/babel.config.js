const presets = [
    [
        '@babel/preset-env',
        // https://caniuse.com/usage-table
        // TODO ideally should use https://github.com/browserslist/browserslist
        {targets: {chrome: 75, firefox: 75}}
    ],
    '@babel/preset-flow',
]
const plugins = []

// if (process.env["ENV"] === "prod") {
//   plugins.push(...);
// }

module.exports = { presets, plugins }
