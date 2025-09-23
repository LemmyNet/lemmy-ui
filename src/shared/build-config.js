// Don't import/require things here. This file is also imported in
// webpack.config.js. Needs dev server restart to apply changes.

/** Bundled highlighters can be autodetected in markdown.
 * @type ["plaintext", ...string[]] **/
// prettier-ignore
const bundledSyntaxHighlighters = [
  "plaintext",
  // The 'Common' set of highlight.js languages.
  "bash", "c", "cpp", "csharp", "css", "diff", "go", "graphql", "ini", "java",
  "javascript", "json", "kotlin", "less", "lua", "makefile", "markdown",
  "objectivec", "perl", "php-template", "php", "python-repl", "python", "r",
  "ruby", "rust", "scss", "shell", "sql", "swift", "typescript", "vbnet",
  "wasm", "xml", "yaml",
];

/** Lazy highlighters can't be autodetected, they have to be explicitly specified
 * as the language. (e.g. ```dockerfile ...)
 * "*" enables all non-bundled languages
 * @type string[] | "*" **/
const lazySyntaxHighlighters = "*";

const allLanguages = [
  { resource: "ar", code: "ar", name: "العربية" },
  { resource: "bg", code: "bg", name: "Български" },
  { resource: "ca", code: "ca", name: "Català" },
  { resource: "cs", code: "cs", name: "Česky" },
  { resource: "da", code: "da", name: "Dansk" },
  { resource: "de", code: "de", name: "Deutsch" },
  { resource: "el", code: "el", name: "Ελληνικά" },
  { resource: "en", code: "en", name: "English", bundled: true },
  { resource: "eo", code: "eo", name: "Esperanto" },
  { resource: "es", code: "es", name: "Español" },
  { resource: "eu", code: "eu", name: "Euskara" },
  { resource: "fa", code: "fa", name: "فارسی" },
  { resource: "fi", code: "fi", name: "Suomi" },
  { resource: "fr", code: "fr", name: "Français" },
  { resource: "ga", code: "ga", name: "Gaeilge" },
  { resource: "gl", code: "gl", name: "Galego" },
  { resource: "hr", code: "hr", name: "Hrvatski" },
  { resource: "hu", code: "hu", name: "magyar nyelv" },
  { resource: "id", code: "id", name: "Bahasa Indonesia" },
  { resource: "it", code: "it", name: "Italiano" },
  { resource: "ja", code: "ja", name: "日本語" },
  { resource: "ko", code: "ko", name: "한국어" },
  { resource: "nl", code: "nl", name: "Nederlands" },
  { resource: "nn", code: "nn", name: "nynorsk" },
  { resource: "oc", code: "oc", name: "Occitan" },
  { resource: "pl", code: "pl", name: "Polski" },
  { resource: "pt", code: "pt", name: "Português" },
  { resource: "pt_BR", code: "pt-BR", name: "Português (Brasil)" },
  { resource: "ru", code: "ru", name: "Русский" },
  { resource: "sv", code: "sv", name: "Svenska" },
  { resource: "vi", code: "vi", name: "Tiếng Việt" },
  { resource: "zh", code: "zh", name: "中文 (简体)" },
  { resource: "zh_Hant", code: "zh-TW", name: "中文 (繁體)" },
];

const supportedLocales = allLanguages.map(x => x.code);

module.exports = {
  bundledSyntaxHighlighters,
  lazySyntaxHighlighters,
  allLanguages,
  supportedLocales,
};
