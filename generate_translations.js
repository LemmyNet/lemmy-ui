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
  let noOptionKeys = [];
  let optionKeys = [];
  let keysAndOptions = [];
  const optionRegex = /\{\{(.+?)\}\}/g;

  for (const [key, val] of Object.entries(JSON.parse(fileStr))) {
    const options = [];
    for (
      let match = optionRegex.exec(val);
      match;
      match = optionRegex.exec(val)
    ) {
      options.push(match[1]);
    }

    if (options.length > 0) {
      keysAndOptions.push([key, options]);
      optionKeys.push(key);
    } else {
      noOptionKeys.push(key);
    }
  }

  const indent = "    ";

  const data = `import { i18n } from "i18next";

declare module "i18next" {
  export type NoOptionI18nKeys = 
${noOptionKeys.map(key => `${indent}| "${key}"`).join("\n")};

  export type OptionI18nKeys = 
${optionKeys.map(key => `${indent}| "${key}"`).join("\n")};

  export type I18nKeys = NoOptionI18nKeys | OptionI18nKeys;

  export type TTypedOptions<TKey extends OptionI18nKeys> =${keysAndOptions.reduce(
    (acc, [key, options]) =>
      `${acc} TKey extends \"${key}\" ? ${
        options.reduce((acc, cur) => acc + `${cur}: string | number; `, "{ ") +
        "}"
      } :\n${indent}`,
    ""
  )} (Record<string, unknown> | string);

  export interface TFunctionTyped {
    <
      TKey extends OptionI18nKeys | OptionI18nKeys[],
      TResult extends TFunctionResult = string,
      TInterpolationMap extends TTypedOptions<TKey> = StringMap
    > (
      key: TKey,
      options: TOptions<TInterpolationMap> | string
    ): TResult;

    <
      TResult extends TFunctionResult = string,
      TInterpolationMap extends Record<string, unknown> = StringMap
    > (
      key: NoOptionI18nKeys | NoOptionI18nKeys[],
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
