module.exports = {
    "parser": "@babel/eslint-parser",
    "plugins": [
        "ft-flow"
    ],
    'extends': [
        // "google",
        "eslint:recommended",
        "plugin:ft-flow/recommended",
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
        "no-inner-declarations": "off",
        "no-unused-vars": ["error", {
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_"
        }],
    }
    // TODO use flow?
};
