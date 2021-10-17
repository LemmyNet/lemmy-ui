import {
  CommentView,
  GetSiteResponse,
  LemmyHttp,
  PersonMentionView,
} from "lemmy-js-client";

export interface IsoData {
  path: string;
  routeData: any[];
  site_res: GetSiteResponse;
}

export interface ILemmyConfig {
  wsHost?: string;
}

declare global {
  interface Window {
    isoData: IsoData;
    lemmyConfig?: ILemmyConfig;
  }
}

export interface InitialFetchRequest {
  auth: string;
  path: string;
  client: LemmyHttp;
}

export interface CommentNode {
  comment_view: CommentView | PersonMentionView;
  children?: CommentNode[];
  depth?: number;
}

export interface PostFormParams {
  name: string;
  url?: string;
  body?: string;
  community_name?: string;
  community_id?: number;
}

export enum CommentSortType {
  Hot,
  Top,
  New,
  Old,
}

export enum CommentViewType {
  Tree,
  Chat,
}

export enum DataType {
  Post,
  Comment,
}

export enum BanType {
  Community,
  Site,
}

export enum PersonDetailsView {
  Overview,
  Comments,
  Posts,
  Saved,
}

export enum PurgeType {
  Person,
  Community,
  Post,
  Comment,
}
