import type { Response } from "express";
import { BUILD_DATE_ISO8601 } from "../../shared/build-date";

export default async ({ res }: { res: Response }) => {
  res.setHeader("content-type", "text/plain; charset=utf-8");

  res.send(
    `Contact: https://github.com/LemmyNet/lemmy-ui/security/advisories/new
  Expires: ${BUILD_DATE_ISO8601}
  `,
  );
};
