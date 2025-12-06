module.exports = {
    root: true,
    env: {
        browser: true,
        webextensions: true,
        es2021: true
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest"
    },
    plugins: ["@typescript-eslint"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    ignorePatterns: ["dist/", "bun.lock", ".tmp/", ".bun/"],
    rules: {
        "no-console": "off"
    }
};

