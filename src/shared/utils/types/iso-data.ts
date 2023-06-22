import { ErrorPageData, RouteData } from "@utils/types";
import { GetSiteResponse } from "lemmy-js-client";

/**
 * This contains serialized data, it needs to be deserialized before use.
 */
export default interface IsoData<T extends RouteData = any> {
  path: string;
  routeData: T;
  site_res: GetSiteResponse;
  errorPageData?: ErrorPageData;
}
