import { IRouteProps } from "inferno-router/dist/Route";
import { Main } from "./components/main";
import { Login } from "./components/login";
import { CreatePost } from "./components/create-post";
import { CreateCommunity } from "./components/create-community";
import { CreatePrivateMessage } from "./components/create-private-message";
import { PasswordChange } from "./components/password_change";
import { Post } from "./components/post";
import { Community } from "./components/community";
import { Communities } from "./components/communities";
import { Person } from "./components/person";
import { Modlog } from "./components/modlog";
import { Setup } from "./components/setup";
import { AdminSettings } from "./components/admin-settings";
import { Inbox } from "./components/inbox";
import { Search } from "./components/search";
import { Instances } from "./components/instances";
import { InitialFetchRequest } from "./interfaces";

interface IRoutePropsWithFetch extends IRouteProps {
  fetchInitialData?(req: InitialFetchRequest): Promise<any>[];
}

export const routes: IRoutePropsWithFetch[] = [
  {
    path: `/`,
    exact: true,
    component: Main,
    fetchInitialData: req => Main.fetchInitialData(req),
  },
  {
    path: `/home/data_type/:data_type/listing_type/:listing_type/sort/:sort/page/:page`,
    component: Main,
    fetchInitialData: req => Main.fetchInitialData(req),
  },
  {
    path: `/login`,
    component: Login,
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
    path: `/communities/page/:page`,
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
    path: `/community/:id/data_type/:data_type/sort/:sort/page/:page`,
    component: Community,
    fetchInitialData: req => Community.fetchInitialData(req),
  },
  {
    path: `/community/:id`,
    component: Community,
    fetchInitialData: req => Community.fetchInitialData(req),
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
    component: Person,
    fetchInitialData: req => Person.fetchInitialData(req),
  },
  {
    path: `/user/:id/view/:view/sort/:sort/page/:page`,
    component: Person,
    fetchInitialData: req => Person.fetchInitialData(req),
  },
  {
    path: `/user/:id`,
    component: Person,
    fetchInitialData: req => Person.fetchInitialData(req),
  },
  {
    path: `/u/:username`,
    component: Person,
    fetchInitialData: req => Person.fetchInitialData(req),
  },
  {
    path: `/inbox`,
    component: Inbox,
    fetchInitialData: req => Inbox.fetchInitialData(req),
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
    path: `/search/q/:q/type/:type/sort/:sort/listing_type/:listing_type/page/:page`,
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
