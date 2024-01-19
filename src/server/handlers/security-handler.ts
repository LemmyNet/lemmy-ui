import type { Response } from "express";

export default async ({ res }: { res: Response }) => {
  res.setHeader("content-type", "text/plain; charset=utf-8");

  res.send(
    `Contact: https://github.com/LemmyNet/lemmy-ui/security/advisories/new
  Expires: 2025-01-01T04:59:00.000Z
  `,
  );
};
