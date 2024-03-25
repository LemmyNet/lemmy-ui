import { verifyTranslationImports } from "./services/I18NextService";
import { verifyDateFnsImports } from "@utils/app/setup-date-fns";
import { verifyHighlighjsImports } from "./lazy-highlightjs";

export class ImportReport {
  error: Array<{ id: string; error: Error | string | undefined }> = [];
  success: string[] = [];
  message?: string;
}

export type ImportReportCollection = {
  translation?: ImportReport;
  "date-fns"?: ImportReport;
  "highlight.js"?: ImportReport;
};

function collect(
  verbose: boolean,
  kind: keyof ImportReportCollection,
  collection: ImportReportCollection,
  report: ImportReport,
) {
  collection[kind] = report;
  if (verbose) {
    for (const { id, error } of report.error) {
      console.warn(`${kind} "${id}" failed: ${error}`);
    }
    const message = report.message ? ` (${report.message})` : "";
    const good = report.success.length;
    const bad = report.error.length;
    if (bad) {
      console.error(
        `${bad} out of ${bad + good} ${kind} imports failed.` + message,
      );
    } else {
      console.log(`${good} ${kind} imports verified.` + message);
    }
  }
}

// This verifies that the parameters used for parameterized imports are
// correct, that the respective chunks are reachable or bundled, and that the
// returned objects match expectations.
export async function verifyDynamicImports(
  verbose: boolean,
): Promise<ImportReportCollection> {
  const collection: ImportReportCollection = {};
  await verifyTranslationImports().then(report =>
    collect(verbose, "translation", collection, report),
  );
  await verifyDateFnsImports().then(report =>
    collect(verbose, "date-fns", collection, report),
  );
  await verifyHighlighjsImports().then(report =>
    collect(verbose, "highlight.js", collection, report),
  );
  return collection;
}
