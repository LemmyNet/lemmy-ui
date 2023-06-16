import { existsSync } from "fs";
import { readdir } from "fs/promises";

const extraThemesFolder =
  process.env["LEMMY_UI_EXTRA_THEMES_FOLDER"] || "./extra_themes";

export async function buildThemeList(): Promise<string[]> {
  const themes = ["darkly", "darkly-red", "litely", "litely-red"];
  if (existsSync(extraThemesFolder)) {
    const dirThemes = await readdir(extraThemesFolder);
    const cssThemes = dirThemes
      .filter(d => d.endsWith(".css"))
      .map(d => d.replace(".css", ""));
    themes.push(...cssThemes);
  }
  return themes;
}
