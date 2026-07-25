// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // JS da extensão do Safari: roda no WebExtension runtime, não no RN.
    // `browser` é global lá, e não existe no bundle do app.
    files: ["targets/safari/Resources/*.js"],
    languageOptions: {
      globals: {
        browser: "readonly",
        console: "readonly",
        document: "readonly",
        location: "readonly",
      },
    },
  },
]);
