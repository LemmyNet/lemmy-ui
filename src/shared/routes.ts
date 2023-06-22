import { InitialFetchRequest, RouteData } from "@utils/types";
import { IRouteProps } from "inferno-router/dist/Route";
import { Communities } from "./components/community/communities";
import { Community } from "./components/community/community";
import { CreateCommunity } from "./components/community/create-community";
import { AdminSettings } from "./components/home/admin-settings";
import { Home } from "./components/home/home";
import { Instances } from "./components/home/instances";
import { Legal } from "./components/home/legal";
import { Login } from "./components/home/login";
import { Setup } from "./components/home/setup";
import { Signup } from "./components/home/signup";
import { Modlog } from "./components/modlog";
import { Inbox } from "./components/person/inbox";
import { PasswordChange } from "./components/person/password-change";
import { Profile } from "./components/person/profile";
import { RegistrationApplications } from "./components/person/registration-applications";
import { Reports } from "./components/person/reports";
import { Settings } from "./components/person/settings";
import { VerifyEmail } from "./components/person/verify-email";
import { CreatePost } from "./components/post/create-post";
import { Post } from "./components/post/post";
import { CreatePrivateMessage } from "./components/private_message/create-private-message";
import { Search } from "./components/search";

interface IRoutePropsWithFetch<T extends RouteData> extends IRouteProps {
  fetchInitialData?(req: InitialFetchRequest): Promise<T>;
}

export const routes: IRoutePropsWithFetch<Record<string, any>>[] = [
  {
    path: `/`,
    component: Home,
    fetchInitialData: Home.fetchInitialData,
    exact: true,
  },
  {
    path: `/login`,
    component: Login,
  },
  {
    path: `/signup`,
    component: Signup,
  },
  {
    path: `/create_post`,
    component: CreatePost,
    fetchInitialData: CreatePost.fetchInitialData,
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
  },
  {
    path: `/u/:username`,
    component: Profile,
    fetchInitialData: Profile.fetchInitialData,
  },
  {
    path: `/inbox`,
    component: Inbox,
    fetchInitialData: Inbox.fetchInitialData,
  },
  {
    path: `/settings`,
    component: Settings,
  },
  {
    path: `/modlog/:communityId`,
    component: Modlog,
    fetchInitialData: Modlog.fetchInitialData,
  },
  {
    path: `/modlog`,
    component: Modlog,
    fetchInitialData: Modlog.fetchInitialData,
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
];
