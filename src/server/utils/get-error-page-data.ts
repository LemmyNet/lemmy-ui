import { ErrorPageData } from "@utils/types";
import { GetSiteResponse } from "lemmy-js-client";

export function getErrorPageData(error: Error, site?: GetSiteResponse) {
  const errorPageData: ErrorPageData = {};

  if (site) {
    errorPageData.error = error.name;
  }

  const adminMatrixIds = site?.admins
    .map(({ person: { matrix_user_id } }) => matrix_user_id)
    .filter<string>(id => id !== undefined);

  if (adminMatrixIds && adminMatrixIds.length > 0) {
    errorPageData.adminMatrixIds = adminMatrixIds;
  }

  return errorPageData;
}
