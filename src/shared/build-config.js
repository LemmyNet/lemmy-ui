// Don't import/require things here. This file is also imported in
// webpack.config.js. Needs dev server restart to apply changes.

/** Names of highlight.js languages to enable for markdown parsing.
 * @type ["plaintext", ...string[]] */
// prettier-ignore
const enabledSyntaxHighlighters = [
  "plaintext",
  // The 'Common' set of highlight.js languages.
  "bash", "c", "cpp", "csharp", "css", "diff", "go", "graphql", "ini", "java",
  "javascript", "json", "kotlin", "less", "lua", "makefile", "markdown",
  "objectivec", "perl", "php-template", "php", "python-repl", "python", "r",
  "ruby", "rust", "scss", "shell", "sql", "swift", "typescript", "vbnet",
  "wasm", "xml", "yaml",
  // Some additional languages
  "dockerfile", "pgsql",
];

module.exports = {
  enabledSyntaxHighlighters,
};
