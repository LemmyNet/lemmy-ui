import { communitySearch, personSearch } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { debounce, groupBy } from "@utils/helpers";
import { CommunityTribute, PersonTribute } from "@utils/types";
import { Picker } from "emoji-mart";
import emojiShortName from "emoji-short-name";
import { CustomEmojiView } from "lemmy-js-client";
import { default as MarkdownIt } from "markdown-it";
import markdown_it_container from "markdown-it-container";
// import markdown_it_emoji from "markdown-it-emoji/bare";
import markdown_it_footnote from "markdown-it-footnote";
import markdown_it_html5_embed from "markdown-it-html5-embed";
import markdown_it_sub from "markdown-it-sub";
import markdown_it_sup from "markdown-it-sup";
import Renderer from "markdown-it/lib/renderer";
import Token from "markdown-it/lib/token";
import { getHttpBase } from "./env";

export let Tribute: any;

export let md: MarkdownIt = new MarkdownIt();

export let mdNoImages: MarkdownIt = new MarkdownIt();

export const customEmojis: EmojiMartCategory[] = [];

export let customEmojisLookup: Map<string, CustomEmojiView> = new Map<
  string,
  CustomEmojiView
>();

if (isBrowser()) {
  Tribute = require("tributejs");
}

export function mdToHtml(text: string) {
  return { __html: md.render(text) };
}

export function mdToHtmlNoImages(text: string) {
  return { __html: mdNoImages.render(text) };
}

export function mdToHtmlInline(text: string) {
  return { __html: md.renderInline(text) };
}

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

const html5EmbedConfig = {
  html5embed: {
    useImageSyntax: true, // Enables video/audio embed with ![]() syntax (default)
    attributes: {
      audio: 'controls preload="metadata"',
      video: 'width="100%" max-height="100%" controls loop preload="metadata"',
    },
  },
};

function localCommunityLinkParser(md) {
  const pattern =
    /(!\b[^@\s]+@[^@\s]+\.[^.\s]+\b)|\/c\/([^@\s]+)(@[^@\s]+\.[^.\s]+\b)?/g;

  md.core.ruler.push("replace-text", state => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "inline") {
        const token = tokens[i];

        const originalContent = token.content;

        let lastIndex = 0;
        originalContent.replace(
          pattern,
          (match, fullDomainMatch, name, domainTld, index) => {
            let url;
            // ex: !Testing@example.com
            if (fullDomainMatch) {
              const [name, domain, tld] = fullDomainMatch
                .slice(1)
                .split("@")
                .join(".")
                .split(".");
              url = `${getHttpBase()}/c/${name}@${domain}.${tld}`;
            } else {
              // ex: /c/Testing or /c/Testing@example.com
              url = `${getHttpBase()}/c/${name}${domainTld || ""}`;
            }

            const beforeContent = originalContent.slice(lastIndex, index);
            lastIndex = index + match.length;

            const beforeToken = new state.Token("text", "", 0);
            beforeToken.content = beforeContent;

            const linkOpenToken = new state.Token("link_open", "a", 1);
            linkOpenToken.attrs = [["href", url]];

            const textToken = new state.Token("text", "", 0);
            textToken.content = match;

            const linkCloseToken = new state.Token("link_close", "a", -1);

            const afterContent = originalContent.slice(lastIndex);
            const afterToken = new state.Token("text", "", 0);
            afterToken.content = afterContent;

            tokens.splice(i, 1);

            tokens.splice(
              i,
              0,
              beforeToken,
              linkOpenToken,
              textToken,
              linkCloseToken,
              afterToken
            );

            // Update i to skip the newly added tokens
            i += 4;
          }
        );
      }
    }
  });
}

export function setupMarkdown() {
  const markdownItConfig: MarkdownIt.Options = {
    html: false,
    linkify: true,
    typographer: true,
  };

  // const emojiDefs = Array.from(customEmojisLookup.entries()).reduce(
  //   (main, [key, value]) => ({ ...main, [key]: value }),
  //   {}
  // );
  md = new MarkdownIt(markdownItConfig)
    .use(markdown_it_sub)
    .use(markdown_it_sup)
    .use(markdown_it_footnote)
    .use(markdown_it_html5_embed, html5EmbedConfig)
    .use(markdown_it_container, "spoiler", spoilerConfig)
    .use(localCommunityLinkParser);
  // .use(markdown_it_emoji, {
  //   defs: emojiDefs,
  // });

  mdNoImages = new MarkdownIt(markdownItConfig)
    .use(markdown_it_sub)
    .use(markdown_it_sup)
    .use(markdown_it_footnote)
    .use(markdown_it_html5_embed, html5EmbedConfig)
    .use(markdown_it_container, "spoiler", spoilerConfig)
    .use(localCommunityLinkParser)
    // .use(markdown_it_emoji, {
    //   defs: emojiDefs,
    // })
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

export function setupEmojiDataModel(custom_emoji_views: CustomEmojiView[]) {
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
