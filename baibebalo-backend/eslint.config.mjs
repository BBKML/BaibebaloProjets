import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  rules: {
    "no-unused-vars": "warn",
    "no-case-declarations": "warn"
  }
  },
  js.configs.recommended,
];
