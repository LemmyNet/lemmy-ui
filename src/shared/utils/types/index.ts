import { RequestState } from "../../services/HttpService";
import { BanType } from "./ban-type";
import Choice from "./choice";
import CommentNodeI from "./comment-node-i";
import { CommentViewType } from "./comment-view-type";
import CommunityTribute from "./community-tribute";
import { DataType } from "./data-type";
import ErrorPageData from "./error-page-data";
import ILemmyConfig from "./i-lemmy-config";
import InitialFetchRequest from "./initial-fetch-request";
import IsoData from "./iso-data";
import { PersonDetailsView } from "./person-details-view";
import PersonTribute from "./person-tribute";
import PostFormParams from "./post-form-params";
import { PurgeType } from "./purge-type";
import { VoteType } from "./vote-type";
import WithComment from "./with-comment";

declare global {
  interface Window {
    isoData: IsoData;
    lemmyConfig?: ILemmyConfig;
  }
}

// for some reason, this is needed for these specific types to be exported. if
// imported from a separate .ts file, it throws 'module not found' warning. 🤷‍♂️
export type IsoDataOptionalSite<T extends RouteData = any> = Partial<
  IsoData<T>
> &
  Pick<IsoData<T>, Exclude<keyof IsoData<T>, "site_res">>;

export type RouteData = Record<string, RequestState<any>>;

export type RouteDataResponse<T extends Record<string, any>> = {
  [K in keyof T]: RequestState<T[K]>;
};

export type QueryParams<T extends Record<string, any>> = {
  [key in keyof T]?: string;
};

export type ThemeColor =
  | "primary"
  | "secondary"
  | "light"
  | "dark"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "cyan"
  | "white"
  | "gray"
  | "gray-dark";

export {
  BanType,
  Choice,
  CommentNodeI,
  CommentViewType,
  CommunityTribute,
  DataType,
  ErrorPageData,
  ILemmyConfig,
  InitialFetchRequest,
  IsoData,
  PersonDetailsView,
  PersonTribute,
  PostFormParams,
  PurgeType,
  VoteType,
  WithComment,
};
