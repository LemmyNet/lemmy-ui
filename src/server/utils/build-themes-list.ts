import { existsSync } from "fs";
import { readdir } from "fs/promises";

const extraThemesFolder =
  process.env["LEMMY_UI_EXTRA_THEMES_FOLDER"] || "./extra_themes";

const themes = ReadonlyArray<string>[
  "darkly",
  "darkly-red",
  "darkly-compact",
  "litely",
  "litely-red",
];

export async function buildThemeList(): Promise<ReadonlyArray<string>> {
  if (existsSync(extraThemesFolder)) {
    const dirThemes = await readdir(extraThemesFolder);
    const cssThemes = dirThemes
      .filter(d => d.endsWith(".css"))
      .map(d => d.replace(".css", ""));
    return themes.concat(cssThemes);
  }
  return themes;
}
