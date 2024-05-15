import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier/recommended";
import jsxa11y from "eslint-plugin-jsx-a11y";
import inferno from "eslint-plugin-inferno";

export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
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
      "@typescript-eslint/ban-ts-comment": 0,
      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "explicit-module-boundary-types": 0,
      "no-empty-function": 0,
      "no-non-null-assertion": 0,
      "arrow-body-style": 0,
      curly: 0,
      "eol-last": 0,
      eqeqeq: "error",
      "func-style": 0,
      "import/no-duplicates": 0,
      "max-statements": 0,
      "max-params": 0,
      "new-cap": 0,
      "no-console": 0,
      "no-duplicate-imports": 0,
      "no-extra-parens": 0,
      "no-return-assign": 0,
      "no-throw-literal": 0,
      "no-trailing-spaces": 0,
      "no-unused-expressions": 0,
      "no-useless-constructor": 0,
      "no-useless-escape": 0,
      "no-var": 0,
      "prefer-const": "error",
      "prefer-rest-params": 0,
      "prettier/prettier": "error",
      "quote-props": 0,
      "unicorn/filename-case": 0,
      "jsx-a11y/media-has-caption": 0,
      "jsx-a11y/label-has-associated-control": 0,
    },
  },
];
