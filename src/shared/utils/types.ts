import {
  CommunityView,
  CreateOAuthProvider,
  GetSiteResponse,
  PersonContentType,
  PersonView,
  MyUserInfo,
  CommentView,
  CommentSlimView,
  PersonId,
  Community,
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
  lemmyBackend: string;
  lemmyFrontend: string;
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
  interface String {
    toLowerCase<T extends string>(this: T): Lowercase<T>;
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

export type CommentViewType = "tree" | "flat";

export type PostOrCommentType = "post" | "comment";

export type BanType = "community" | "site";

export type PersonDetailsContentType = "uploads" | PersonContentType;

export type PurgeType = "person" | "community" | "post" | "comment";

export type VoteType = "upvote" | "downvote";

export interface CommentNodeI<T> {
  comment_view: T;
  children: Array<CommentNodeI<T>>;
  depth: number;
}

/**
 * If its the CommentSlim variant, you need to include postCreatorId, and the community
 **/
type CommentNodeFull = {
  view: CommentNodeI<CommentView>;
};
type CommentNodeSlim = {
  view: CommentNodeI<CommentSlimView>;
  postCreatorId: PersonId;
  community: Community;
};

/**
 * A comment node to differentiate the full and slim variants.
 **/
export type CommentNodeType = CommentNodeFull | CommentNodeSlim;

/**
 * Differentiate between the Node Type
 **/
export function isCommentNodeFull(
  node: CommentNodeType,
): node is CommentNodeFull {
  return (node as CommentNodeFull).view.comment_view.post !== undefined;
}

/** A helper type to set which comment is loading
 *
 * For comment creates, the comment id is the parent (or zero)
 **/
export type ItemIdAndRes<IdType, Response> = {
  id: IdType;
  res: RequestState<Response>;
};

/** Determines if the item is loading **/
export function itemLoading<IdType, Response>(
  idAndRes: ItemIdAndRes<IdType, Response>,
): IdType | undefined {
  return idAndRes.res.state === "loading" ? idAndRes.id : undefined;
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

export interface CrossPostParams {
  name: string;
  url?: string;
  body?: string;
  altText?: string;
  nsfw?: StringBoolean;
  languageId?: number;
  customThumbnailUrl?: string;
}

// TODO get rid
export type StringBoolean = "true" | "false";

export type ProviderToEdit = Omit<
  CreateOAuthProvider,
  "client_id" | "client_secret"
>;

/**
 * Determines whether to simplify / remove cross-posts, and how to display them.
 **/
export type ShowCrossPostsType = "small" | "expanded" | "show_separately";

/**
 * Whether the body is hidden, preview (for card view lists), or full.
 **/
export type ShowBodyType = "hidden" | "preview" | "full";
