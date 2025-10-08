const fs = require("fs");
const lemmyjsclient = require("lemmy-js-client");

const translationDir = "lemmy-translations/translations/";
const outDir = "src/shared/translations/";
fs.mkdirSync(outDir, { recursive: true });
fs.readdir(translationDir, (_err, files) => {
  files.forEach(filename => {
    const lang = filename.split(".")[0];
    try {
      const json = JSON.parse(
        fs.readFileSync(translationDir + filename, "utf8"),
      );
      let data = `export const ${lang} = {\n  translation: {`;
      for (const key in json) {
        if (key in json) {
          const value = json[key].replace(/"/g, '\\"').replace("\n", "\\n");
          data += `\n    ${key}: "${value}",`;
        }
      }
      data += "\n  },\n} as const;";
      const target = outDir + lang + ".ts";
      if (
        !fs.existsSync(target) ||
        fs.readFileSync(target).toString() !== data
      ) {
        fs.writeFileSync(target, data);
      }
    } catch (err) {
      console.error(err);
    }
  });
});

// generate types for i18n keys
const baseLanguage = "en";

fs.readFile(`${translationDir}${baseLanguage}.json`, "utf8", (_, fileStr) => {
  const noOptionKeys = [];
  const optionKeys = [];
  const optionRegex = /\{\{(.+?)\}\}/g;
  const optionMap = new Map();

  const entries = Object.entries(JSON.parse(fileStr));
  for (const [key, val] of entries) {
    const options = [];
    for (
      let match = optionRegex.exec(val);
      match;
      match = optionRegex.exec(val)
    ) {
      options.push(match[1]);
    }

    if (options.length > 0) {
      optionMap.set(key, options);
      optionKeys.push(key);
    } else {
      noOptionKeys.push(key);
    }
  }

  const translationKeys = entries.map(e => e[0]);
  let missingErrorTranslations = false;
  lemmyjsclient.AllLemmyErrors.forEach(e => {
    if (!translationKeys.includes(e)) {
      missingErrorTranslations = true;
      console.error(`Missing translation for error ${e}`);
    }
  });
  if (missingErrorTranslations) {
    throw "Some errors are missing translations";
  }

  const indent = "    ";

  const data = `import "i18next";
import { en } from "./en";

declare module "i18next" {
  interface CustomTypeOptions {
    jsonFormat: "v3"; // no longer supported in ^24.0, (can just be removed after converting v4)
    // strictKeyChecks: true; would also check that options are provided, needs ^24.2
    resources: {
      translation: typeof en.translation
    };
  }
  export type NoOptionI18nKeys = 
${noOptionKeys.map(key => `${indent}| "${key}"`).join("\n")};

  export type OptionI18nKeys = 
${optionKeys.map(key => `${indent}| "${key}"`).join("\n")};

  export type I18nKeys = NoOptionI18nKeys | OptionI18nKeys;
}
`;

  const target = `${outDir}i18next.d.ts`;
  if (!fs.existsSync(target) || fs.readFileSync(target).toString() !== data) {
    fs.writeFileSync(target, data);
  }
});
