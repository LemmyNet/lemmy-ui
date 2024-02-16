import type { Response } from "express";
import { BUILD_DATE_ISO8601 } from "../../shared/build-date";
import { parseISO } from "date-fns";

export default async ({ res }: { res: Response }) => {
  const buildDatePlusYear = parseISO(BUILD_DATE_ISO8601);

  // Add a year to the build date
  buildDatePlusYear.setFullYear(new Date().getFullYear() + 1);

  const yearFromNow = buildDatePlusYear.toISOString();

  res.setHeader("content-type", "text/plain; charset=utf-8");

  res.send(
    `Contact: https://github.com/LemmyNet/lemmy-ui/security/advisories/new
  Expires: ${yearFromNow}
  `,
  );
};
