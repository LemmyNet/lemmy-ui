import { GetSiteResponse } from 'lemmy-js-client';

export interface IsoData {
  path: string;
  routeData: any[];
  site: GetSiteResponse;
  // communities?: ListCommunitiesResponse;
}

declare global {
  interface Window {
    isoData: IsoData;
  }
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
