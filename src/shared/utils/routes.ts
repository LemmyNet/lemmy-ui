import { IRouteProps, RouteComponentProps } from "inferno-router/dist/Route";
import {
  Communities,
  CommunitiesFetchConfig,
  getCommunitiesQueryParams,
} from "@components/community/communities";
import {
  Community,
  CommunityFetchConfig,
  getCommunityQueryParams,
} from "@components/community/community";
import { CreateCommunity } from "@components/community/create-community";
import {
  AdminSettings,
  AdminSettingsFetchConfig,
} from "@components/home/admin-settings";
import {
  Home,
  HomeFetchConfig,
  getHomeQueryParams,
} from "@components/home/home";
import {
  getInstancesQueryParams,
  Instances,
  InstancesFetchConfig,
} from "@components/home/instances";
import { Legal } from "@components/home/legal";
import {
  Login,
  LoginFetchConfig,
  getLoginQueryParams,
} from "@components/home/login";
import { LoginReset } from "@components/home/login-reset";
import { Setup } from "@components/home/setup";
import { Signup, SignupFetchConfig } from "@components/home/signup";
import {
  Modlog,
  ModlogFetchConfig,
  getModlogQueryParams,
} from "@components/modlog";
import {
  Notifications,
  NotificationsFetchConfig,
} from "@components/person/notifications";
import { PasswordChange } from "@components/person/password-change";
import {
  Profile,
  ProfileFetchConfig,
  getProfileQueryParams,
} from "@components/person/profile";
import {
  getRegistrationApplicationQueryParams,
  RegistrationApplications,
  RegistrationApplicationsFetchConfig,
} from "@components/person/registration-applications";
import { Reports, ReportsFetchConfig } from "@components/person/reports";
import { Settings, SettingsFetchConfig } from "@components/person/settings";
import { VerifyEmail } from "@components/person/verify-email";
import {
  CreatePostFetchConfig,
  CreatePost,
  getCreatePostQueryParams,
} from "@components/post/create-post";
import {
  Post,
  PostFetchConfig,
  getPostQueryParams,
} from "@components/post/post";
import {
  CreatePrivateMessage,
  CreatePrivateMessageFetchConfig,
} from "@components/private_message/create-private-message";
import {
  RemoteFetch,
  RemoteFetchFetchConfig,
  getRemoteFetchQueryParams,
} from "@components/remote-fetch";
import {
  Search,
  SearchFetchConfig,
  getSearchQueryParams,
} from "@components/search";
import { InitialFetchRequest, RouteData } from "@utils/types";
import { GetSiteResponse, MyUserInfo } from "lemmy-js-client";
import { Component } from "inferno";
import {
  OAuthCallback,
  OAuthCallbackConfig,
  getOAuthCallbackQueryParams,
} from "@components/home/oauth/oauth-callback";
import {
  getPendingFollowsQueryParams,
  PendingFollows,
  PendingFollowsFetchConfig,
} from "@components/community/pending-follows";
import { CreateMultiCommunity } from "@components/multi-community/create-multi-community";
import {
  getMultiCommunityQueryParams,
  MultiCommunity,
  MultiCommunityFetchConfig,
} from "@components/multi-community/multi-community";
import {
  getMultiCommunitiesQueryParams,
  MultiCommunities,
  MultiCommunitiesFetchConfig,
} from "@components/multi-community/multi-communities";
import {
  CommunitySettings,
  CommunitySettingsFetchConfig,
} from "@components/community/community-settings";
import {
  MultiCommunitySettings,
  MultiCommunitySettingsFetchConfig,
} from "@components/multi-community/multi-community-settings";

export interface IRoutePropsWithFetch<
  DataT extends RouteData,
  PathPropsT extends Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  QueryPropsT extends Record<string, any>,
> extends IRouteProps {
  fetchInitialData?: (
    req: InitialFetchRequest<PathPropsT, QueryPropsT>,
  ) => Promise<DataT>;
  getQueryParams?: (
    source: string | undefined,
    siteRes: GetSiteResponse,
    myUserInfo?: MyUserInfo,
  ) => QueryPropsT;
  mountedSameRouteNavKey?: string;
  component: typeof Component<
    RouteComponentProps<PathPropsT> & QueryPropsT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >;
  metadata?: (
    data: DataT,
    site?: GetSiteResponse,
    mui?: MyUserInfo,
  ) => Metadata | undefined;
}

export interface Metadata {
  title: string;
  canonicalPath?: string;
  image?: string;
  description?: string;
}

export const routes: IRoutePropsWithFetch<
  RouteData,
  Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>[] = [
  {
    path: `/`,
    component: Home,
    fetchInitialData: Home.fetchInitialData,
    exact: true,
    getQueryParams: getHomeQueryParams,
    mountedSameRouteNavKey: "home",
    metadata: Home.metadata,
  } as HomeFetchConfig,
  {
    path: `/login`,
    component: Login,
    getQueryParams: getLoginQueryParams,
    metadata: Login.metadata,
  } as LoginFetchConfig,
  {
    path: `/login_reset`,
    component: LoginReset,
    metadata: LoginReset.metadata,
  },
  {
    path: `/signup`,
    component: Signup,
    metadata: Signup.metadata,
  } as SignupFetchConfig,
  {
    path: `/create_post`,
    component: CreatePost,
    fetchInitialData: CreatePost.fetchInitialData,
    getQueryParams: getCreatePostQueryParams,
    mountedSameRouteNavKey: "create_post",
  } as CreatePostFetchConfig,
  {
    path: `/create_community`,
    component: CreateCommunity,
    metadata: CreateCommunity.metadata,
  },
  {
    path: `/create_multi_community`,
    component: CreateMultiCommunity,
    metadata: CreateMultiCommunity.metadata,
  },
  {
    path: `/create_private_message/:recipient_id`,
    component: CreatePrivateMessage,
    fetchInitialData: CreatePrivateMessage.fetchInitialData,
    metadata: CreatePrivateMessage.metadata,
  } as CreatePrivateMessageFetchConfig,
  {
    path: `/communities`,
    component: Communities,
    fetchInitialData: Communities.fetchInitialData,
    getQueryParams: getCommunitiesQueryParams,
    mountedSameRouteNavKey: "communities",
    metadata: Communities.metadata,
  } as CommunitiesFetchConfig,
  {
    path: `/multi_communities`,
    component: MultiCommunities,
    fetchInitialData: MultiCommunities.fetchInitialData,
    getQueryParams: getMultiCommunitiesQueryParams,
    mountedSameRouteNavKey: "multi_communities",
    metadata: MultiCommunities.metadata,
  } as MultiCommunitiesFetchConfig,
  {
    // "/comment/:post_id?/:comment_id" would be preferable as direct comment
    // link, but it looks like a Route can't match multiple paths and a
    // component can't stay mounted across routes.
    path: `/post/:post_id/:comment_id?`,
    component: Post,
    fetchInitialData: Post.fetchInitialData,
    getQueryParams: getPostQueryParams,
    mountedSameRouteNavKey: "post",
    metadata: Post.metadata,
  } as PostFetchConfig,
  {
    path: `/comment/:comment_id`,
    component: Post,
    fetchInitialData: Post.fetchInitialData,
    getQueryParams: getPostQueryParams,
    mountedSameRouteNavKey: "post",
  } as PostFetchConfig,
  {
    path: `/c/:name`,
    component: Community,
    fetchInitialData: Community.fetchInitialData,
    getQueryParams: getCommunityQueryParams,
    mountedSameRouteNavKey: "community",
    metadata: Community.metadata,
  } as CommunityFetchConfig,
  {
    path: `/c/:name/settings`,
    component: CommunitySettings,
    fetchInitialData: CommunitySettings.fetchInitialData,
    metadata: CommunitySettings.metadata,
  } as CommunitySettingsFetchConfig,
  {
    path: `/m/:name`,
    component: MultiCommunity,
    fetchInitialData: MultiCommunity.fetchInitialData,
    getQueryParams: getMultiCommunityQueryParams,
    mountedSameRouteNavKey: "multi_community",
    metadata: MultiCommunity.metadata,
  } as MultiCommunityFetchConfig,
  {
    path: `/m/:name/settings`,
    component: MultiCommunitySettings,
    fetchInitialData: MultiCommunitySettings.fetchInitialData,
    metadata: MultiCommunitySettings.metadata,
  } as MultiCommunitySettingsFetchConfig,
  {
    path: `/u/:username`,
    component: Profile,
    fetchInitialData: Profile.fetchInitialData,
    getQueryParams: getProfileQueryParams,
    mountedSameRouteNavKey: "profile",
    metadata: Profile.metadata,
  } as ProfileFetchConfig,
  {
    path: `/notifications`,
    component: Notifications,
    fetchInitialData: Notifications.fetchInitialData,
    metadata: Notifications.metadata,
  } as NotificationsFetchConfig,
  {
    path: `/settings`,
    component: Settings,
    fetchInitialData: Settings.fetchInitialData,
    metadata: Settings.metadata,
  } as SettingsFetchConfig,
  {
    path: `/modlog/:communityId?`,
    component: Modlog,
    fetchInitialData: Modlog.fetchInitialData,
    getQueryParams: getModlogQueryParams,
    mountedSameRouteNavKey: "modlog",
    metadata: Modlog.metadata,
  } as ModlogFetchConfig,
  { path: `/setup`, component: Setup, metadata: Setup.metadata },
  {
    path: `/admin`,
    component: AdminSettings,
    fetchInitialData: AdminSettings.fetchInitialData,
    metadata: AdminSettings.metadata,
  } as AdminSettingsFetchConfig,
  {
    path: `/reports`,
    component: Reports,
    fetchInitialData: Reports.fetchInitialData,
    metadata: Reports.metadata,
  } as ReportsFetchConfig,
  {
    path: `/registration_applications`,
    component: RegistrationApplications,
    fetchInitialData: RegistrationApplications.fetchInitialData,
    getQueryParams: getRegistrationApplicationQueryParams,
    metadata: RegistrationApplications.metadata,
  } as RegistrationApplicationsFetchConfig,
  {
    path: `/pending_follows`,
    component: PendingFollows,
    fetchInitialData: PendingFollows.fetchInitialData,
    getQueryParams: getPendingFollowsQueryParams,
  } as PendingFollowsFetchConfig,
  {
    path: `/search`,
    component: Search,
    fetchInitialData: Search.fetchInitialData,
    getQueryParams: getSearchQueryParams,
    mountedSameRouteNavKey: "search",
    metadata: Search.metadata,
  } as SearchFetchConfig,
  {
    path: `/password_change/:token`,
    component: PasswordChange,
    metadata: PasswordChange.metadata,
  },
  {
    path: `/verify_email/:token`,
    component: VerifyEmail,
    metadata: VerifyEmail.metadata,
  },
  {
    path: `/oauth/callback`,
    getQueryParams: getOAuthCallbackQueryParams,
    component: OAuthCallback,
  } as OAuthCallbackConfig,
  {
    path: `/instances`,
    component: Instances,
    fetchInitialData: Instances.fetchInitialData,
    getQueryParams: getInstancesQueryParams,
    mountedSameRouteNavKey: "instances",
    metadata: Instances.metadata,
  } as InstancesFetchConfig,
  { path: `/legal`, component: Legal, metadata: Legal.metadata },
  {
    path: "/activitypub/externalInteraction",
    component: RemoteFetch,
    fetchInitialData: RemoteFetch.fetchInitialData,
    getQueryParams: getRemoteFetchQueryParams,
    metadata: RemoteFetch.metadata,
  } as RemoteFetchFetchConfig,
];
