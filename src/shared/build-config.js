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

module.exports = {
  bundledSyntaxHighlighters,
  lazySyntaxHighlighters,
};
