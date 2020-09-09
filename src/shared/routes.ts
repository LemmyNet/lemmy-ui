import { IRouteProps } from 'inferno-router/dist/Route';
import { Main } from './components/main';
import { Login } from './components/login';
import { CreatePost } from './components/create-post';
import { CreateCommunity } from './components/create-community';
import { CreatePrivateMessage } from './components/create-private-message';
import { PasswordChange } from './components/password_change';
import { Post } from './components/post';
import { Community } from './components/community';
import { Communities } from './components/communities';
import { User } from './components/user';
import { Modlog } from './components/modlog';
import { Setup } from './components/setup';
import { AdminSettings } from './components/admin-settings';
import { Inbox } from './components/inbox';
import { Search } from './components/search';
import { Sponsors } from './components/sponsors';
import { Instances } from './components/instances';

interface IRoutePropsWithFetch extends IRouteProps {
  fetchInitialData?(auth: string, path: string): Promise<any>[];
}

export const routes: IRoutePropsWithFetch[] = [
  {
    path: `/`,
    exact: true,
    component: Main,
    fetchInitialData: (auth, path) => Main.fetchInitialData(auth, path),
  },
  {
    path: `/home/data_type/:data_type/listing_type/:listing_type/sort/:sort/page/:page`,
    component: Main,
    fetchInitialData: (auth, path) => Main.fetchInitialData(auth, path),
  },
  { path: `/login`, component: Login },
  {
    path: `/create_post`,
    component: CreatePost,
    fetchInitialData: (auth, path) => CreatePost.fetchInitialData(auth, path),
  },
  {
    path: `/create_community`,
    component: CreateCommunity,
    fetchInitialData: (auth, path) =>
      CreateCommunity.fetchInitialData(auth, path),
  },
  {
    path: `/create_private_message/recipient/:recipient_id`,
    component: CreatePrivateMessage,
    fetchInitialData: (auth, path) =>
      CreatePrivateMessage.fetchInitialData(auth, path),
  },
  {
    path: `/communities/page/:page`,
    component: Communities,
    fetchInitialData: (auth, path) => Communities.fetchInitialData(auth, path),
  },
  {
    path: `/communities`,
    component: Communities,
    fetchInitialData: (auth, path) => Communities.fetchInitialData(auth, path),
  },
  {
    path: `/post/:id/comment/:comment_id`,
    component: Post,
    fetchInitialData: (auth, path) => Post.fetchInitialData(auth, path),
  },
  {
    path: `/post/:id`,
    component: Post,
    fetchInitialData: (auth, path) => Post.fetchInitialData(auth, path),
  },
  {
    path: `/c/:name/data_type/:data_type/sort/:sort/page/:page`,
    component: Community,
    fetchInitialData: (auth, path) => Community.fetchInitialData(auth, path),
  },
  {
    path: `/community/:id`,
    component: Community,
    fetchInitialData: (auth, path) => Community.fetchInitialData(auth, path),
  },
  {
    path: `/c/:name`,
    component: Community,
    fetchInitialData: (auth, path) => Community.fetchInitialData(auth, path),
  },
  {
    path: `/u/:username/view/:view/sort/:sort/page/:page`,
    component: User,
    fetchInitialData: (auth, path) => User.fetchInitialData(auth, path),
  },
  {
    path: `/user/:id`,
    component: User,
    fetchInitialData: (auth, path) => User.fetchInitialData(auth, path),
  },
  {
    path: `/u/:username`,
    component: User,
    fetchInitialData: (auth, path) => User.fetchInitialData(auth, path),
  },
  {
    path: `/inbox`,
    component: Inbox,
    fetchInitialData: (auth, path) => Inbox.fetchInitialData(auth, path),
  },
  {
    path: `/modlog/community/:community_id`,
    component: Modlog,
  },
  { path: `/modlog`, component: Modlog },
  { path: `/setup`, component: Setup },
  { path: `/admin`, component: AdminSettings },
  {
    path: `/search/q/:q/type/:type/sort/:sort/page/:page`,
    component: Search,
  },
  { path: `/search`, component: Search },
  { path: `/sponsors`, component: Sponsors },
  {
    path: `/password_change/:token`,
    component: PasswordChange,
  },
  { path: `/instances`, component: Instances },
];
