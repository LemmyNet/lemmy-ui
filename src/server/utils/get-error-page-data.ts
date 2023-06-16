import { GetSiteResponse } from "lemmy-js-client";
import { ErrorPageData } from "../../shared/utils";

export function getErrorPageData(error: Error, site?: GetSiteResponse) {
  const errorPageData: ErrorPageData = {};

  if (site) {
    errorPageData.error = error.message;
  }

  const adminMatrixIds = site?.admins
    .map(({ person: { matrix_user_id } }) => matrix_user_id)
    .filter(id => id) as string[] | undefined;
  if (adminMatrixIds && adminMatrixIds.length > 0) {
    errorPageData.adminMatrixIds = adminMatrixIds;
  }

  return errorPageData;
}
