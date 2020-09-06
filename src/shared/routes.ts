import { BrowserRouter, Route, Switch } from 'inferno-router';
import { IRouteProps } from 'inferno-router/dist/Route';
import { Main } from './components/main';
import { Navbar } from './components/navbar';
import { Footer } from './components/footer';
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

export const routes: IRouteProps[] = [
  { exact: true, path: `/`, component: Main },
  {
    path: `/home/data_type/:data_type/listing_type/:listing_type/sort/:sort/page/:page`,
    component: Main,
  },
  { path: `/login`, component: Login },
  { path: `/create_post`, component: CreatePost },
  { path: `/create_community`, component: CreateCommunity },
  {
    path: `/create_private_message`,
    component: CreatePrivateMessage,
  },
  {
    path: `/communities/page/:page`,
    component: Communities,
  },
  { path: `/communities`, component: Communities },
  {
    path: `/post/:id/comment/:comment_id`,
    component: Post,
  },
  { path: `/post/:id`, component: Post },
  {
    path: `/c/:name/data_type/:data_type/sort/:sort/page/:page`,
    component: Community,
  },
  { path: `/community/:id`, component: Community },
  { path: `/c/:name`, component: Community },
  {
    path: `/u/:username/view/:view/sort/:sort/page/:page`,
    component: User,
  },
  { path: `/user/:id`, component: User },
  { path: `/u/:username`, component: User },
  { path: `/inbox`, component: Inbox },
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
