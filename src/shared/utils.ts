import 'moment/locale/es';
import 'moment/locale/el';
import 'moment/locale/eu';
import 'moment/locale/eo';
import 'moment/locale/de';
import 'moment/locale/zh-cn';
import 'moment/locale/fr';
import 'moment/locale/sv';
import 'moment/locale/ru';
import 'moment/locale/nl';
import 'moment/locale/it';
import 'moment/locale/fi';
import 'moment/locale/ca';
import 'moment/locale/fa';
import 'moment/locale/pl';
import 'moment/locale/pt-br';
import 'moment/locale/ja';
import 'moment/locale/ka';
import 'moment/locale/hi';
import 'moment/locale/gl';
import 'moment/locale/tr';
import 'moment/locale/hu';
import 'moment/locale/uk';
import 'moment/locale/sq';
import 'moment/locale/km';
import 'moment/locale/ga';
import 'moment/locale/sr';
import 'moment/locale/ko';
import 'moment/locale/da';
import 'moment/locale/hr';

import {
  UserOperation,
  CommentView,
  UserSafeSettings,
  SortType,
  ListingType,
  SearchType,
  WebSocketResponse,
  WebSocketJsonResponse,
  Search,
  SearchResponse,
  PostView,
  PrivateMessageView,
  LemmyWebsocket,
  UserViewSafe,
  CommunityView,
} from 'lemmy-js-client';

import {
  CommentSortType,
  DataType,
  IsoData,
  CommentNode as CommentNodeI,
} from './interfaces';
import { UserService, WebSocketService } from './services';

var Tribute: any;
if (isBrowser()) {
  Tribute = require('tributejs');
}
import markdown_it from 'markdown-it';
import markdown_it_sub from 'markdown-it-sub';
import markdown_it_sup from 'markdown-it-sup';
import markdownitEmoji from 'markdown-it-emoji/light';
import markdown_it_container from 'markdown-it-container';
import emojiShortName from 'emoji-short-name';
import Toastify from 'toastify-js';
import tippy from 'tippy.js';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { retryWhen, delay, take } from 'rxjs/operators';
import { i18n } from './i18next';

export const wsClient = new LemmyWebsocket();

export const favIconUrl = '/static/assets/favicon.svg';
export const favIconPngUrl = '/static/assets/apple-touch-icon.png';
// TODO
// export const defaultFavIcon = `${window.location.protocol}//${window.location.host}${favIconPngUrl}`;
export const repoUrl = 'https://github.com/LemmyNet';
export const joinLemmyUrl = 'https://join.lemmy.ml';
export const supportLemmyUrl = 'https://join.lemmy.ml/sponsors';
export const docsUrl = 'https://join.lemmy.ml/docs/en/index.html';
export const helpGuideUrl = 'https://join.lemmy.ml/docs/en/about/guide.html'; // TODO find a way to redirect to the non-en folder
export const markdownHelpUrl = `${helpGuideUrl}#markdown-guide`;
export const sortingHelpUrl = `${helpGuideUrl}#sorting`;
export const archiveUrl = 'https://archive.is';
export const elementUrl = 'https://element.io/';

export const postRefetchSeconds: number = 60 * 1000;
export const fetchLimit: number = 20;
export const mentionDropdownFetchLimit = 10;

export const languages = [
  { code: 'ca', name: 'Català' },
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'eu', name: 'Euskara' },
  { code: 'eo', name: 'Esperanto' },
  { code: 'es', name: 'Español' },
  { code: 'da', name: 'Dansk' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ga', name: 'Gaeilge' },
  { code: 'gl', name: 'Galego' },
  { code: 'hr', name: 'hrvatski' },
  { code: 'hu', name: 'Magyar Nyelv' },
  { code: 'ka', name: 'ქართული ენა' },
  { code: 'ko', name: '한국어' },
  { code: 'km', name: 'ភាសាខ្មែរ' },
  { code: 'hi', name: 'मानक हिन्दी' },
  { code: 'fa', name: 'فارسی' },
  { code: 'ja', name: '日本語' },
  { code: 'oc', name: 'Occitan' },
  { code: 'pl', name: 'Polski' },
  { code: 'pt_BR', name: 'Português Brasileiro' },
  { code: 'zh', name: '中文' },
  { code: 'fi', name: 'Suomi' },
  { code: 'fr', name: 'Français' },
  { code: 'sv', name: 'Svenska' },
  { code: 'sq', name: 'Shqip' },
  { code: 'sr_Latn', name: 'srpski' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'uk', name: 'Українська Mова' },
  { code: 'ru', name: 'Русский' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'it', name: 'Italiano' },
];

export const themes = [
  'litera',
  'materia',
  'minty',
  'solar',
  'united',
  'cyborg',
  'darkly',
  'journal',
  'sketchy',
  'vaporwave',
  'vaporwave-dark',
  'i386',
  'litely',
];

const DEFAULT_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function getRandomCharFromAlphabet(alphabet: string): string {
  return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
}

export function randomStr(
  idDesiredLength: number = 20,
  alphabet = DEFAULT_ALPHABET
): string {
  /**
   * Create n-long array and map it to random chars from given alphabet.
   * Then join individual chars as string
   */
  return Array.from({ length: idDesiredLength })
    .map(() => {
      return getRandomCharFromAlphabet(alphabet);
    })
    .join('');
}

export function wsJsonToRes<ResponseType>(
  msg: WebSocketJsonResponse<ResponseType>
): WebSocketResponse<ResponseType> {
  return {
    op: wsUserOp(msg),
    data: msg.data,
  };
}

export function wsUserOp(msg: any): UserOperation {
  let opStr: string = msg.op;
  return UserOperation[opStr];
}

export const md = new markdown_it({
  html: false,
  linkify: true,
  typographer: true,
})
  .use(markdown_it_sub)
  .use(markdown_it_sup)
  .use(markdown_it_container, 'spoiler', {
    validate: function (params: any) {
      return params.trim().match(/^spoiler\s+(.*)$/);
    },

    render: function (tokens: any, idx: any) {
      var m = tokens[idx].info.trim().match(/^spoiler\s+(.*)$/);

      if (tokens[idx].nesting === 1) {
        // opening tag
        return `<details><summary> ${md.utils.escapeHtml(m[1])} </summary>\n`;
      } else {
        // closing tag
        return '</details>\n';
      }
    },
  })
  .use(markdownitEmoji, {
    defs: objectFlip(emojiShortName),
  });

export function hotRankComment(comment_view: CommentView): number {
  return hotRank(comment_view.counts.score, comment_view.comment.published);
}

export function hotRankActivePost(post_view: PostView): number {
  return hotRank(post_view.counts.score, post_view.counts.newest_comment_time);
}

export function hotRankPost(post_view: PostView): number {
  return hotRank(post_view.counts.score, post_view.post.published);
}

export function hotRank(score: number, timeStr: string): number {
  // Rank = ScaleFactor * sign(Score) * log(1 + abs(Score)) / (Time + 2)^Gravity
  let date: Date = new Date(timeStr + 'Z'); // Add Z to convert from UTC date
  let now: Date = new Date();
  let hoursElapsed: number = (now.getTime() - date.getTime()) / 36e5;

  let rank =
    (10000 * Math.log10(Math.max(1, 3 + score))) /
    Math.pow(hoursElapsed + 2, 1.8);

  // console.log(`Comment: ${comment.content}\nRank: ${rank}\nScore: ${comment.score}\nHours: ${hoursElapsed}`);

  return rank;
}

export function mdToHtml(text: string) {
  return { __html: md.render(text) };
}

export function getUnixTime(text: string): number {
  return text ? new Date(text).getTime() / 1000 : undefined;
}

export function canMod(
  user: UserSafeSettings,
  modIds: number[],
  creator_id: number,
  onSelf: boolean = false
): boolean {
  // You can do moderator actions only on the mods added after you.
  if (user) {
    let yourIndex = modIds.findIndex(id => id == user.id);
    if (yourIndex == -1) {
      return false;
    } else {
      // onSelf +1 on mod actions not for yourself, IE ban, remove, etc
      modIds = modIds.slice(0, yourIndex + (onSelf ? 0 : 1));
      return !modIds.includes(creator_id);
    }
  } else {
    return false;
  }
}

export function isMod(modIds: number[], creator_id: number): boolean {
  return modIds.includes(creator_id);
}

const imageRegex = new RegExp(
  /(http)?s?:?(\/\/[^"']*\.(?:jpg|jpeg|gif|png|svg|webp))/
);
const videoRegex = new RegExp(`(http)?s?:?(\/\/[^"']*\.(?:mp4))`);

export function isImage(url: string) {
  return imageRegex.test(url);
}

export function isVideo(url: string) {
  return videoRegex.test(url);
}

export function validURL(str: string) {
  return !!new URL(str);
}

export function communityRSSUrl(actorId: string, sort: string): string {
  let url = new URL(actorId);
  return `${url.origin}/feeds${url.pathname}.xml?sort=${sort}`;
}

export function validEmail(email: string) {
  let re = /^(([^\s"(),.:;<>@[\\\]]+(\.[^\s"(),.:;<>@[\\\]]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([\dA-Za-z\-]+\.)+[A-Za-z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function routeSortTypeToEnum(sort: string): SortType {
  return SortType[sort];
}

export function listingTypeFromNum(type_: number): ListingType {
  return Object.values(ListingType)[type_];
}

export function sortTypeFromNum(type_: number): SortType {
  return Object.values(SortType)[type_];
}

export function routeListingTypeToEnum(type: string): ListingType {
  return ListingType[type];
}

export function routeDataTypeToEnum(type: string): DataType {
  return DataType[capitalizeFirstLetter(type)];
}

export function routeSearchTypeToEnum(type: string): SearchType {
  return SearchType[type];
}

export async function getPageTitle(url: string) {
  let res = await fetch(`/iframely/oembed?url=${url}`).then(res => res.json());
  let title = await res.title;
  return title;
}

export function debounce(
  func: any,
  wait: number = 1000,
  immediate: boolean = false
) {
  // 'private' variable for instance
  // The returned function will be able to reference this due to closure.
  // Each call to the returned function will share this common timer.
  let timeout: any;

  // Calling debounce returns a new anonymous function
  return function () {
    // reference the context and args for the setTimeout function
    var context = this,
      args = arguments;

    // Should the function be called now? If immediate is true
    //   and not already in a timeout then the answer is: Yes
    var callNow = immediate && !timeout;

    // This is the basic debounce behaviour where you can call this
    //   function several times, but it will only execute once
    //   [before or after imposing a delay].
    //   Each time the returned function is called, the timer starts over.
    clearTimeout(timeout);

    // Set the new timeout
    timeout = setTimeout(function () {
      // Inside the timeout function, clear the timeout variable
      // which will let the next execution run when in 'immediate' mode
      timeout = null;

      // Check if the function already ran with the immediate flag
      if (!immediate) {
        // Call the original function with apply
        // apply lets you define the 'this' object as well as the arguments
        //    (both captured before setTimeout)
        func.apply(context, args);
      }
    }, wait);

    // Immediate mode and no wait timer? Execute the function..
    if (callNow) func.apply(context, args);
  };
}

// TODO
export function getLanguage(override?: string): string {
  let user = UserService.Instance.user;
  let lang = override || (user && user.lang ? user.lang : 'browser');

  if (lang == 'browser' && isBrowser()) {
    return getBrowserLanguage();
  } else {
    return lang;
  }
}

// TODO
export function getBrowserLanguage(): string {
  return navigator.language;
}

export function getMomentLanguage(): string {
  let lang = getLanguage();
  if (lang.startsWith('zh')) {
    lang = 'zh-cn';
  } else if (lang.startsWith('sv')) {
    lang = 'sv';
  } else if (lang.startsWith('fr')) {
    lang = 'fr';
  } else if (lang.startsWith('de')) {
    lang = 'de';
  } else if (lang.startsWith('ru')) {
    lang = 'ru';
  } else if (lang.startsWith('es')) {
    lang = 'es';
  } else if (lang.startsWith('eo')) {
    lang = 'eo';
  } else if (lang.startsWith('nl')) {
    lang = 'nl';
  } else if (lang.startsWith('it')) {
    lang = 'it';
  } else if (lang.startsWith('fi')) {
    lang = 'fi';
  } else if (lang.startsWith('ca')) {
    lang = 'ca';
  } else if (lang.startsWith('fa')) {
    lang = 'fa';
  } else if (lang.startsWith('pl')) {
    lang = 'pl';
  } else if (lang.startsWith('pt')) {
    lang = 'pt-br';
  } else if (lang.startsWith('ja')) {
    lang = 'ja';
  } else if (lang.startsWith('ka')) {
    lang = 'ka';
  } else if (lang.startsWith('hi')) {
    lang = 'hi';
  } else if (lang.startsWith('el')) {
    lang = 'el';
  } else if (lang.startsWith('eu')) {
    lang = 'eu';
  } else if (lang.startsWith('gl')) {
    lang = 'gl';
  } else if (lang.startsWith('tr')) {
    lang = 'tr';
  } else if (lang.startsWith('hu')) {
    lang = 'hu';
  } else if (lang.startsWith('uk')) {
    lang = 'uk';
  } else if (lang.startsWith('sq')) {
    lang = 'sq';
  } else if (lang.startsWith('km')) {
    lang = 'km';
  } else if (lang.startsWith('ga')) {
    lang = 'ga';
  } else if (lang.startsWith('sr')) {
    lang = 'sr';
  } else if (lang.startsWith('ko')) {
    lang = 'ko';
  } else if (lang.startsWith('da')) {
    lang = 'da';
  } else if (lang.startsWith('oc')) {
    lang = 'oc';
  } else if (lang.startsWith('hr')) {
    lang = 'hr';
  } else {
    lang = 'en';
  }
  return lang;
}

export function setTheme(theme: string, forceReload: boolean = false) {
  if (!isBrowser()) {
    return;
  }
  if (theme === 'browser' && !forceReload) {
    return;
  }
  // This is only run on a force reload
  if (theme == 'browser') {
    theme = 'darkly';
  }

  // Unload all the other themes
  for (var i = 0; i < themes.length; i++) {
    let styleSheet = document.getElementById(themes[i]);
    if (styleSheet) {
      styleSheet.setAttribute('disabled', 'disabled');
    }
  }

  document
    .getElementById('default-light')
    ?.setAttribute('disabled', 'disabled');
  document.getElementById('default-dark')?.setAttribute('disabled', 'disabled');

  // Load the theme dynamically
  let cssLoc = `/static/assets/css/themes/${theme}.min.css`;
  loadCss(theme, cssLoc);
  document.getElementById(theme).removeAttribute('disabled');
}

export function loadCss(id: string, loc: string) {
  if (!document.getElementById(id)) {
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = loc;
    link.media = 'all';
    head.appendChild(link);
  }
}

export function objectFlip(obj: any) {
  const ret = {};
  Object.keys(obj).forEach(key => {
    ret[obj[key]] = key;
  });
  return ret;
}

export function showAvatars(): boolean {
  return (
    (UserService.Instance.user && UserService.Instance.user.show_avatars) ||
    !UserService.Instance.user
  );
}

export function isCakeDay(published: string): boolean {
  // moment(undefined) or moment.utc(undefined) returns the current date/time
  // moment(null) or moment.utc(null) returns null
  const userCreationDate = moment.utc(published || null).local();
  const currentDate = moment(new Date());

  return (
    userCreationDate.date() === currentDate.date() &&
    userCreationDate.month() === currentDate.month() &&
    userCreationDate.year() !== currentDate.year()
  );
}

export function toast(text: string, background: string = 'success') {
  if (isBrowser()) {
    let backgroundColor = `var(--${background})`;
    Toastify({
      text: text,
      backgroundColor: backgroundColor,
      gravity: 'bottom',
      position: 'left',
    }).showToast();
  }
}

export function pictrsDeleteToast(
  clickToDeleteText: string,
  deletePictureText: string,
  deleteUrl: string
) {
  if (isBrowser()) {
    let backgroundColor = `var(--light)`;
    let toast = Toastify({
      text: clickToDeleteText,
      backgroundColor: backgroundColor,
      gravity: 'top',
      position: 'right',
      duration: 10000,
      onClick: () => {
        if (toast) {
          window.location.replace(deleteUrl);
          alert(deletePictureText);
          toast.hideToast();
        }
      },
      close: true,
    }).showToast();
  }
}

interface NotifyInfo {
  name: string;
  icon?: string;
  link: string;
  body: string;
}

export function messageToastify(info: NotifyInfo, router: any) {
  if (isBrowser()) {
    let htmlBody = info.body ? md.render(info.body) : '';
    let backgroundColor = `var(--light)`;

    let toast = Toastify({
      text: `${htmlBody}<br />${info.name}`,
      avatar: info.icon ? info.icon : null,
      backgroundColor: backgroundColor,
      className: 'text-dark',
      close: true,
      gravity: 'top',
      position: 'right',
      duration: 5000,
      onClick: () => {
        if (toast) {
          toast.hideToast();
          router.history.push(info.link);
        }
      },
    }).showToast();
  }
}

export function notifyPost(post_view: PostView, router: any) {
  let info: NotifyInfo = {
    name: post_view.community.name,
    icon: post_view.community.icon,
    link: `/post/${post_view.post.id}`,
    body: post_view.post.name,
  };
  notify(info, router);
}

export function notifyComment(comment_view: CommentView, router: any) {
  let info: NotifyInfo = {
    name: comment_view.creator.name,
    icon: comment_view.creator.avatar,
    link: `/post/${comment_view.post.id}/comment/${comment_view.comment.id}`,
    body: comment_view.comment.content,
  };
  notify(info, router);
}

export function notifyPrivateMessage(pmv: PrivateMessageView, router: any) {
  let info: NotifyInfo = {
    name: pmv.creator.name,
    icon: pmv.creator.avatar,
    link: `/inbox`,
    body: pmv.private_message.content,
  };
  notify(info, router);
}

function notify(info: NotifyInfo, router: any) {
  messageToastify(info, router);

  if (Notification.permission !== 'granted') Notification.requestPermission();
  else {
    var notification = new Notification(info.name, {
      icon: info.icon,
      body: info.body,
    });

    notification.onclick = (ev: Event): any => {
      ev.preventDefault();
      router.history.push(info.link);
    };
  }
}

export function setupTribute() {
  return new Tribute({
    noMatchTemplate: function () {
      return '';
    },
    collection: [
      // Emojis
      {
        trigger: ':',
        menuItemTemplate: (item: any) => {
          let shortName = `:${item.original.key}:`;
          return `${item.original.val} ${shortName}`;
        },
        selectTemplate: (item: any) => {
          return `:${item.original.key}:`;
        },
        values: Object.entries(emojiShortName).map(e => {
          return { key: e[1], val: e[0] };
        }),
        allowSpaces: false,
        autocompleteMode: true,
        // TODO
        // menuItemLimit: mentionDropdownFetchLimit,
        menuShowMinLength: 2,
      },
      // Users
      {
        trigger: '@',
        selectTemplate: (item: any) => {
          let it: UserTribute = item.original;
          return `[${it.key}](${it.view.user.actor_id})`;
        },
        values: (text: string, cb: (users: UserTribute[]) => any) => {
          userSearch(text, (users: UserTribute[]) => cb(users));
        },
        allowSpaces: false,
        autocompleteMode: true,
        // TODO
        // menuItemLimit: mentionDropdownFetchLimit,
        menuShowMinLength: 2,
      },

      // Communities
      {
        trigger: '!',
        selectTemplate: (item: any) => {
          let it: CommunityTribute = item.original;
          return `[${it.key}](${it.view.community.actor_id})`;
        },
        values: (text: string, cb: any) => {
          communitySearch(text, (communities: CommunityTribute[]) =>
            cb(communities)
          );
        },
        allowSpaces: false,
        autocompleteMode: true,
        // TODO
        // menuItemLimit: mentionDropdownFetchLimit,
        menuShowMinLength: 2,
      },
    ],
  });
}

var tippyInstance: any;
if (isBrowser()) {
  tippyInstance = tippy('[data-tippy-content]');
}

export function setupTippy() {
  if (isBrowser()) {
    tippyInstance.forEach((e: any) => e.destroy());
    tippyInstance = tippy('[data-tippy-content]', {
      delay: [500, 0],
      // Display on "long press"
      touch: ['hold', 500],
    });
  }
}

interface UserTribute {
  key: string;
  view: UserViewSafe;
}

function userSearch(text: string, cb: (users: UserTribute[]) => any) {
  if (text) {
    let form: Search = {
      q: text,
      type_: SearchType.Users,
      sort: SortType.TopAll,
      page: 1,
      limit: mentionDropdownFetchLimit,
      auth: authField(false),
    };

    WebSocketService.Instance.send(wsClient.search(form));

    let userSub = WebSocketService.Instance.subject.subscribe(
      msg => {
        let res = wsJsonToRes(msg);
        if (res.op == UserOperation.Search) {
          let data = res.data as SearchResponse;
          let users: UserTribute[] = data.users.map(uv => {
            let tribute: UserTribute = {
              key: `@${uv.user.name}@${hostname(uv.user.actor_id)}`,
              view: uv,
            };
            return tribute;
          });
          cb(users);
          userSub.unsubscribe();
        }
      },
      err => console.error(err),
      () => console.log('complete')
    );
  } else {
    cb([]);
  }
}

interface CommunityTribute {
  key: string;
  view: CommunityView;
}

function communitySearch(
  text: string,
  cb: (communities: CommunityTribute[]) => any
) {
  if (text) {
    let form: Search = {
      q: text,
      type_: SearchType.Communities,
      sort: SortType.TopAll,
      page: 1,
      limit: mentionDropdownFetchLimit,
      auth: authField(false),
    };

    WebSocketService.Instance.send(wsClient.search(form));

    let communitySub = WebSocketService.Instance.subject.subscribe(
      msg => {
        let res = wsJsonToRes(msg);
        if (res.op == UserOperation.Search) {
          let data = res.data as SearchResponse;
          let communities: CommunityTribute[] = data.communities.map(cv => {
            let tribute: CommunityTribute = {
              key: `!${cv.community.name}@${hostname(cv.community.actor_id)}`,
              view: cv,
            };
            return tribute;
          });
          cb(communities);
          communitySub.unsubscribe();
        }
      },
      err => console.error(err),
      () => console.log('complete')
    );
  } else {
    cb([]);
  }
}

export function getListingTypeFromProps(props: any): ListingType {
  return props.match.params.listing_type
    ? routeListingTypeToEnum(props.match.params.listing_type)
    : UserService.Instance.user
    ? Object.values(ListingType)[UserService.Instance.user.default_listing_type]
    : ListingType.Local;
}

// TODO might need to add a user setting for this too
export function getDataTypeFromProps(props: any): DataType {
  return props.match.params.data_type
    ? routeDataTypeToEnum(props.match.params.data_type)
    : DataType.Post;
}

export function getSortTypeFromProps(props: any): SortType {
  return props.match.params.sort
    ? routeSortTypeToEnum(props.match.params.sort)
    : UserService.Instance.user
    ? Object.values(SortType)[UserService.Instance.user.default_sort_type]
    : SortType.Active;
}

export function getPageFromProps(props: any): number {
  return props.match.params.page ? Number(props.match.params.page) : 1;
}

export function getRecipientIdFromProps(props: any): number {
  return props.match.params.recipient_id
    ? Number(props.match.params.recipient_id)
    : 1;
}

export function getIdFromProps(props: any): number {
  return Number(props.match.params.id);
}

export function getCommentIdFromProps(props: any): number {
  return Number(props.match.params.comment_id);
}

export function getUsernameFromProps(props: any): string {
  return props.match.params.username;
}

export function editCommentRes(data: CommentView, comments: CommentView[]) {
  let found = comments.find(c => c.comment.id == data.comment.id);
  if (found) {
    found.comment.content = data.comment.content;
    found.comment.updated = data.comment.updated;
    found.comment.removed = data.comment.removed;
    found.comment.deleted = data.comment.deleted;
    found.counts.upvotes = data.counts.upvotes;
    found.counts.downvotes = data.counts.downvotes;
    found.counts.score = data.counts.score;
  }
}

export function saveCommentRes(data: CommentView, comments: CommentView[]) {
  let found = comments.find(c => c.comment.id == data.comment.id);
  if (found) {
    found.saved = data.saved;
  }
}

export function createCommentLikeRes(
  data: CommentView,
  comments: CommentView[]
) {
  let found = comments.find(c => c.comment.id === data.comment.id);
  if (found) {
    found.counts.score = data.counts.score;
    found.counts.upvotes = data.counts.upvotes;
    found.counts.downvotes = data.counts.downvotes;
    if (data.my_vote !== null) {
      found.my_vote = data.my_vote;
    }
  }
}

export function createPostLikeFindRes(data: PostView, posts: PostView[]) {
  let found = posts.find(p => p.post.id == data.post.id);
  if (found) {
    createPostLikeRes(data, found);
  }
}

export function createPostLikeRes(data: PostView, post_view: PostView) {
  if (post_view) {
    post_view.counts.score = data.counts.score;
    post_view.counts.upvotes = data.counts.upvotes;
    post_view.counts.downvotes = data.counts.downvotes;
    if (data.my_vote !== null) {
      post_view.my_vote = data.my_vote;
    }
  }
}

export function editPostFindRes(data: PostView, posts: PostView[]) {
  let found = posts.find(p => p.post.id == data.post.id);
  if (found) {
    editPostRes(data, found);
  }
}

export function editPostRes(data: PostView, post: PostView) {
  if (post) {
    post.post.url = data.post.url;
    post.post.name = data.post.name;
    post.post.nsfw = data.post.nsfw;
    post.post.deleted = data.post.deleted;
    post.post.removed = data.post.removed;
    post.post.stickied = data.post.stickied;
    post.post.body = data.post.body;
    post.post.locked = data.post.locked;
    post.saved = data.saved;
  }
}

export function commentsToFlatNodes(comments: CommentView[]): CommentNodeI[] {
  let nodes: CommentNodeI[] = [];
  for (let comment of comments) {
    nodes.push({ comment_view: comment });
  }
  return nodes;
}

function commentSort(tree: CommentNodeI[], sort: CommentSortType) {
  // First, put removed and deleted comments at the bottom, then do your other sorts
  if (sort == CommentSortType.Top) {
    tree.sort(
      (a, b) =>
        +a.comment_view.comment.removed - +b.comment_view.comment.removed ||
        +a.comment_view.comment.deleted - +b.comment_view.comment.deleted ||
        b.comment_view.counts.score - a.comment_view.counts.score
    );
  } else if (sort == CommentSortType.New) {
    tree.sort(
      (a, b) =>
        +a.comment_view.comment.removed - +b.comment_view.comment.removed ||
        +a.comment_view.comment.deleted - +b.comment_view.comment.deleted ||
        b.comment_view.comment.published.localeCompare(
          a.comment_view.comment.published
        )
    );
  } else if (sort == CommentSortType.Old) {
    tree.sort(
      (a, b) =>
        +a.comment_view.comment.removed - +b.comment_view.comment.removed ||
        +a.comment_view.comment.deleted - +b.comment_view.comment.deleted ||
        a.comment_view.comment.published.localeCompare(
          b.comment_view.comment.published
        )
    );
  } else if (sort == CommentSortType.Hot) {
    tree.sort(
      (a, b) =>
        +a.comment_view.comment.removed - +b.comment_view.comment.removed ||
        +a.comment_view.comment.deleted - +b.comment_view.comment.deleted ||
        hotRankComment(b.comment_view) - hotRankComment(a.comment_view)
    );
  }

  // Go through the children recursively
  for (let node of tree) {
    if (node.children) {
      commentSort(node.children, sort);
    }
  }
}

export function commentSortSortType(tree: CommentNodeI[], sort: SortType) {
  commentSort(tree, convertCommentSortType(sort));
}

function convertCommentSortType(sort: SortType): CommentSortType {
  if (
    sort == SortType.TopAll ||
    sort == SortType.TopDay ||
    sort == SortType.TopWeek ||
    sort == SortType.TopMonth ||
    sort == SortType.TopYear
  ) {
    return CommentSortType.Top;
  } else if (sort == SortType.New) {
    return CommentSortType.New;
  } else if (sort == SortType.Hot || sort == SortType.Active) {
    return CommentSortType.Hot;
  } else {
    return CommentSortType.Hot;
  }
}

export function buildCommentsTree(
  comments: CommentView[],
  commentSortType: CommentSortType
): CommentNodeI[] {
  let map = new Map<number, CommentNodeI>();
  for (let comment_view of comments) {
    let node: CommentNodeI = {
      comment_view: comment_view,
      children: [],
    };
    map.set(comment_view.comment.id, { ...node });
  }
  let tree: CommentNodeI[] = [];
  for (let comment_view of comments) {
    let child = map.get(comment_view.comment.id);
    if (comment_view.comment.parent_id) {
      let parent_ = map.get(comment_view.comment.parent_id);
      parent_.children.push(child);
    } else {
      tree.push(child);
    }

    setDepth(child);
  }

  commentSort(tree, commentSortType);

  return tree;
}

function setDepth(node: CommentNodeI, i: number = 0) {
  for (let child of node.children) {
    child.depth = i;
    setDepth(child, i + 1);
  }
}

export function insertCommentIntoTree(tree: CommentNodeI[], cv: CommentView) {
  // Building a fake node to be used for later
  let node: CommentNodeI = {
    comment_view: cv,
    children: [],
    depth: 0,
  };

  if (cv.comment.parent_id) {
    let parentComment = searchCommentTree(tree, cv.comment.parent_id);
    if (parentComment) {
      node.depth = parentComment.depth + 1;
      parentComment.children.unshift(node);
    }
  } else {
    tree.unshift(node);
  }
}

export function searchCommentTree(
  tree: CommentNodeI[],
  id: number
): CommentNodeI {
  for (let node of tree) {
    if (node.comment_view.comment.id === id) {
      return node;
    }

    for (const child of node.children) {
      const res = searchCommentTree([child], id);

      if (res) {
        return res;
      }
    }
  }
  return null;
}

export const colorList: string[] = [
  hsl(0),
  hsl(100),
  hsl(150),
  hsl(200),
  hsl(250),
  hsl(300),
];

function hsl(num: number) {
  return `hsla(${num}, 35%, 50%, 1)`;
}

export function previewLines(
  text: string,
  maxChars: number = 300,
  maxLines: number = 1
): string {
  return (
    text
      .slice(0, maxChars)
      .split('\n')
      // Use lines * 2 because markdown requires 2 lines
      .slice(0, maxLines * 2)
      .join('\n') + '...'
  );
}

export function hostname(url: string): string {
  let cUrl = new URL(url);
  return cUrl.port ? `${cUrl.hostname}:${cUrl.port}` : `${cUrl.hostname}`;
}

export function validTitle(title?: string): boolean {
  // Initial title is null, minimum length is taken care of by textarea's minLength={3}
  if (title === null || title.length < 3) return true;

  const regex = new RegExp(/.*\S.*/, 'g');

  return regex.test(title);
}

export function siteBannerCss(banner: string): string {
  return ` \
    background-image: linear-gradient( rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8) ) ,url("${banner}"); \
    background-attachment: fixed; \
    background-position: top; \
    background-repeat: no-repeat; \
    background-size: 100% cover; \

    width: 100%; \
    max-height: 100vh; \
    `;
}

export function isBrowser() {
  return typeof window !== 'undefined';
}

export function setIsoData(context: any): IsoData {
  let isoData: IsoData = isBrowser()
    ? window.isoData
    : context.router.staticContext;
  return isoData;
}

export function wsSubscribe(parseMessage: any): Subscription {
  if (isBrowser()) {
    return WebSocketService.Instance.subject
      .pipe(retryWhen(errors => errors.pipe(delay(3000), take(10))))
      .subscribe(
        msg => parseMessage(msg),
        err => console.error(err),
        () => console.log('complete')
      );
  } else {
    return null;
  }
}

export function setOptionalAuth(obj: any, auth = UserService.Instance.auth) {
  if (auth) {
    obj.auth = auth;
  }
}

export function authField(
  throwErr: boolean = true,
  auth = UserService.Instance.auth
): string {
  if (auth == null && throwErr) {
    toast(i18n.t('not_logged_in'), 'danger');
    throw 'Not logged in';
  } else {
    return auth;
  }
}

moment.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: '<1m',
    ss: '%ds',
    m: '1m',
    mm: '%dm',
    h: '1h',
    hh: '%dh',
    d: '1d',
    dd: '%dd',
    w: '1w',
    ww: '%dw',
    M: '1M',
    MM: '%dM',
    y: '1Y',
    yy: '%dY',
  },
});

export function saveScrollPosition(context: any) {
  let path: string = context.router.route.location.pathname;
  let y = window.scrollY;
  sessionStorage.setItem(`scrollPosition_${path}`, y.toString());
}

export function restoreScrollPosition(context: any) {
  let path: string = context.router.route.location.pathname;
  let y = Number(sessionStorage.getItem(`scrollPosition_${path}`));
  window.scrollTo(0, y);
}
