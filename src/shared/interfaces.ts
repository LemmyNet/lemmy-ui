import { CommentView, GetSiteResponse, LemmyHttp } from "lemmy-js-client";
import type { ParsedQs } from "qs";

/**
 * This contains serialized data, it needs to be deserialized before use.
 */
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

export interface InitialFetchRequest<T extends ParsedQs = ParsedQs> {
  auth?: string;
  client: LemmyHttp;
  path: string;
  query: T;
  site: GetSiteResponse;
}

export interface PostFormParams {
  name?: string;
  url?: string;
  body?: string;
}

export enum CommentViewType {
  Tree,
  Flat,
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
  Overview = "Overview",
  Comments = "Comments",
  Posts = "Posts",
  Saved = "Saved",
}

export enum PurgeType {
  Person,
  Community,
  Post,
  Comment,
}

export enum VoteType {
  Upvote,
  Downvote
}

export interface CommentNodeI {
  comment_view: CommentView;
  children: Array<CommentNodeI>;
  depth: number;
}
