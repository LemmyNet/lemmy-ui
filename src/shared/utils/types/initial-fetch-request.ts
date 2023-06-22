import { GetSiteResponse } from "lemmy-js-client";
import type { ParsedQs } from "qs";
import { WrappedLemmyHttp } from "../../services/HttpService";

export default interface InitialFetchRequest<T extends ParsedQs = ParsedQs> {
  auth?: string;
  client: WrappedLemmyHttp;
  path: string;
  query: T;
  site: GetSiteResponse;
}
