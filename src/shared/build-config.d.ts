export const bundledSyntaxHighlighters: ["plaintext", ...string[]];
export const lazySyntaxHighlighters: string[] | "*";

export type TranslationDesc = {
  // Name of the translation file in `lemmy-translations`
  resource: string;
  // Name of the language in datefns library (undefined if it is equal to `resource`)
  datefns_resource?: string;
  // Short codename
  code: string;
  // Human readable language name
  name: string;
  bundled?: boolean;
};

export const allLanguages: TranslationDesc[];
export const supportedLanguages;
