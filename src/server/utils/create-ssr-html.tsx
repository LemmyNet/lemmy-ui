import { getStaticDir } from "@utils/env";
import { Helmet } from "inferno-helmet";
import { renderToString } from "inferno-server";
import serialize from "serialize-javascript";
import sharp from "sharp";
import { favIconPngUrl, favIconUrl } from "@utils/config";
import { IsoDataOptionalSite } from "@utils/types";
import { fetchIconPng } from "./fetch-icon-png";
import { findLanguageChunkNames } from "@services/I18NextService";
import path from "path";
import { readFileSync } from "node:fs";

const customHtmlHeader = process.env["LEMMY_UI_CUSTOM_HTML_HEADER"] || "";

let appleTouchIcon: string | undefined = undefined;

let embeddedScript = readFileSync(path.resolve("./dist/js/embedded.js"));

export async function createSsrHtml(
  root: string,
  isoData: IsoDataOptionalSite,
  cspNonce: string,
  languages: readonly string[],
  interfaceLanguage?: string,
) {
  const site = isoData.siteRes;

  if (process.env["NODE_ENV"] === "development") {
    embeddedScript = readFileSync(path.resolve("./dist/js/embedded.js"));
  }

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

  const erudaStr =
    process.env["NODE_ENV"] === "development"
      ? renderToString(
          <>
            <script
              nonce={cspNonce}
              src="//cdn.jsdelivr.net/npm/eruda"
            ></script>
            <script nonce={cspNonce}>eruda.init();</script>
          </>,
        )
      : "";

  const helmet = Helmet.renderStatic();

  const lazyScripts = findLanguageChunkNames(languages, interfaceLanguage)
    .filter(x => x !== undefined)
    .map(x => `${getStaticDir()}/js/${x}.client.js`)
    .map(x => `<link rel="preload" as="script" href="${x}" />`)
    .join("");

  // Construct this manually instead of using `helmet.link.toString() ||fallbackTheme`. This
  // prevents loading unnecessary atom-one css files and uses deferred loading.
  // TODO: add canonical link back
  const helmetStyles = `<link data-inferno-helmet="true" rel="stylesheet" href="/css/themes/browser.css" media="print" onload="this.media='all'">`;

  return `
    <!DOCTYPE html>
    <html ${helmet.htmlAttributes.toString()}>
    <head>
    <!-- Required meta tags -->
  
    ${helmet.title.toString()}
    ${helmet.meta.toString()}

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
    
    </head>
  
    <body ${helmet.bodyAttributes.toString()}>
      <noscript>
        <div class="alert alert-danger rounded-0" role="alert">
          <b>Javascript is disabled. Actions will not work.</b>
        </div>
      </noscript>
  
      <div id='root'>${root}</div>
      <script defer src='${getStaticDir()}/js/client.js'></script>
    </body>
    <script nonce="${cspNonce}">
    window.isoData = ${serialize(isoData)};

    ${embeddedScript}
    </script>
    ${lazyScripts}
  
    <!-- A remote debugging utility for mobile -->
    ${erudaStr}
  
    <!-- Custom injected script -->
    ${customHtmlHeaderWithNonce}
  
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
  
    <!-- Current theme and more -->
    ${helmetStyles}

    <!-- 
      Styles 
      https://www.filamentgroup.com/lab/load-css-simpler/
    -->
    <link rel="stylesheet" href="${getStaticDir()}/styles/styles.css" media="print" onload="this.media='all'">

  
  </html>
  `;
}
