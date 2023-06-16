import type { Request, Response } from "express";
import { existsSync } from "fs";
import path from "path";

const extraThemesFolder =
  process.env["LEMMY_UI_EXTRA_THEMES_FOLDER"] || "./extra_themes";

export default async (req: Request, res: Response) => {
  res.contentType("text/css");

  const theme = req.params.name;

  if (!theme.endsWith(".css")) {
    res.statusCode = 400;
    res.send("Theme must be a css file");
  }

  const customTheme = path.resolve(`./${extraThemesFolder}/${theme}`);

  if (existsSync(customTheme)) {
    res.sendFile(customTheme);
  } else {
    const internalTheme = path.resolve(`./dist/assets/css/themes/${theme}`);

    // If the theme doesn't exist, just send litely
    if (existsSync(internalTheme)) {
      res.sendFile(internalTheme);
    } else {
      res.sendFile(path.resolve("./dist/assets/css/themes/litely.css"));
    }
  }
};
