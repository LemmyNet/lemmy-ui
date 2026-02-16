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
    any
  >;
}

export const routes: IRoutePropsWithFetch<RouteData, any, any>[] = [
  {
    path: `/`,
    component: Home,
    fetchInitialData: Home.fetchInitialData,
    exact: true,
    getQueryParams: getHomeQueryParams,
    mountedSameRouteNavKey: "home",
  } as HomeFetchConfig,
  {
    path: `/login`,
    component: Login,
    getQueryParams: getLoginQueryParams,
  } as LoginFetchConfig,
  {
    path: `/login_reset`,
    component: LoginReset,
  },
  {
    path: `/signup`,
    component: Signup,
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
  },
  {
    path: `/create_multi_community`,
    component: CreateMultiCommunity,
  },
  {
    path: `/create_private_message/:recipient_id`,
    component: CreatePrivateMessage,
    fetchInitialData: CreatePrivateMessage.fetchInitialData,
  } as CreatePrivateMessageFetchConfig,
  {
    path: `/communities`,
    component: Communities,
    fetchInitialData: Communities.fetchInitialData,
    getQueryParams: getCommunitiesQueryParams,
    mountedSameRouteNavKey: "communities",
  } as CommunitiesFetchConfig,
  {
    path: `/multi_communities`,
    component: MultiCommunities,
    fetchInitialData: MultiCommunities.fetchInitialData,
    getQueryParams: getMultiCommunitiesQueryParams,
    mountedSameRouteNavKey: "multi_communities",
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
  } as CommunityFetchConfig,
  {
    path: `/c/:name/settings`,
    component: CommunitySettings,
    fetchInitialData: CommunitySettings.fetchInitialData,
  } as CommunitySettingsFetchConfig,
  {
    path: `/m/:name`,
    component: MultiCommunity,
    fetchInitialData: MultiCommunity.fetchInitialData,
    getQueryParams: getMultiCommunityQueryParams,
    mountedSameRouteNavKey: "multi_community",
  } as MultiCommunityFetchConfig,
  {
    path: `/m/:name/settings`,
    component: MultiCommunitySettings,
    fetchInitialData: MultiCommunitySettings.fetchInitialData,
  } as MultiCommunitySettingsFetchConfig,
  {
    path: `/u/:username`,
    component: Profile,
    fetchInitialData: Profile.fetchInitialData,
    getQueryParams: getProfileQueryParams,
    mountedSameRouteNavKey: "profile",
  } as ProfileFetchConfig,
  {
    path: `/notifications`,
    component: Notifications,
    fetchInitialData: Notifications.fetchInitialData,
  } as NotificationsFetchConfig,
  {
    path: `/settings`,
    component: Settings,
    fetchInitialData: Settings.fetchInitialData,
  } as SettingsFetchConfig,
  {
    path: `/modlog/:communityId?`,
    component: Modlog,
    fetchInitialData: Modlog.fetchInitialData,
    getQueryParams: getModlogQueryParams,
    mountedSameRouteNavKey: "modlog",
  } as ModlogFetchConfig,
  { path: `/setup`, component: Setup },
  {
    path: `/admin`,
    component: AdminSettings,
    fetchInitialData: AdminSettings.fetchInitialData,
  } as AdminSettingsFetchConfig,
  {
    path: `/reports`,
    component: Reports,
    fetchInitialData: Reports.fetchInitialData,
  } as ReportsFetchConfig,
  {
    path: `/registration_applications`,
    component: RegistrationApplications,
    fetchInitialData: RegistrationApplications.fetchInitialData,
    getQueryParams: getRegistrationApplicationQueryParams,
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
  } as SearchFetchConfig,
  {
    path: `/password_change/:token`,
    component: PasswordChange,
  },
  {
    path: `/verify_email/:token`,
    component: VerifyEmail,
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
  } as InstancesFetchConfig,
  { path: `/legal`, component: Legal },
  {
    path: "/activitypub/externalInteraction",
    component: RemoteFetch,
    fetchInitialData: RemoteFetch.fetchInitialData,
    getQueryParams: getRemoteFetchQueryParams,
  } as RemoteFetchFetchConfig,
];
