import { Picker } from "emoji-mart";
import emojiShortName from "emoji-short-name";
import {
  BlockCommunityResponse,
  BlockPersonResponse,
  Comment as CommentI,
  CommentReportView,
  CommentSortType,
  CommentView,
  CommunityModeratorView,
  CommunityView,
  CustomEmojiView,
  GetSiteMetadata,
  GetSiteResponse,
  Language,
  LemmyHttp,
  LemmyWebsocket,
  MyUserInfo,
  Person,
  PersonView,
  PostReportView,
  PostView,
  PrivateMessageReportView,
  PrivateMessageView,
  RegistrationApplicationView,
  Search,
  SortType,
  UploadImageResponse,
} from "lemmy-js-client";
import { default as MarkdownIt } from "markdown-it";
import markdown_it_container from "markdown-it-container";
import markdown_it_emoji from "markdown-it-emoji/bare";
import markdown_it_footnote from "markdown-it-footnote";
import markdown_it_html5_embed from "markdown-it-html5-embed";
import markdown_it_sub from "markdown-it-sub";
import markdown_it_sup from "markdown-it-sup";
import Renderer from "markdown-it/lib/renderer";
import Token from "markdown-it/lib/token";
import moment from "moment";
import { Subscription } from "rxjs";
import { delay, retryWhen, take } from "rxjs/operators";
import tippy from "tippy.js";
import Toastify from "toastify-js";
import { getHttpBase } from "./env";
import { i18n, languages } from "./i18next";
import { CommentNodeI, DataType, IsoData } from "./interfaces";
import { UserService, WebSocketService } from "./services";

let Tribute: any;
if (isBrowser()) {
  Tribute = require("tributejs");
}

export const wsClient = new LemmyWebsocket();

export const favIconUrl = "/static/assets/icons/favicon.svg";
export const favIconPngUrl = "/static/assets/icons/apple-touch-icon.png";
// TODO
// export const defaultFavIcon = `${window.location.protocol}//${window.location.host}${favIconPngUrl}`;
export const repoUrl = "https://github.com/LemmyNet";
export const joinLemmyUrl = "https://join-lemmy.org";
export const donateLemmyUrl = `${joinLemmyUrl}/donate`;
export const docsUrl = `${joinLemmyUrl}/docs/en/index.html`;
export const helpGuideUrl = `${joinLemmyUrl}/docs/en/users/01-getting-started.html`; // TODO find a way to redirect to the non-en folder
export const markdownHelpUrl = `${joinLemmyUrl}/docs/en/users/02-media.html`;
export const sortingHelpUrl = `${joinLemmyUrl}/docs/en/users/03-votes-and-ranking.html`;
export const archiveTodayUrl = "https://archive.today";
export const ghostArchiveUrl = "https://ghostarchive.org";
export const webArchiveUrl = "https://web.archive.org";
export const elementUrl = "https://element.io";

export const postRefetchSeconds: number = 60 * 1000;
export const fetchLimit = 40;
export const trendingFetchLimit = 6;
export const mentionDropdownFetchLimit = 10;
export const commentTreeMaxDepth = 8;
export const markdownFieldCharacterLimit = 50000;
export const maxUploadImages = 20;
export const concurrentImageUpload = 4;

export const relTags = "noopener nofollow";

export const emDash = "\u2014";

export type ThemeColor =
  | "primary"
  | "secondary"
  | "light"
  | "dark"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "cyan"
  | "white"
  | "gray"
  | "gray-dark";

export interface ErrorPageData {
  error?: string;
  adminMatrixIds?: string[];
}

const customEmojis: EmojiMartCategory[] = [];
export let customEmojisLookup: Map<string, CustomEmojiView> = new Map<
  string,
  CustomEmojiView
>();

const DEFAULT_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function getRandomCharFromAlphabet(alphabet: string): string {
  return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
}

export function getIdFromString(id?: string): number | undefined {
  return id && id !== "0" && !Number.isNaN(Number(id)) ? Number(id) : undefined;
}

export function getPageFromString(page?: string): number {
  return page && !Number.isNaN(Number(page)) ? Number(page) : 1;
}

export function randomStr(
  idDesiredLength = 20,
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
    .join("");
}

const html5EmbedConfig = {
  html5embed: {
    useImageSyntax: true, // Enables video/audio embed with ![]() syntax (default)
    attributes: {
      audio: 'controls preload="metadata"',
      video: 'width="100%" max-height="100%" controls loop preload="metadata"',
    },
  },
};

const spoilerConfig = {
  validate: (params: string) => {
    return params.trim().match(/^spoiler\s+(.*)$/);
  },

  render: (tokens: any, idx: any) => {
    var m = tokens[idx].info.trim().match(/^spoiler\s+(.*)$/);

    if (tokens[idx].nesting === 1) {
      // opening tag
      return `<details><summary> ${md.utils.escapeHtml(m[1])} </summary>\n`;
    } else {
      // closing tag
      return "</details>\n";
    }
  },
};

export let md: MarkdownIt = new MarkdownIt();

export let mdNoImages: MarkdownIt = new MarkdownIt();

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
  const date: Date = new Date(timeStr + "Z"); // Add Z to convert from UTC date
  const now: Date = new Date();
  const hoursElapsed: number = (now.getTime() - date.getTime()) / 36e5;

  const rank =
    (10000 * Math.log10(Math.max(1, 3 + Number(score)))) /
    Math.pow(hoursElapsed + 2, 1.8);

  // console.log(`Comment: ${comment.content}\nRank: ${rank}\nScore: ${comment.score}\nHours: ${hoursElapsed}`);

  return rank;
}

export function mdToHtml(text: string) {
  // restore '>' character to fix quotes
  return { __html: md.render(text) };
}

export function mdToHtmlNoImages(text: string) {
  // restore '>' character to fix quotes
  return { __html: mdNoImages.render(text) };
}

export function mdToHtmlInline(text: string) {
  return { __html: md.renderInline(text) };
}

export function getUnixTime(text?: string): number | undefined {
  return text ? new Date(text).getTime() / 1000 : undefined;
}

export function futureDaysToUnixTime(days?: number): number | undefined {
  return days
    ? Math.trunc(
        new Date(Date.now() + 1000 * 60 * 60 * 24 * days).getTime() / 1000
      )
    : undefined;
}

export function canMod(
  creator_id: number,
  mods?: CommunityModeratorView[],
  admins?: PersonView[],
  myUserInfo = UserService.Instance.myUserInfo,
  onSelf = false
): boolean {
  // You can do moderator actions only on the mods added after you.
  let adminsThenMods =
    admins
      ?.map(a => a.person.id)
      .concat(mods?.map(m => m.moderator.id) ?? []) ?? [];

  if (myUserInfo) {
    const myIndex = adminsThenMods.findIndex(
      id => id == myUserInfo.local_user_view.person.id
    );
    if (myIndex == -1) {
      return false;
    } else {
      // onSelf +1 on mod actions not for yourself, IE ban, remove, etc
      adminsThenMods = adminsThenMods.slice(0, myIndex + (onSelf ? 0 : 1));
      return !adminsThenMods.includes(creator_id);
    }
  } else {
    return false;
  }
}

export function canAdmin(
  creatorId: number,
  admins?: PersonView[],
  myUserInfo = UserService.Instance.myUserInfo,
  onSelf = false
): boolean {
  return canMod(creatorId, undefined, admins, myUserInfo, onSelf);
}

export function isMod(
  creatorId: number,
  mods?: CommunityModeratorView[]
): boolean {
  return mods?.map(m => m.moderator.id).includes(creatorId) ?? false;
}

export function amMod(
  mods?: CommunityModeratorView[],
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  return myUserInfo ? isMod(myUserInfo.local_user_view.person.id, mods) : false;
}

export function isAdmin(creatorId: number, admins?: PersonView[]): boolean {
  return admins?.map(a => a.person.id).includes(creatorId) ?? false;
}

export function amAdmin(myUserInfo = UserService.Instance.myUserInfo): boolean {
  return myUserInfo?.local_user_view.person.admin ?? false;
}

export function amCommunityCreator(
  creator_id: number,
  mods?: CommunityModeratorView[],
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  // Don't allow mod actions on yourself
  return myId == mods?.at(0)?.moderator.id && myId != creator_id;
}

export function amSiteCreator(
  creator_id: number,
  admins?: PersonView[],
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  return myId == admins?.at(0)?.person.id && myId != creator_id;
}

export function amTopMod(
  mods: CommunityModeratorView[],
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  return mods.at(0)?.moderator.id == myUserInfo?.local_user_view.person.id;
}

const imageRegex = /(http)?s?:?(\/\/[^"']*\.(?:jpg|jpeg|gif|png|svg|webp))/;
const videoRegex = /(http)?s?:?(\/\/[^"']*\.(?:mp4|webm))/;

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
  const url = new URL(actorId);
  return `${url.origin}/feeds${url.pathname}.xml?sort=${sort}`;
}

export function validEmail(email: string) {
  const re =
    /^(([^\s"(),.:;<>@[\\\]]+(\.[^\s"(),.:;<>@[\\\]]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([\dA-Za-z\-]+\.)+[A-Za-z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function getSiteMetadata(url: string) {
  const form: GetSiteMetadata = { url };
  const client = new LemmyHttp(getHttpBase());
  return client.getSiteMetadata(form);
}

export function getDataTypeString(dt: DataType) {
  return dt === DataType.Post ? "Post" : "Comment";
}

export function debounce<T extends any[], R>(
  func: (...e: T) => R,
  wait = 1000,
  immediate = false
) {
  // 'private' variable for instance
  // The returned function will be able to reference this due to closure.
  // Each call to the returned function will share this common timer.
  let timeout: NodeJS.Timeout | null;

  // Calling debounce returns a new anonymous function
  return function () {
    // reference the context and args for the setTimeout function
    const args = arguments;

    // Should the function be called now? If immediate is true
    //   and not already in a timeout then the answer is: Yes
    const callNow = immediate && !timeout;

    // This is the basic debounce behavior where you can call this
    //   function several times, but it will only execute once
    //   [before or after imposing a delay].
    //   Each time the returned function is called, the timer starts over.
    clearTimeout(timeout ?? undefined);

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
        func.apply(this, args);
      }
    }, wait);

    // Immediate mode and no wait timer? Execute the function..
    if (callNow) func.apply(this, args);
  } as (...e: T) => R;
}

export function getLanguages(
  override?: string,
  myUserInfo = UserService.Instance.myUserInfo
): string[] {
  const myLang = myUserInfo?.local_user_view.local_user.interface_language;
  const lang = override || myLang || "browser";

  if (lang == "browser" && isBrowser()) {
    return getBrowserLanguages();
  } else {
    return [lang];
  }
}

function getBrowserLanguages(): string[] {
  // Intersect lemmy's langs, with the browser langs
  const langs = languages ? languages.map(l => l.code) : ["en"];

  // NOTE, mobile browsers seem to be missing this list, so append en
  const allowedLangs = navigator.languages
    .concat("en")
    .filter(v => langs.includes(v));
  return allowedLangs;
}

export async function fetchThemeList(): Promise<string[]> {
  return fetch("/css/themelist").then(res => res.json());
}

export async function setTheme(theme: string, forceReload = false) {
  if (!isBrowser()) {
    return;
  }
  if (theme === "browser" && !forceReload) {
    return;
  }
  // This is only run on a force reload
  if (theme == "browser") {
    theme = "darkly";
  }

  const themeList = await fetchThemeList();

  // Unload all the other themes
  for (var i = 0; i < themeList.length; i++) {
    const styleSheet = document.getElementById(themeList[i]);
    if (styleSheet) {
      styleSheet.setAttribute("disabled", "disabled");
    }
  }

  document
    .getElementById("default-light")
    ?.setAttribute("disabled", "disabled");
  document.getElementById("default-dark")?.setAttribute("disabled", "disabled");

  // Load the theme dynamically
  const cssLoc = `/css/themes/${theme}.css`;

  loadCss(theme, cssLoc);
  document.getElementById(theme)?.removeAttribute("disabled");
}

export function loadCss(id: string, loc: string) {
  if (!document.getElementById(id)) {
    var head = document.getElementsByTagName("head")[0];
    var link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = loc;
    link.media = "all";
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

export function showAvatars(
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  return myUserInfo?.local_user_view.local_user.show_avatars ?? true;
}

export function showScores(
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  return myUserInfo?.local_user_view.local_user.show_scores ?? true;
}

export function isCakeDay(published: string): boolean {
  // moment(undefined) or moment.utc(undefined) returns the current date/time
  // moment(null) or moment.utc(null) returns null
  const createDate = moment.utc(published).local();
  const currentDate = moment(new Date());

  return (
    createDate.date() === currentDate.date() &&
    createDate.month() === currentDate.month() &&
    createDate.year() !== currentDate.year()
  );
}

export function toast(text: string, background: ThemeColor = "success") {
  if (isBrowser()) {
    const backgroundColor = `var(--${background})`;
    Toastify({
      text: text,
      backgroundColor: backgroundColor,
      gravity: "bottom",
      position: "left",
      duration: 5000,
    }).showToast();
  }
}

export function pictrsDeleteToast(filename: string, deleteUrl: string) {
  if (isBrowser()) {
    const clickToDeleteText = i18n.t("click_to_delete_picture", { filename });
    const deletePictureText = i18n.t("picture_deleted", {
      filename,
    });
    const failedDeletePictureText = i18n.t("failed_to_delete_picture", {
      filename,
    });

    const backgroundColor = `var(--light)`;

    const toast = Toastify({
      text: clickToDeleteText,
      backgroundColor: backgroundColor,
      gravity: "top",
      position: "right",
      duration: 10000,
      onClick: () => {
        if (toast) {
          fetch(deleteUrl).then(res => {
            toast.hideToast();
            if (res.ok === true) {
              alert(deletePictureText);
            } else {
              alert(failedDeletePictureText);
            }
          });
        }
      },
      close: true,
    });

    toast.showToast();
  }
}

interface NotifyInfo {
  name: string;
  icon?: string;
  link: string;
  body?: string;
}

export function messageToastify(info: NotifyInfo, router: any) {
  if (isBrowser()) {
    const htmlBody = info.body ? md.render(info.body) : "";
    const backgroundColor = `var(--light)`;

    const toast = Toastify({
      text: `${htmlBody}<br />${info.name}`,
      avatar: info.icon,
      backgroundColor: backgroundColor,
      className: "text-dark",
      close: true,
      gravity: "top",
      position: "right",
      duration: 5000,
      escapeMarkup: false,
      onClick: () => {
        if (toast) {
          toast.hideToast();
          router.history.push(info.link);
        }
      },
    });
    toast.showToast();
  }
}

export function notifyPost(post_view: PostView, router: any) {
  const info: NotifyInfo = {
    name: post_view.community.name,
    icon: post_view.community.icon,
    link: `/post/${post_view.post.id}`,
    body: post_view.post.name,
  };
  notify(info, router);
}

export function notifyComment(comment_view: CommentView, router: any) {
  const info: NotifyInfo = {
    name: comment_view.creator.name,
    icon: comment_view.creator.avatar,
    link: `/comment/${comment_view.comment.id}`,
    body: comment_view.comment.content,
  };
  notify(info, router);
}

export function notifyPrivateMessage(pmv: PrivateMessageView, router: any) {
  const info: NotifyInfo = {
    name: pmv.creator.name,
    icon: pmv.creator.avatar,
    link: `/inbox`,
    body: pmv.private_message.content,
  };
  notify(info, router);
}

function notify(info: NotifyInfo, router: any) {
  messageToastify(info, router);

  if (Notification.permission !== "granted") Notification.requestPermission();
  else {
    var notification = new Notification(info.name, {
      ...{ body: info.body },
      ...(info.icon && { icon: info.icon }),
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
      return "";
    },
    collection: [
      // Emojis
      {
        trigger: ":",
        menuItemTemplate: (item: any) => {
          const shortName = `:${item.original.key}:`;
          return `${item.original.val} ${shortName}`;
        },
        selectTemplate: (item: any) => {
          const customEmoji = customEmojisLookup.get(
            item.original.key
          )?.custom_emoji;
          if (customEmoji == undefined) return `${item.original.val}`;
          else
            return `![${customEmoji.alt_text}](${customEmoji.image_url} "${customEmoji.shortcode}")`;
        },
        values: Object.entries(emojiShortName)
          .map(e => {
            return { key: e[1], val: e[0] };
          })
          .concat(
            Array.from(customEmojisLookup.entries()).map(k => ({
              key: k[0],
              val: `<img class="icon icon-emoji" src="${k[1].custom_emoji.image_url}" title="${k[1].custom_emoji.shortcode}" alt="${k[1].custom_emoji.alt_text}" />`,
            }))
          ),
        allowSpaces: false,
        autocompleteMode: true,
        // TODO
        // menuItemLimit: mentionDropdownFetchLimit,
        menuShowMinLength: 2,
      },
      // Persons
      {
        trigger: "@",
        selectTemplate: (item: any) => {
          const it: PersonTribute = item.original;
          return `[${it.key}](${it.view.person.actor_id})`;
        },
        values: debounce(async (text: string, cb: any) => {
          cb(await personSearch(text));
        }),
        allowSpaces: false,
        autocompleteMode: true,
        // TODO
        // menuItemLimit: mentionDropdownFetchLimit,
        menuShowMinLength: 2,
      },

      // Communities
      {
        trigger: "!",
        selectTemplate: (item: any) => {
          const it: CommunityTribute = item.original;
          return `[${it.key}](${it.view.community.actor_id})`;
        },
        values: debounce(async (text: string, cb: any) => {
          cb(await communitySearch(text));
        }),
        allowSpaces: false,
        autocompleteMode: true,
        // TODO
        // menuItemLimit: mentionDropdownFetchLimit,
        menuShowMinLength: 2,
      },
    ],
  });
}

function setupEmojiDataModel(custom_emoji_views: CustomEmojiView[]) {
  const groupedEmojis = groupBy(
    custom_emoji_views,
    x => x.custom_emoji.category
  );
  for (const [category, emojis] of Object.entries(groupedEmojis)) {
    customEmojis.push({
      id: category,
      name: category,
      emojis: emojis.map(emoji => ({
        id: emoji.custom_emoji.shortcode,
        name: emoji.custom_emoji.shortcode,
        keywords: emoji.keywords.map(x => x.keyword),
        skins: [{ src: emoji.custom_emoji.image_url }],
      })),
    });
  }
  customEmojisLookup = new Map(
    custom_emoji_views.map(view => [view.custom_emoji.shortcode, view])
  );
}

export function updateEmojiDataModel(custom_emoji_view: CustomEmojiView) {
  const emoji: EmojiMartCustomEmoji = {
    id: custom_emoji_view.custom_emoji.shortcode,
    name: custom_emoji_view.custom_emoji.shortcode,
    keywords: custom_emoji_view.keywords.map(x => x.keyword),
    skins: [{ src: custom_emoji_view.custom_emoji.image_url }],
  };
  const categoryIndex = customEmojis.findIndex(
    x => x.id == custom_emoji_view.custom_emoji.category
  );
  if (categoryIndex == -1) {
    customEmojis.push({
      id: custom_emoji_view.custom_emoji.category,
      name: custom_emoji_view.custom_emoji.category,
      emojis: [emoji],
    });
  } else {
    const emojiIndex = customEmojis[categoryIndex].emojis.findIndex(
      x => x.id == custom_emoji_view.custom_emoji.shortcode
    );
    if (emojiIndex == -1) {
      customEmojis[categoryIndex].emojis.push(emoji);
    } else {
      customEmojis[categoryIndex].emojis[emojiIndex] = emoji;
    }
  }
  customEmojisLookup.set(
    custom_emoji_view.custom_emoji.shortcode,
    custom_emoji_view
  );
}

export function removeFromEmojiDataModel(id: number) {
  let view: CustomEmojiView | undefined;
  for (const item of customEmojisLookup.values()) {
    if (item.custom_emoji.id === id) {
      view = item;
      break;
    }
  }
  if (!view) return;
  const categoryIndex = customEmojis.findIndex(
    x => x.id == view?.custom_emoji.category
  );
  const emojiIndex = customEmojis[categoryIndex].emojis.findIndex(
    x => x.id == view?.custom_emoji.shortcode
  );
  customEmojis[categoryIndex].emojis = customEmojis[
    categoryIndex
  ].emojis.splice(emojiIndex, 1);

  customEmojisLookup.delete(view?.custom_emoji.shortcode);
}

function setupMarkdown() {
  const markdownItConfig: MarkdownIt.Options = {
    html: false,
    linkify: true,
    typographer: true,
  };

  const emojiDefs = Array.from(customEmojisLookup.entries()).reduce(
    (main, [key, value]) => ({ ...main, [key]: value }),
    {}
  );
  md = new MarkdownIt(markdownItConfig)
    .use(markdown_it_sub)
    .use(markdown_it_sup)
    .use(markdown_it_footnote)
    .use(markdown_it_html5_embed, html5EmbedConfig)
    .use(markdown_it_container, "spoiler", spoilerConfig)
    .use(markdown_it_emoji, {
      defs: emojiDefs,
    });

  mdNoImages = new MarkdownIt(markdownItConfig)
    .use(markdown_it_sub)
    .use(markdown_it_sup)
    .use(markdown_it_footnote)
    .use(markdown_it_html5_embed, html5EmbedConfig)
    .use(markdown_it_container, "spoiler", spoilerConfig)
    .use(markdown_it_emoji, {
      defs: emojiDefs,
    })
    .disable("image");
  var defaultRenderer = md.renderer.rules.image;
  md.renderer.rules.image = function (
    tokens: Token[],
    idx: number,
    options: MarkdownIt.Options,
    env: any,
    self: Renderer
  ) {
    //Provide custom renderer for our emojis to allow us to add a css class and force size dimensions on them.
    const item = tokens[idx] as any;
    const title = item.attrs.length >= 3 ? item.attrs[2][1] : "";
    const src: string = item.attrs[0][1];
    const isCustomEmoji = customEmojisLookup.get(title) != undefined;
    if (!isCustomEmoji) {
      return defaultRenderer?.(tokens, idx, options, env, self) ?? "";
    }
    const alt_text = item.content;
    return `<img class="icon icon-emoji" src="${src}" title="${title}" alt="${alt_text}"/>`;
  };
}

export function getEmojiMart(
  onEmojiSelect: (e: any) => void,
  customPickerOptions: any = {}
) {
  const pickerOptions = {
    ...customPickerOptions,
    onEmojiSelect: onEmojiSelect,
    custom: customEmojis,
  };
  return new Picker(pickerOptions);
}

var tippyInstance: any;
if (isBrowser()) {
  tippyInstance = tippy("[data-tippy-content]");
}

export function setupTippy() {
  if (isBrowser()) {
    tippyInstance.forEach((e: any) => e.destroy());
    tippyInstance = tippy("[data-tippy-content]", {
      delay: [500, 0],
      // Display on "long press"
      touch: ["hold", 500],
    });
  }
}

interface PersonTribute {
  key: string;
  view: PersonView;
}

async function personSearch(text: string): Promise<PersonTribute[]> {
  const users = (await fetchUsers(text)).users;
  const persons: PersonTribute[] = users.map(pv => {
    const tribute: PersonTribute = {
      key: `@${pv.person.name}@${hostname(pv.person.actor_id)}`,
      view: pv,
    };
    return tribute;
  });
  return persons;
}

interface CommunityTribute {
  key: string;
  view: CommunityView;
}

async function communitySearch(text: string): Promise<CommunityTribute[]> {
  const comms = (await fetchCommunities(text)).communities;
  const communities: CommunityTribute[] = comms.map(cv => {
    const tribute: CommunityTribute = {
      key: `!${cv.community.name}@${hostname(cv.community.actor_id)}`,
      view: cv,
    };
    return tribute;
  });
  return communities;
}

export function getRecipientIdFromProps(props: any): number {
  return props.match.params.recipient_id
    ? Number(props.match.params.recipient_id)
    : 1;
}

export function getIdFromProps(props: any): number | undefined {
  const id = props.match.params.post_id;
  return id ? Number(id) : undefined;
}

export function getCommentIdFromProps(props: any): number | undefined {
  const id = props.match.params.comment_id;
  return id ? Number(id) : undefined;
}

export function editCommentRes(data: CommentView, comments?: CommentView[]) {
  const found = comments?.find(c => c.comment.id == data.comment.id);
  if (found) {
    found.comment.content = data.comment.content;
    found.comment.distinguished = data.comment.distinguished;
    found.comment.updated = data.comment.updated;
    found.comment.removed = data.comment.removed;
    found.comment.deleted = data.comment.deleted;
    found.counts.upvotes = data.counts.upvotes;
    found.counts.downvotes = data.counts.downvotes;
    found.counts.score = data.counts.score;
  }
}

export function saveCommentRes(data: CommentView, comments?: CommentView[]) {
  const found = comments?.find(c => c.comment.id == data.comment.id);
  if (found) {
    found.saved = data.saved;
  }
}

export function updatePersonBlock(
  data: BlockPersonResponse,
  myUserInfo: MyUserInfo | undefined = UserService.Instance.myUserInfo
) {
  const mui = myUserInfo;
  if (mui) {
    if (data.blocked) {
      mui.person_blocks.push({
        person: mui.local_user_view.person,
        target: data.person_view.person,
      });
      toast(`${i18n.t("blocked")} ${data.person_view.person.name}`);
    } else {
      mui.person_blocks = mui.person_blocks.filter(
        i => i.target.id != data.person_view.person.id
      );
      toast(`${i18n.t("unblocked")} ${data.person_view.person.name}`);
    }
  }
}

export function updateCommunityBlock(
  data: BlockCommunityResponse,
  myUserInfo: MyUserInfo | undefined = UserService.Instance.myUserInfo
) {
  const mui = myUserInfo;
  if (mui) {
    if (data.blocked) {
      mui.community_blocks.push({
        person: mui.local_user_view.person,
        community: data.community_view.community,
      });
      toast(`${i18n.t("blocked")} ${data.community_view.community.name}`);
    } else {
      mui.community_blocks = mui.community_blocks.filter(
        i => i.community.id != data.community_view.community.id
      );
      toast(`${i18n.t("unblocked")} ${data.community_view.community.name}`);
    }
  }
}

export function createCommentLikeRes(
  data: CommentView,
  comments?: CommentView[]
) {
  const found = comments?.find(c => c.comment.id === data.comment.id);
  if (found) {
    found.counts.score = data.counts.score;
    found.counts.upvotes = data.counts.upvotes;
    found.counts.downvotes = data.counts.downvotes;
    if (data.my_vote !== null) {
      found.my_vote = data.my_vote;
    }
  }
}

export function createPostLikeFindRes(data: PostView, posts?: PostView[]) {
  const found = posts?.find(p => p.post.id == data.post.id);
  if (found) {
    createPostLikeRes(data, found);
  }
}

export function createPostLikeRes(data: PostView, post_view?: PostView) {
  if (post_view) {
    post_view.counts.score = data.counts.score;
    post_view.counts.upvotes = data.counts.upvotes;
    post_view.counts.downvotes = data.counts.downvotes;
    if (data.my_vote !== null) {
      post_view.my_vote = data.my_vote;
    }
  }
}

export function editPostFindRes(data: PostView, posts?: PostView[]) {
  const found = posts?.find(p => p.post.id == data.post.id);
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
    post.post.featured_community = data.post.featured_community;
    post.post.featured_local = data.post.featured_local;
    post.post.body = data.post.body;
    post.post.locked = data.post.locked;
    post.saved = data.saved;
  }
}

// TODO possible to make these generic?
export function updatePostReportRes(
  data: PostReportView,
  reports?: PostReportView[]
) {
  const found = reports?.find(p => p.post_report.id == data.post_report.id);
  if (found) {
    found.post_report = data.post_report;
  }
}

export function updateCommentReportRes(
  data: CommentReportView,
  reports?: CommentReportView[]
) {
  const found = reports?.find(
    c => c.comment_report.id == data.comment_report.id
  );
  if (found) {
    found.comment_report = data.comment_report;
  }
}

export function updatePrivateMessageReportRes(
  data: PrivateMessageReportView,
  reports?: PrivateMessageReportView[]
) {
  const found = reports?.find(
    c => c.private_message_report.id == data.private_message_report.id
  );
  if (found) {
    found.private_message_report = data.private_message_report;
  }
}

export function updateRegistrationApplicationRes(
  data: RegistrationApplicationView,
  applications?: RegistrationApplicationView[]
) {
  const found = applications?.find(
    ra => ra.registration_application.id == data.registration_application.id
  );
  if (found) {
    found.registration_application = data.registration_application;
    found.admin = data.admin;
    found.creator_local_user = data.creator_local_user;
  }
}

export function commentsToFlatNodes(comments: CommentView[]): CommentNodeI[] {
  const nodes: CommentNodeI[] = [];
  for (const comment of comments) {
    nodes.push({ comment_view: comment, children: [], depth: 0 });
  }
  return nodes;
}

export function convertCommentSortType(sort: SortType): CommentSortType {
  if (
    sort == "TopAll" ||
    sort == "TopDay" ||
    sort == "TopWeek" ||
    sort == "TopMonth" ||
    sort == "TopYear"
  ) {
    return "Top";
  } else if (sort == "New") {
    return "New";
  } else if (sort == "Hot" || sort == "Active") {
    return "Hot";
  } else {
    return "Hot";
  }
}

export function buildCommentsTree(
  comments: CommentView[],
  parentComment: boolean
): CommentNodeI[] {
  const map = new Map<number, CommentNodeI>();
  const depthOffset = !parentComment
    ? 0
    : getDepthFromComment(comments[0].comment) ?? 0;

  for (const comment_view of comments) {
    const depthI = getDepthFromComment(comment_view.comment) ?? 0;
    const depth = depthI ? depthI - depthOffset : 0;
    const node: CommentNodeI = {
      comment_view,
      children: [],
      depth,
    };
    map.set(comment_view.comment.id, { ...node });
  }

  const tree: CommentNodeI[] = [];

  // if its a parent comment fetch, then push the first comment to the top node.
  if (parentComment) {
    const cNode = map.get(comments[0].comment.id);
    if (cNode) {
      tree.push(cNode);
    }
  }

  for (const comment_view of comments) {
    const child = map.get(comment_view.comment.id);
    if (child) {
      const parent_id = getCommentParentId(comment_view.comment);
      if (parent_id) {
        const parent = map.get(parent_id);
        // Necessary because blocked comment might not exist
        if (parent) {
          parent.children.push(child);
        }
      } else {
        if (!parentComment) {
          tree.push(child);
        }
      }
    }
  }

  return tree;
}

export function getCommentParentId(comment?: CommentI): number | undefined {
  const split = comment?.path.split(".");
  // remove the 0
  split?.shift();

  return split && split.length > 1
    ? Number(split.at(split.length - 2))
    : undefined;
}

export function getDepthFromComment(comment?: CommentI): number | undefined {
  const len = comment?.path.split(".").length;
  return len ? len - 2 : undefined;
}

export function insertCommentIntoTree(
  tree: CommentNodeI[],
  cv: CommentView,
  parentComment: boolean
) {
  // Building a fake node to be used for later
  const node: CommentNodeI = {
    comment_view: cv,
    children: [],
    depth: 0,
  };

  const parentId = getCommentParentId(cv.comment);
  if (parentId) {
    const parent_comment = searchCommentTree(tree, parentId);
    if (parent_comment) {
      node.depth = parent_comment.depth + 1;
      parent_comment.children.unshift(node);
    }
  } else if (!parentComment) {
    tree.unshift(node);
  }
}

export function searchCommentTree(
  tree: CommentNodeI[],
  id: number
): CommentNodeI | undefined {
  for (const node of tree) {
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
  return undefined;
}

export const colorList: string[] = [
  hsl(0),
  hsl(50),
  hsl(100),
  hsl(150),
  hsl(200),
  hsl(250),
  hsl(300),
];

function hsl(num: number) {
  return `hsla(${num}, 35%, 50%, 1)`;
}

export function hostname(url: string): string {
  const cUrl = new URL(url);
  return cUrl.port ? `${cUrl.hostname}:${cUrl.port}` : `${cUrl.hostname}`;
}

export function validTitle(title?: string): boolean {
  // Initial title is null, minimum length is taken care of by textarea's minLength={3}
  if (!title || title.length < 3) return true;

  const regex = new RegExp(/.*\S.*/, "g");

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
  return typeof window !== "undefined";
}

export function setIsoData(context: any): IsoData {
  // If its the browser, you need to deserialize the data from the window
  if (isBrowser()) {
    return window.isoData;
  } else return context.router.staticContext;
}

export function wsSubscribe(parseMessage: any): Subscription | undefined {
  if (isBrowser()) {
    return WebSocketService.Instance.subject
      .pipe(retryWhen(errors => errors.pipe(delay(3000), take(10))))
      .subscribe(
        msg => parseMessage(msg),
        err => console.error(err),
        () => console.log("complete")
      );
  } else {
    return undefined;
  }
}

moment.updateLocale("en", {
  relativeTime: {
    future: "in %s",
    past: "%s ago",
    s: "<1m",
    ss: "%ds",
    m: "1m",
    mm: "%dm",
    h: "1h",
    hh: "%dh",
    d: "1d",
    dd: "%dd",
    w: "1w",
    ww: "%dw",
    M: "1M",
    MM: "%dM",
    y: "1Y",
    yy: "%dY",
  },
});

export function saveScrollPosition(context: any) {
  const path: string = context.router.route.location.pathname;
  const y = window.scrollY;
  sessionStorage.setItem(`scrollPosition_${path}`, y.toString());
}

export function restoreScrollPosition(context: any) {
  const path: string = context.router.route.location.pathname;
  const y = Number(sessionStorage.getItem(`scrollPosition_${path}`));
  window.scrollTo(0, y);
}

export function showLocal(isoData: IsoData): boolean {
  return isoData.site_res.site_view.local_site.federation_enabled;
}

export interface Choice {
  value: string;
  label: string;
  disabled?: boolean;
}

export function getUpdatedSearchId(id?: number | null, urlId?: number | null) {
  return id === null
    ? undefined
    : ((id ?? urlId) === 0 ? undefined : id ?? urlId)?.toString();
}

export function communityToChoice(cv: CommunityView): Choice {
  return {
    value: cv.community.id.toString(),
    label: communitySelectName(cv),
  };
}

export function personToChoice(pvs: PersonView): Choice {
  return {
    value: pvs.person.id.toString(),
    label: personSelectName(pvs),
  };
}

export async function fetchCommunities(q: string) {
  const form: Search = {
    q,
    type_: "Communities",
    sort: "TopAll",
    listing_type: "All",
    page: 1,
    limit: fetchLimit,
    auth: myAuth(false),
  };
  const client = new LemmyHttp(getHttpBase());
  return client.search(form);
}

export async function fetchUsers(q: string) {
  const form: Search = {
    q,
    type_: "Users",
    sort: "TopAll",
    listing_type: "All",
    page: 1,
    limit: fetchLimit,
    auth: myAuth(false),
  };
  const client = new LemmyHttp(getHttpBase());
  return client.search(form);
}

export function communitySelectName(cv: CommunityView): string {
  return cv.community.local
    ? cv.community.title
    : `${hostname(cv.community.actor_id)}/${cv.community.title}`;
}

export function personSelectName({
  person: { display_name, name, local, actor_id },
}: PersonView): string {
  const pName = display_name ?? name;
  return local ? pName : `${hostname(actor_id)}/${pName}`;
}

export function initializeSite(site?: GetSiteResponse) {
  UserService.Instance.myUserInfo = site?.my_user;
  i18n.changeLanguage(getLanguages()[0]);
  if (site) {
    setupEmojiDataModel(site.custom_emojis);
  }
  setupMarkdown();
}

const SHORTNUM_SI_FORMAT = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 3,
  //@ts-ignore
  notation: "compact",
  compactDisplay: "short",
});

export function numToSI(value: number): string {
  return SHORTNUM_SI_FORMAT.format(value);
}

export function isBanned(ps: Person): boolean {
  const expires = ps.ban_expires;
  // Add Z to convert from UTC date
  // TODO this check probably isn't necessary anymore
  if (expires) {
    if (ps.banned && new Date(expires + "Z") > new Date()) {
      return true;
    } else {
      return false;
    }
  } else {
    return ps.banned;
  }
}

export function myAuth(throwErr = true): string | undefined {
  return UserService.Instance.auth(throwErr);
}

export function enableDownvotes(siteRes: GetSiteResponse): boolean {
  return siteRes.site_view.local_site.enable_downvotes;
}

export function enableNsfw(siteRes: GetSiteResponse): boolean {
  return siteRes.site_view.local_site.enable_nsfw;
}

export function postToCommentSortType(sort: SortType): CommentSortType {
  switch (sort) {
    case "Active":
    case "Hot":
      return "Hot";
    case "New":
    case "NewComments":
      return "New";
    case "Old":
      return "Old";
    default:
      return "Top";
  }
}

export function canCreateCommunity(
  siteRes: GetSiteResponse,
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  const adminOnly = siteRes.site_view.local_site.community_creation_admin_only;
  // TODO: Make this check if user is logged on as well
  return !adminOnly || amAdmin(myUserInfo);
}

export function isPostBlocked(
  pv: PostView,
  myUserInfo: MyUserInfo | undefined = UserService.Instance.myUserInfo
): boolean {
  return (
    (myUserInfo?.community_blocks
      .map(c => c.community.id)
      .includes(pv.community.id) ||
      myUserInfo?.person_blocks
        .map(p => p.target.id)
        .includes(pv.creator.id)) ??
    false
  );
}

/// Checks to make sure you can view NSFW posts. Returns true if you can.
export function nsfwCheck(
  pv: PostView,
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  const nsfw = pv.post.nsfw || pv.community.nsfw;
  const myShowNsfw = myUserInfo?.local_user_view.local_user.show_nsfw ?? false;
  return !nsfw || (nsfw && myShowNsfw);
}

export function getRandomFromList<T>(list: T[]): T | undefined {
  return list.length == 0
    ? undefined
    : list.at(Math.floor(Math.random() * list.length));
}

/**
 * This shows what language you can select
 *
 * Use showAll for the site form
 * Use showSite for the profile and community forms
 * Use false for both those to filter on your profile and site ones
 */
export function selectableLanguages(
  allLanguages: Language[],
  siteLanguages: number[],
  showAll?: boolean,
  showSite?: boolean,
  myUserInfo = UserService.Instance.myUserInfo
): Language[] {
  const allLangIds = allLanguages.map(l => l.id);
  let myLangs = myUserInfo?.discussion_languages ?? allLangIds;
  myLangs = myLangs.length == 0 ? allLangIds : myLangs;
  const siteLangs = siteLanguages.length == 0 ? allLangIds : siteLanguages;

  if (showAll) {
    return allLanguages;
  } else {
    if (showSite) {
      return allLanguages.filter(x => siteLangs.includes(x.id));
    } else {
      return allLanguages
        .filter(x => siteLangs.includes(x.id))
        .filter(x => myLangs.includes(x.id));
    }
  }
}

export function uploadImage(image: File): Promise<UploadImageResponse> {
  const client = new LemmyHttp(getHttpBase());

  return client.uploadImage({ image });
}

interface EmojiMartCategory {
  id: string;
  name: string;
  emojis: EmojiMartCustomEmoji[];
}

interface EmojiMartCustomEmoji {
  id: string;
  name: string;
  keywords: string[];
  skins: EmojiMartSkin[];
}

interface EmojiMartSkin {
  src: string;
}

const groupBy = <T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => string
) =>
  array.reduce((acc, value, index, array) => {
    (acc[predicate(value, index, array)] ||= []).push(value);
    return acc;
  }, {} as { [key: string]: T[] });

export type QueryParams<T extends Record<string, any>> = {
  [key in keyof T]?: string;
};

export function getQueryParams<T extends Record<string, any>>(processors: {
  [K in keyof T]: (param: string) => T[K];
}): T {
  if (isBrowser()) {
    const searchParams = new URLSearchParams(window.location.search);

    return Array.from(Object.entries(processors)).reduce(
      (acc, [key, process]) => ({
        ...acc,
        [key]: process(searchParams.get(key)),
      }),
      {} as T
    );
  }

  return {} as T;
}

export function getQueryString<T extends Record<string, string | undefined>>(
  obj: T
) {
  return Object.entries(obj)
    .filter(([, val]) => val !== undefined && val !== null)
    .reduce(
      (acc, [key, val], index) => `${acc}${index > 0 ? "&" : ""}${key}=${val}`,
      "?"
    );
}

export function isAuthPath(pathname: string) {
  return /create_.*|inbox|settings|setup|admin|reports|registration_applications/g.test(
    pathname
  );
}

export function canShare() {
  return isBrowser() && !!navigator.canShare;
}

export function share(shareData: ShareData) {
  if (isBrowser()) {
    navigator.share(shareData);
  }
}
