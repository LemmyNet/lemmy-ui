import { verifyTranslationImports } from "./services/I18NextService";

export class ImportReport {
  error: Array<{ id: string; error: Error | string | undefined }> = [];
  success: string[] = [];
}

export type ImportReportCollection = {
  translation?: ImportReport;
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
    const good = report.success.length;
    const bad = report.error.length;
    if (bad) {
      console.error(`${bad} out of ${bad + good} ${kind} imports failed.`);
    } else {
      console.log(`${good} ${kind} imports verified.`);
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
  return collection;
}
