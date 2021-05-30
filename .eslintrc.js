module.exports = {
    "env": {
        "es2021": true,
        "node": true,
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module",
    },
    "plugins": [
        "@typescript-eslint",
    ],
    "rules": {
        // 空格相关
        "indent": ["error", 4],
        "no-trailing-spaces": "warn",
        "no-multi-spaces": "warn",
        "object-curly-spacing": ["warn", "always"],
        "array-bracket-spacing": ["warn", "never"],
        "comma-spacing": ["warn", { "before": false, "after": true }],
        "keyword-spacing": ["warn", { "before": true, "after": true }],
        "linebreak-style": [
            "error",
            "unix",
        ],

        // 要求分号
        "semi": ["error", "always"],
        // 结尾逗号
        "comma-dangle": ["error", "always-multiline"],

        // 未使用变量相关
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],

        // 允许 fallthrough
        "no-fallthrough": "off",
    },
};
