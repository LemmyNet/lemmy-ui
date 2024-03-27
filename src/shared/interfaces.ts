import { ErrorPageData } from "@utils/types";
import {
  CommentReply,
  CommentView,
  GetSiteResponse,
  PersonMention,
} from "lemmy-js-client";
import type { ParsedQs } from "qs";
import { RequestState } from "./services/HttpService";

/**
 * This contains serialized data, it needs to be deserialized before use.
 */
export interface IsoData<T extends RouteData = any> {
  path: string;
  routeData: T;
  site_res: GetSiteResponse;
  errorPageData?: ErrorPageData;
}

export type IsoDataOptionalSite<T extends RouteData = any> = Partial<
  IsoData<T>
> &
  Pick<IsoData<T>, Exclude<keyof IsoData<T>, "site_res">>;

declare global {
  interface Window {
    isoData: IsoData;
    checkLazyScripts?: () => void;
  }
}

export interface InitialFetchRequest<T extends ParsedQs = ParsedQs> {
  path: string;
  query: T;
  site: GetSiteResponse;
  headers: { [key: string]: string };
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
  Downvote,
}

export enum VoteContentType {
  Post,
  Comment,
}

export type CommentNodeView = Omit<CommentView, "banned_from_community"> &
  Partial<Pick<CommentView, "banned_from_community">> & {
    person_mention?: PersonMention;
    comment_reply?: CommentReply;
  };

export interface CommentNodeI {
  comment_view: CommentNodeView;
  children: Array<CommentNodeI>;
  depth: number;
}

export type RouteData = Record<string, RequestState<any>>;
