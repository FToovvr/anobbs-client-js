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
        "no-trailing-spaces": "error",
        "no-multi-spaces": "error",
        "object-curly-spacing": ["error", "always"],
        "array-bracket-spacing": ["error", "never"],
        "comma-spacing": ["error", { "before": false, "after": true }],
        "keyword-spacing": ["error", { "before": true, "after": true }],
        "linebreak-style": ["error", "unix"],

        // 要求分号
        "semi": "off",
        "@typescript-eslint/semi": ["error", "always"],
        // 结尾逗号
        "comma-dangle": ["error", "always-multiline"],

        // 未使用变量相关
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],

        // 允许 fallthrough
        "no-fallthrough": "off",

        // 允许额外标记可推断的类型
        "@typescript-eslint/no-inferrable-types": "off",
    },
};
