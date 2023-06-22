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
import { IsoDataOptionalSite } from "./iso-data-optional-site";
import { PersonDetailsView } from "./person-details-view";
import PersonTribute from "./person-tribute";
import PostFormParams from "./post-form-params";
import { PurgeType } from "./purge-type";
import { QueryParams } from "./query-params";
import { RouteData } from "./route-data";
import { RouteDataResponse } from "./route-data-response";
import { ThemeColor } from "./theme-color";
import { VoteType } from "./vote-type";
import WithComment from "./with-comment";

declare global {
  interface Window {
    isoData: IsoData;
    lemmyConfig?: ILemmyConfig;
  }
}

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
  IsoDataOptionalSite,
  PersonDetailsView,
  PersonTribute,
  PostFormParams,
  PurgeType,
  QueryParams,
  RouteData,
  RouteDataResponse,
  ThemeColor,
  VoteType,
  WithComment,
};
