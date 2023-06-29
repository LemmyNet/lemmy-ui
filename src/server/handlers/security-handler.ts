import type { Response } from "express";

export default async ({ res }: { res: Response }) => {
  res.setHeader("content-type", "text/plain; charset=utf-8");

  res.send(`Contact: mailto:security@lemmy.ml
  Contact: mailto:admin@` + process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST + `
  Contact: mailto:security@` + process.env.LEMMY_UI_LEMMY_EXTERNAL_HOST + `
  Expires: 2024-01-01T04:59:00.000Z
  `);
};
