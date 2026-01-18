import { multiCommunityRSSUrlLocal } from "@utils/app";
import type { Request, Response } from "express";

export default async (req: Request, res: Response) => {
  const name = req.params.name;
  res.redirect(multiCommunityRSSUrlLocal(name));
};
