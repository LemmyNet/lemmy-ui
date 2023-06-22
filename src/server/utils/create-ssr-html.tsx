import { Helmet } from "inferno-helmet";
import { renderToString } from "inferno-server";
import serialize from "serialize-javascript";
import sharp from "sharp";
import { favIconPngUrl, favIconUrl } from "../../shared/config";
import { ILemmyConfig, IsoDataOptionalSite } from "../../shared/interfaces";
import { buildThemeList } from "./build-themes-list";
import { fetchIconPng } from "./fetch-icon-png";

const customHtmlHeader = process.env["LEMMY_UI_CUSTOM_HTML_HEADER"] || "";

let appleTouchIcon: string | undefined = undefined;

export async function createSsrHtml(
  root: string,
  isoData: IsoDataOptionalSite
) {
  const site = isoData.site_res;

  const fallbackTheme = `<link rel="stylesheet" type="text/css" href="/css/themes/${
    (await buildThemeList())[0]
  }.css" />`;

  if (!appleTouchIcon) {
    appleTouchIcon = site?.site_view.site.icon
      ? `data:image/png;base64,${sharp(
          await fetchIconPng(site.site_view.site.icon)
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
  }

  const erudaStr =
    process.env["LEMMY_UI_DEBUG"] === "true"
      ? renderToString(
          <>
            <script src="//cdn.jsdelivr.net/npm/eruda"></script>
            <script>eruda.init();</script>
          </>
        )
      : "";

  const helmet = Helmet.renderStatic();

  const config: ILemmyConfig = { wsHost: process.env.LEMMY_UI_LEMMY_WS_HOST };

  return `
    <!DOCTYPE html>
    <html ${helmet.htmlAttributes.toString()}>
    <head>
    <script>window.isoData = ${serialize(isoData)}</script>
    <script>window.lemmyConfig = ${serialize(config)}</script>
  
    <!-- A remote debugging utility for mobile -->
    ${erudaStr}
  
    <!-- Custom injected script -->
    ${customHtmlHeader}
  
    ${helmet.title.toString()}
    ${helmet.meta.toString()}
  
    <!-- Required meta tags -->
    <meta name="Description" content="Lemmy">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=yes">
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
    <link rel="stylesheet" type="text/css" href="/static/styles/styles.css" />
  
    <!-- Current theme and more -->
    ${helmet.link.toString() || fallbackTheme}
    
    </head>
  
    <body ${helmet.bodyAttributes.toString()}>
      <noscript>
        <div class="alert alert-danger rounded-0" role="alert">
          <b>Javascript is disabled. Actions will not work.</b>
        </div>
      </noscript>
  
      <div id='root'>${root}</div>
      <script defer src='/static/js/client.js'></script>
    </body>
  </html>
  `;
}
