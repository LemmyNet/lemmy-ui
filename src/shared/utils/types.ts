import {
  CommentAggregates,
  Comment,
  CommentReply,
  CommentView,
  CommunityView,
  CreateOAuthProvider,
  GetSiteResponse,
  PersonCommentMention,
  PersonContentType,
  PersonView,
  MyUserInfo,
} from "lemmy-js-client";
import { RequestState } from "@services/HttpService";
import { Match } from "inferno-router/dist/Route";

/**
 * This contains serialized data, it needs to be deserialized before use.
 */
export interface IsoData<T extends RouteData = any> {
  path: string;
  routeData: T;
  siteRes: GetSiteResponse;
  myUserInfo?: MyUserInfo;
  errorPageData?: ErrorPageData;
  showAdultConsentModal: boolean;
}

export type IsoDataOptionalSite<T extends RouteData = any> = Partial<
  IsoData<T>
> &
  Pick<IsoData<T>, Exclude<keyof IsoData<T>, "siteRes">>;

declare global {
  interface Window {
    isoData: IsoDataOptionalSite;
    checkLazyScripts?: () => void;
  }
}

export interface InitialFetchRequest<
  P extends Record<string, string> = Record<string, never>,
  T extends Record<string, any> = Record<string, never>,
> {
  path: string;
  query: T;
  match: Match<P>;
  site: GetSiteResponse;
  myUserInfo?: MyUserInfo;
  headers: { [key: string]: string };
}

export interface PostFormParams {
  name?: string;
  url?: string;
  body?: string;
  nsfw?: boolean;
  language_id?: number;
  community_id?: number;
  custom_thumbnail?: string;
  alt_text?: string;
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

export type PersonDetailsView = "Uploads" | PersonContentType;

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
    person_comment_mention?: PersonCommentMention;
    comment_reply?: CommentReply;
  };

export interface CommentNodeI {
  comment_view: CommentNodeView;
  children: Array<CommentNodeI>;
  depth: number;
}

export type RouteData = Record<string, RequestState<any>>;

export interface Choice {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CommunityTribute {
  key: string;
  view: CommunityView;
}

export interface ErrorPageData {
  error?: string;
  adminMatrixIds?: string[];
}

export interface PersonTribute {
  key: string;
  view: PersonView;
}

export type QueryParams<T extends Record<string, any>> = {
  [key in keyof T]?: string;
};

export type RouteDataResponse<T extends Record<string, any>> = {
  [K in keyof T]: RequestState<T[K]>;
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

export interface WithComment {
  comment: Comment;
  counts: CommentAggregates;
  my_vote?: number;
  saved?: string;
  creator_is_moderator: boolean;
  creator_is_admin: boolean;
  creator_blocked: boolean;
  creator_banned_from_community: boolean;
}

export interface CrossPostParams {
  name: string;
  url?: string;
  body?: string;
  altText?: string;
  nsfw?: StringBoolean;
  languageId?: number;
  customThumbnailUrl?: string;
}

export type StringBoolean = "true" | "false";

export type ProviderToEdit = Omit<
  CreateOAuthProvider,
  "client_id" | "client_secret"
>;
