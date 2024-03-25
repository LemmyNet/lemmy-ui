import { IRouteProps } from "inferno-router/dist/Route";
import {
  Communities,
  getCommunitiesQueryParams,
} from "./components/community/communities";
import {
  Community,
  getCommunityQueryParams,
} from "./components/community/community";
import { CreateCommunity } from "./components/community/create-community";
import { AdminSettings } from "./components/home/admin-settings";
import { Home, getHomeQueryParams } from "./components/home/home";
import { Instances } from "./components/home/instances";
import { Legal } from "./components/home/legal";
import { Login, getLoginQueryParams } from "./components/home/login";
import { LoginReset } from "./components/home/login-reset";
import { Setup } from "./components/home/setup";
import { Signup } from "./components/home/signup";
import { Modlog, getModlogQueryParams } from "./components/modlog";
import { Inbox } from "./components/person/inbox";
import { PasswordChange } from "./components/person/password-change";
import { Profile, getProfileQueryParams } from "./components/person/profile";
import { RegistrationApplications } from "./components/person/registration-applications";
import { Reports } from "./components/person/reports";
import { Settings } from "./components/person/settings";
import { VerifyEmail } from "./components/person/verify-email";
import {
  CreatePost,
  getCreatePostQueryParams,
} from "./components/post/create-post";
import { Post } from "./components/post/post";
import { CreatePrivateMessage } from "./components/private_message/create-private-message";
import {
  RemoteFetch,
  getRemoteFetchQueryParams,
} from "./components/remote-fetch";
import { Search, getSearchQueryParams } from "./components/search";
import { InitialFetchRequest, RouteData } from "./interfaces";
import { GetSiteResponse } from "lemmy-js-client";

interface IRoutePropsWithFetch<
  T extends RouteData,
  P extends Record<string, string>,
  Q extends Record<string, never>,
> extends IRouteProps {
  fetchInitialData?(req: InitialFetchRequest<P, Q>): Promise<T>;
  getQueryParams?(source: string | undefined, siteRes: GetSiteResponse): Q;
}

export const routes: IRoutePropsWithFetch<
  Record<string, any>,
  Record<string, string>,
  any
>[] = [
  {
    path: `/`,
    component: Home,
    fetchInitialData: Home.fetchInitialData,
    exact: true,
    getQueryParams: getHomeQueryParams,
  },
  {
    path: `/login`,
    component: Login,
    getQueryParams: getLoginQueryParams,
  },
  {
    path: `/login_reset`,
    component: LoginReset,
  },
  {
    path: `/signup`,
    component: Signup,
  },
  {
    path: `/create_post`,
    component: CreatePost,
    fetchInitialData: CreatePost.fetchInitialData,
    getQueryParams: getCreatePostQueryParams,
  },
  {
    path: `/create_community`,
    component: CreateCommunity,
  },
  {
    path: `/create_private_message/:recipient_id`,
    component: CreatePrivateMessage,
    fetchInitialData: CreatePrivateMessage.fetchInitialData,
  },
  {
    path: `/communities`,
    component: Communities,
    fetchInitialData: Communities.fetchInitialData,
    getQueryParams: getCommunitiesQueryParams,
  },
  {
    path: `/post/:post_id`,
    component: Post,
    fetchInitialData: Post.fetchInitialData,
  },
  {
    path: `/comment/:comment_id`,
    component: Post,
    fetchInitialData: Post.fetchInitialData,
  },
  {
    path: `/c/:name`,
    component: Community,
    fetchInitialData: Community.fetchInitialData,
    getQueryParams: getCommunityQueryParams,
  },
  {
    path: `/u/:username`,
    component: Profile,
    fetchInitialData: Profile.fetchInitialData,
    getQueryParams: getProfileQueryParams,
  },
  {
    path: `/inbox`,
    component: Inbox,
    fetchInitialData: Inbox.fetchInitialData,
  },
  {
    path: `/settings`,
    component: Settings,
    fetchInitialData: Settings.fetchInitialData,
  },
  {
    path: `/modlog/:communityId`,
    component: Modlog,
    fetchInitialData: Modlog.fetchInitialData,
    getQueryParams: getModlogQueryParams,
  },
  {
    path: `/modlog`,
    component: Modlog,
    fetchInitialData: Modlog.fetchInitialData,
    getQueryParams: getModlogQueryParams,
  },
  { path: `/setup`, component: Setup },
  {
    path: `/admin`,
    component: AdminSettings,
    fetchInitialData: AdminSettings.fetchInitialData,
  },
  {
    path: `/reports`,
    component: Reports,
    fetchInitialData: Reports.fetchInitialData,
  },
  {
    path: `/registration_applications`,
    component: RegistrationApplications,
    fetchInitialData: RegistrationApplications.fetchInitialData,
  },
  {
    path: `/search`,
    component: Search,
    fetchInitialData: Search.fetchInitialData,
    getQueryParams: getSearchQueryParams,
  },
  {
    path: `/password_change/:token`,
    component: PasswordChange,
  },
  {
    path: `/verify_email/:token`,
    component: VerifyEmail,
  },
  {
    path: `/instances`,
    component: Instances,
    fetchInitialData: Instances.fetchInitialData,
  },
  { path: `/legal`, component: Legal },
  {
    path: "/activitypub/externalInteraction",
    component: RemoteFetch,
    fetchInitialData: RemoteFetch.fetchInitialData,
    getQueryParams: getRemoteFetchQueryParams,
  },
];
