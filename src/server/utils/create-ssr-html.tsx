"use server";
import { getStaticDir } from "@utils/env";
import sharp from "sharp";
import { favIconPngUrl, favIconUrl } from "../../shared/config";
import { IsoDataOptionalSite } from "../../shared/interfaces";
import { buildThemeList } from "./build-themes-list";
import { fetchIconPng } from "./fetch-icon-png";

const customHtmlHeader = process.env["LEMMY_UI_CUSTOM_HTML_HEADER"] || "";

let appleTouchIcon: string | undefined = undefined;

export async function createSsrHtml(
  children: React.ReactNode,
  isoData: IsoDataOptionalSite,
  cspNonce: string,
) {
  const site = isoData.site_res;

  if (!appleTouchIcon) {
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
  }

  const erudaStr =
    process.env["LEMMY_UI_DEBUG"] === "true" ? (
      <>
        <script
          nonce={cspNonce}
          async
          src="//cdn.jsdelivr.net/npm/eruda"
        ></script>
        <script nonce={cspNonce}>eruda.init();</script>
      </>
    ) : (
      <></>
    );

  return (
    <html lang="en">
      <head>
        {customHtmlHeader}
        {erudaStr}

        <meta name="Description" content="Lemmy" />
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link
          id="favicon"
          rel="shortcut icon"
          type="image/x-icon"
          href={site?.site_view.site.icon ?? favIconUrl}
        />

        {/*<!-- Web app manifest -->*/}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href={appleTouchIcon} />
        <link rel="apple-touch-startup-image" href={appleTouchIcon} />
      </head>

      <body>
        <noscript>
          <div className="alert alert-danger rounded-0" role="alert">
            <b>Javascript is disabled. Actions will not work.</b>
          </div>
        </noscript>

        <div id="root">{children}</div>
      </body>
    </html>
  );
}
