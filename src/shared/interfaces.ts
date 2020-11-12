import { GetSiteResponse, LemmyHttp } from 'lemmy-js-client';

export interface IsoData {
  path: string;
  routeData: any[];
  site: GetSiteResponse;
  // Lang and theme
  lang: string;
  // communities?: ListCommunitiesResponse;
}

declare global {
  interface Window {
    isoData: IsoData;
  }
}

export interface InitialFetchRequest {
  auth: string;
  path: string;
  client: LemmyHttp;
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

export enum UserDetailsView {
  Overview,
  Comments,
  Posts,
  Saved,
}
