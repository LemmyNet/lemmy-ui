export const bundledSyntaxHighlighters: ["plaintext", ...string[]];
export const lazySyntaxHighlighters: string[] | "*";

export type TranslationDesc = {
  resource: string;
  code: string;
  name: string;
  bundled?: boolean;
};

export const allLanguages: TranslationDesc[];
export const supportedLanguages;
