import type { Response } from "express";
import { buildThemeList } from "../utils/build-themes-list";

export default async ({ res }: { res: Response }) => {
  res.type("json").send(JSON.stringify(await buildThemeList()));
};
