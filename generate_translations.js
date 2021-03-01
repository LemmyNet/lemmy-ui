const fs = require("fs");

const translationDir = "lemmy-translations/translations/";
const outDir = "src/shared/translations/";
fs.mkdirSync(outDir, { recursive: true });
fs.readdir(translationDir, (_err, files) => {
  files.forEach(filename => {
    const lang = filename.split(".")[0];
    try {
      const json = JSON.parse(
        fs.readFileSync(translationDir + filename, "utf8")
      );
      let data = `export const ${lang} = {\n  translation: {`;
      for (const key in json) {
        if (key in json) {
          const value = json[key].replace(/"/g, '\\"');
          data += `\n    ${key}: "${value}",`;
        }
      }
      data += "\n  },\n};";
      const target = outDir + lang + ".ts";
      fs.writeFileSync(target, data);
    } catch (err) {
      console.error(err);
    }
  });
});

// generate types for i18n keys
const baseLanguage = "en";

fs.readFile(`${translationDir}${baseLanguage}.json`, "utf8", (_, fileStr) => {
  const keys = Object.keys(JSON.parse(fileStr));

  const data = `import { i18n } from "i18next";

declare module "i18next" {
  export type I18nKeys = 
${keys.map(key => `    | "${key}"`).join("\n")};
  
  export interface TFunctionTyped {
    // basic usage
    <
      TResult extends TFunctionResult = string,
      TInterpolationMap extends Record<string, unknown> = StringMap
    >(
      key: I18nKeys | I18nKeys[],
      options?: TOptions<TInterpolationMap> | string
    ): TResult;
    // overloaded usage
    <
      TResult extends TFunctionResult = string,
      TInterpolationMap extends Record<string, unknown> = StringMap
    >(
      key: I18nKeys | I18nKeys[],
      defaultValue?: string,
      options?: TOptions<TInterpolationMap> | string
    ): TResult;
  }

  export interface i18nTyped extends i18n {
    t: TFunctionTyped;
  }
}
`;

  fs.writeFileSync(`${outDir}i18next.d.ts`, data);
});
