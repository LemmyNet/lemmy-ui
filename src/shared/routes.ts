import { IRouteProps } from "inferno-router/dist/Route";
import { Communities } from "./components/community/communities";
import { Community } from "./components/community/community";
import { CreateCommunity } from "./components/community/create-community";
import { AdminSettings } from "./components/home/admin-settings";
import { Home } from "./components/home/home";
import { Instances } from "./components/home/instances";
import { Login } from "./components/home/login";
import { PasswordChange } from "./components/home/password-change";
import { Setup } from "./components/home/setup";
import { Signup } from "./components/home/signup";
import { Modlog } from "./components/modlog";
import { Inbox } from "./components/person/inbox";
import { Profile } from "./components/person/profile";
import { RegistrationApplications } from "./components/person/registration-applications";
import { Reports } from "./components/person/reports";
import { Settings } from "./components/person/settings";
import { CreatePost } from "./components/post/create-post";
import { Post } from "./components/post/post";
import { CreatePrivateMessage } from "./components/private_message/create-private-message";
import { Search } from "./components/search";
import { InitialFetchRequest } from "./interfaces";

interface IRoutePropsWithFetch extends IRouteProps {
  fetchInitialData?(req: InitialFetchRequest): Promise<any>[];
}

export const routes: IRoutePropsWithFetch[] = [
  {
    path: `/`,
    exact: true,
    component: Home,
    fetchInitialData: req => Home.fetchInitialData(req),
  },
  {
    path: `/home/data_type/:data_type/listing_type/:listing_type/sort/:sort/page/:page`,
    component: Home,
    fetchInitialData: req => Home.fetchInitialData(req),
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
    fetchInitialData: req => CreatePost.fetchInitialData(req),
  },
  {
    path: `/create_community`,
    component: CreateCommunity,
  },
  {
    path: `/create_private_message/recipient/:recipient_id`,
    component: CreatePrivateMessage,
    fetchInitialData: req => CreatePrivateMessage.fetchInitialData(req),
  },
  {
    path: `/communities/listing_type/:listing_type/page/:page`,
    component: Communities,
    fetchInitialData: req => Communities.fetchInitialData(req),
  },
  {
    path: `/communities`,
    component: Communities,
    fetchInitialData: req => Communities.fetchInitialData(req),
  },
  {
    path: `/post/:id/comment/:comment_id`,
    component: Post,
    fetchInitialData: req => Post.fetchInitialData(req),
  },
  {
    path: `/post/:id`,
    component: Post,
    fetchInitialData: req => Post.fetchInitialData(req),
  },
  {
    path: `/c/:name/data_type/:data_type/sort/:sort/page/:page`,
    component: Community,
    fetchInitialData: req => Community.fetchInitialData(req),
  },
  {
    path: `/c/:name`,
    component: Community,
    fetchInitialData: req => Community.fetchInitialData(req),
  },
  {
    path: `/u/:username/view/:view/sort/:sort/page/:page`,
    component: Profile,
    fetchInitialData: req => Profile.fetchInitialData(req),
  },
  {
    path: `/u/:username`,
    component: Profile,
    fetchInitialData: req => Profile.fetchInitialData(req),
  },
  {
    path: `/inbox`,
    component: Inbox,
    fetchInitialData: req => Inbox.fetchInitialData(req),
  },
  {
    path: `/settings`,
    component: Settings,
  },
  {
    path: `/modlog/community/:community_id`,
    component: Modlog,
    fetchInitialData: req => Modlog.fetchInitialData(req),
  },
  {
    path: `/modlog`,
    component: Modlog,
    fetchInitialData: req => Modlog.fetchInitialData(req),
  },
  { path: `/setup`, component: Setup },
  {
    path: `/admin`,
    component: AdminSettings,
    fetchInitialData: req => AdminSettings.fetchInitialData(req),
  },
  {
    path: `/reports`,
    component: Reports,
    fetchInitialData: req => Reports.fetchInitialData(req),
  },
  {
    path: `/registration_applications`,
    component: RegistrationApplications,
    fetchInitialData: req => RegistrationApplications.fetchInitialData(req),
  },
  {
    path: `/search/q/:q/type/:type/sort/:sort/listing_type/:listing_type/community_id/:community_id/creator_id/:creator_id/page/:page`,
    component: Search,
    fetchInitialData: req => Search.fetchInitialData(req),
  },
  {
    path: `/search`,
    component: Search,
    fetchInitialData: req => Search.fetchInitialData(req),
  },
  {
    path: `/password_change/:token`,
    component: PasswordChange,
  },
  { path: `/instances`, component: Instances },
];
