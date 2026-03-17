import { getStaticDir } from "@utils/env";
import { Helmet } from "inferno-helmet";
import { renderToString } from "inferno-server";
import serialize from "serialize-javascript";
import sharp from "sharp";
import { favIconPngUrl, favIconUrl } from "@utils/config";
import { IsoDataOptionalSite } from "@utils/types";
import { buildThemeList } from "./build-themes-list";
import { fetchIconPng } from "./fetch-icon-png";
import { findLanguageChunkNames } from "@services/I18NextService";
import path from "path";
import { readFileSync, existsSync } from "node:fs";
import { enableEruda } from "./dev-env";
import { Metadata } from "@utils/routes";
import { htmlToText } from "html-to-text";
import { md } from "@utils/markdown";

const customHtmlHeader = process.env["LEMMY_UI_CUSTOM_HTML_HEADER"] || "";

let appleTouchIcon: string | undefined = undefined;

function readEmbeddedScript() {
  const scriptFile = "./dist/js/embedded.js";
  const embeddedScript = readFileSync(path.resolve(scriptFile)).toString();
  if (existsSync(scriptFile + ".map")) {
    return `${embeddedScript}\n//# sourceMappingURL=${getStaticDir()}/js/embedded.js.map`;
  }
  return embeddedScript;
}

let embeddedScript = readEmbeddedScript();

export async function createSsrHtml(
  root: string,
  isoData: IsoDataOptionalSite,
  cspNonce: string,
  languages: readonly string[],
  current_url: string,
  metadata: Metadata,
  interfaceLanguage?: string,
) {
  const site = isoData.siteRes;

  if (process.env["NODE_ENV"] === "development") {
    embeddedScript = readEmbeddedScript();
  }

  const fallbackTheme = `<link rel="stylesheet" type="text/css" href="/css/themes/${
    (await buildThemeList())[0]
  }.css" />`;

  const customHtmlHeaderScriptTag = new RegExp("<script", "g");

  const customHtmlHeaderWithNonce = customHtmlHeader.replace(
    customHtmlHeaderScriptTag,
    `<script nonce="${cspNonce}"`,
  );

  if (!appleTouchIcon) {
    try {
      appleTouchIcon = site?.site_view.site.icon
        ? `data:image/png;base64,${await sharp(
            await fetchIconPng(site.site_view.site.icon),
          )
            .resize(180, 180)
            .extend({
              bottom: 20,
              top: 20,
              left: 20,
              right: 20,
              background: "#222222",
            })
            .png()
            .toBuffer()
            .then(buf => buf.toString("base64"))}`
        : favIconPngUrl;
    } catch {
      console.warn(
        "Could not fetch site logo for apple touch icon. Using default icon.",
      );
      appleTouchIcon = favIconPngUrl;
    }
  }

  const erudaStr = enableEruda
    ? renderToString(
        <>
          <script
            nonce={cspNonce}
            src="https://cdn.jsdelivr.net/npm/eruda/eruda.js"
          ></script>
          <script nonce={cspNonce}>eruda.init();</script>
        </>,
      )
    : "";

  const lazyScripts = findLanguageChunkNames(languages, interfaceLanguage)
    .filter(x => x !== undefined)
    .map(x => `${getStaticDir()}/js/${x}.client.js`)
    .map(x => `<link rel="preload" as="script" href="${x}" />`)
    .join("");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const helmet = Helmet.renderStatic();

  // data-bs-theme="light" lang="en"
  // TODO: use lang=I18NextService.i18n.resolvedLanguage
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const helmetAttr = helmet.htmlAttributes.toString();
  const helmetTitle = `<title>${metadata.title}</title>`;
  let helmetMeta = `<meta property="title" content="${metadata.title}">
  <meta property="og:title" content="${metadata.title}">
  <meta property="twitter:title" content="${metadata.title}">
  <meta property="og:url" content="${current_url}">
  <meta property="twitter:url" content="${current_url}">
  <meta property="og:type" content="website">
  <meta property="twitter:card" content="summary_large_image">\n`;
  if (metadata.image) {
    helmetMeta += `<meta key="og:image" property="og:image" content="${metadata.image}" />\n`;
    helmetMeta += `<meta key="twitter:image" property="twitter:image" content="${metadata.image}" />\n`;
  }
  if (metadata.description) {
    const desc = htmlToText(md.renderInline(metadata.description));
    helmetMeta += `<meta key="description" name="description" content="${desc}"/>\n`;
    helmetMeta += `<meta key="og:description" name="description" content="${desc}"/>\n`;
    helmetMeta += `<meta key="twitter:description" name="description" content="${desc}"/>\n`;
  }

  // <link rel="stylesheet" type="text/css" href="/css/themes/browser.css"><link rel="stylesheet" type="text/css" href="/css/code-themes/atom-one-light.css" media="(prefers-color-scheme: light)"><link rel="stylesheet" type="text/css" href="/css/code-themes/atom-one-dark.css" media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)">
  const helmetLink = `<link rel="canonical" href="${metadata.canonicalPath ?? current_url}">`;

  return `
    <!DOCTYPE html>
    <html ${helmetAttr}>
    <head>
    <script nonce="${cspNonce}">
    window.isoData = ${serialize(isoData)};

    ${embeddedScript}
    </script>
    ${lazyScripts}
  
    <!-- A remote debugging utility for mobile -->
    ${erudaStr}
  
    <!-- Custom injected script -->
    ${customHtmlHeaderWithNonce}
  
    ${helmetTitle}
    ${helmetMeta}
  
    <style>
    #app[data-adult-consent] {
      filter: blur(10px);
      -webkit-filter: blur(10px);
      -moz-filter: blur(10px);
      -o-filter: blur(10px);
      -ms-filter: blur(10px);
      pointer-events: none;
    }
    </style>

    <!-- Required meta tags -->
    <meta name="Description" content="Lemmy">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link
       id="favicon"
       rel="shortcut icon"
       type="image/x-icon"
       href=${site?.site_view.site.icon ?? favIconUrl}
     />
  
    <!-- Web app manifest -->
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href=${appleTouchIcon} />
    <link rel="apple-touch-startup-image" href=${appleTouchIcon} />
  
    <!-- Styles -->
    <link rel="stylesheet" type="text/css" href="${getStaticDir()}/styles/styles.css" />
  
    <!-- Current theme and more -->
    ${helmetLink || fallbackTheme}
    
    </head>
  
    <body>
      <noscript>
        <div class="alert alert-danger rounded-0" role="alert">
          <b>Javascript is disabled. Actions will not work.</b>
        </div>
      </noscript>
  
      <div id='root'>${root}</div>
      <script defer src='${getStaticDir()}/js/client.js'></script>
    </body>
  </html>
  `;
}
