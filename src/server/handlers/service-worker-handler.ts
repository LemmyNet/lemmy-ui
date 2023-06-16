import type { Response } from "express";
import path from "path";

export default async ({ res }: { res: Response }) => {
  res.setHeader("Content-Type", "application/javascript");

  res.sendFile(
    path.resolve(
      `./dist/service-worker${
        process.env.NODE_ENV === "development" ? "-development" : ""
      }.js`
    )
  );
};
