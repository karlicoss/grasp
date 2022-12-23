module.exports = {
    "parser": "@babel/eslint-parser",
    "plugins": [
        "flowtype"
    ],
    'extends': [
        // "google",
        "eslint:recommended",
        "plugin:flowtype/recommended",
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
        "flowtype/space-before-type-colon": "off",
        "no-unused-vars": ["error", {
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_"
        }],
    }
    // TODO use flow?
};
