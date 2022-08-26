import i18next, { i18nTyped, Resource } from "i18next";
import { en } from "./translations/en";
import { ru } from "./translations/ru";
import { uk } from "./translations/uk";
import { getLanguages } from "./utils";

export const languages = [
  { resource: uk, code: "uk", name: "Українська" },
  { resource: en, code: "en", name: "English" },
  { resource: ru, code: "ru", name: "Русский" },
];

const resources: Resource = {};
languages.forEach(l => (resources[l.code] = l.resource));

function format(value: any, format: any): any {
  return format === "uppercase" ? value.toUpperCase() : value;
}

i18next.init({
  debug: false,
  compatibilityJSON: "v3",
  // load: 'languageOnly',
  // initImmediate: false,
  lng: getLanguages()[0],
  fallbackLng: "en",
  resources,
  interpolation: { format },
});

export const i18n = i18next as i18nTyped;
