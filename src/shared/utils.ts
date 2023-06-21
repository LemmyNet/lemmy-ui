import { isBrowser } from "@utils/browser";
import { debounce, groupBy } from "@utils/helpers";
import type { Choice } from "@utils/types";
import { Picker } from "emoji-mart";
import emojiShortName from "emoji-short-name";
import {
  BlockCommunityResponse,
  BlockPersonResponse,
  CommentSortType,
  CommunityView,
  CustomEmojiView,
  GetSiteResponse,
  Language,
  MyUserInfo,
  PersonView,
  PostView,
  SortType,
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
import tippy from "tippy.js";
import Toastify from "toastify-js";
import { i18n } from "./i18next";
import { VoteType } from "./interfaces";
import { UserService } from "./services";
import { RequestState } from "./services/HttpService";
let Tribute: any;
if (isBrowser()) {
  Tribute = require("tributejs");
}

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
export const trendingFetchLimit = 6;
export const mentionDropdownFetchLimit = 10;
export const commentTreeMaxDepth = 8;
export const markdownFieldCharacterLimit = 50000;
export const maxUploadImages = 20;
export const concurrentImageUpload = 4;
export const updateUnreadCountsInterval = 30000;

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

const customEmojis: EmojiMartCategory[] = [];
export let customEmojisLookup: Map<string, CustomEmojiView> = new Map<
  string,
  CustomEmojiView
>();

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

export function mdToHtml(text: string) {
  return { __html: md.render(text) };
}

export function mdToHtmlNoImages(text: string) {
  return { __html: mdNoImages.render(text) };
}

export function mdToHtmlInline(text: string) {
  return { __html: md.renderInline(text) };
}

export function toast(text: string, background: ThemeColor = "success") {
  if (isBrowser()) {
    const backgroundColor = `var(--bs-${background})`;
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

    const backgroundColor = `var(--bs-light)`;

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
  const defaultRenderer = md.renderer.rules.image;
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
  md.renderer.rules.table_open = function () {
    return '<table class="table">';
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

export function updatePersonBlock(
  data: BlockPersonResponse,
  myUserInfo: MyUserInfo | undefined = UserService.Instance.myUserInfo
) {
  if (myUserInfo) {
    if (data.blocked) {
      myUserInfo.person_blocks.push({
        person: myUserInfo.local_user_view.person,
        target: data.person_view.person,
      });
      toast(`${i18n.t("blocked")} ${data.person_view.person.name}`);
    } else {
      myUserInfo.person_blocks = myUserInfo.person_blocks.filter(
        i => i.target.id !== data.person_view.person.id
      );
      toast(`${i18n.t("unblocked")} ${data.person_view.person.name}`);
    }
  }
}

export function updateCommunityBlock(
  data: BlockCommunityResponse,
  myUserInfo: MyUserInfo | undefined = UserService.Instance.myUserInfo
) {
  if (myUserInfo) {
    if (data.blocked) {
      myUserInfo.community_blocks.push({
        person: myUserInfo.local_user_view.person,
        community: data.community_view.community,
      });
      toast(`${i18n.t("blocked")} ${data.community_view.community.name}`);
    } else {
      myUserInfo.community_blocks = myUserInfo.community_blocks.filter(
        i => i.community.id !== data.community_view.community.id
      );
      toast(`${i18n.t("unblocked")} ${data.community_view.community.name}`);
    }
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
  i18n.changeLanguage();
  if (site) {
    setupEmojiDataModel(site.custom_emojis ?? []);
  }
  setupMarkdown();
}

export function myAuthRequired(): string {
  return UserService.Instance.auth(true) ?? "";
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

export function isAuthPath(pathname: string) {
  return /create_.*|inbox|settings|admin|reports|registration_applications/g.test(
    pathname
  );
}

export function newVote(voteType: VoteType, myVote?: number): number {
  if (voteType == VoteType.Upvote) {
    return myVote == 1 ? 0 : 1;
  } else {
    return myVote == -1 ? 0 : -1;
  }
}

export type RouteDataResponse<T extends Record<string, any>> = {
  [K in keyof T]: RequestState<T[K]>;
};
