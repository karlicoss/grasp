module.exports = {
    'extends': [
        // "google",
        "eslint:recommended",
    ],
    'env': {
        'browser': true,
        'webextensions': true,
        'node': true,
        'es6': true,
    },

    "parserOptions": {
        'sourceType': 'module',
        "ecmaFeatures": {
            "forOf": true,
            "modules": true,
        }
    },

    "rules": {
        "indent": "off",
        "comma-dangle": "off",
        "no-console": "off",
    }
    // TODO use flow?
};
//module.exports = {
//    // "extends": "google",
//    'extends': [
//        "plugin:react/recommended",
//    ],
//};
