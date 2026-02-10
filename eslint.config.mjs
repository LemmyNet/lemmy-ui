import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier/recommended";
import jsxa11y from "eslint-plugin-jsx-a11y";
import inferno from "eslint-plugin-inferno";

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    plugins: {
      inferno: inferno,
      rules: inferno.configs.recommended,
    },
  },
  {
    plugins: {
      "jsx-a11y": jsxa11y,
    },
    rules: jsxa11y.configs.recommended.rules,
  },
  {
    languageOptions: {
      parser: tseslint.parser,
    },
  },
  // For some reason this has to be in its own block
  {
    ignores: [
      "eslint.config.mjs",
      "generate_translations.js",
      "webpack.config.js",
      "src/shared/build-config.js",
      "src/api_tests",
      "**/*.png",
      "**/*.css",
      "**/*.scss",
      "**/*.svg",
      "src/shared/translations/**",
      "dist/*",
      ".yalc/*",
    ],
  },
  {
    files: ["src/**/*.js", "src/**/*.mjs", "src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/no-unsafe-assignment": 0,
      "@typescript-eslint/no-unsafe-member-access": 0,
      "@typescript-eslint/no-unsafe-argument": 0,
      "@typescript-eslint/no-unsafe-return": 0,
      // TODO: the following is caused by calling async functions from sync functions
      "@typescript-eslint/no-misused-promises": 0,
      "@typescript-eslint/no-floating-promises": 0,
      "no-console": ["error", { allow: ["warn", "error", "debug", "assert"] }],
      "@typescript-eslint/no-useless-constructor": "error",
      "inferno/jsx-boolean-value": "error",
      "inferno/jsx-props-class-name": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      eqeqeq: "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["assets/*", "client/*", "server/*", "shared/*"],
              message: "Use relative import instead.",
            },
          ],
        },
      ],
    },
  },
];
