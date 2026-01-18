import { localRSSUrl } from "@utils/app";
import type { Response } from "express";

export default async ({ res }: { res: Response }) => {
  res.redirect(localRSSUrl());
};
