import express from "express";
import { existsSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { IncomingHttpHeaders } from "http";
import { Helmet } from "inferno-helmet";
import { matchPath, StaticRouter } from "inferno-router";
import { renderToString } from "inferno-server";
import IsomorphicCookie from "isomorphic-cookie";
import { GetSite, GetSiteResponse, LemmyHttp, Site } from "lemmy-js-client";
import path from "path";
import process from "process";
import serialize from "serialize-javascript";
import sharp from "sharp";
import { App } from "../shared/components/app/app";
import { getHttpBase, getHttpBaseInternal } from "../shared/env";
import {
  ILemmyConfig,
  InitialFetchRequest,
  IsoDataOptionalSite,
} from "../shared/interfaces";
import { routes } from "../shared/routes";
import {
  ErrorPageData,
  favIconPngUrl,
  favIconUrl,
  initializeSite,
  isAuthPath,
} from "../shared/utils";

const server = express();
const [hostname, port] = process.env["LEMMY_UI_HOST"]
  ? process.env["LEMMY_UI_HOST"].split(":")
  : ["0.0.0.0", "1234"];
const extraThemesFolder =
  process.env["LEMMY_UI_EXTRA_THEMES_FOLDER"] || "./extra_themes";

if (!process.env["LEMMY_UI_DISABLE_CSP"] && !process.env["LEMMY_UI_DEBUG"]) {
  server.use(function (_req, res, next) {
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; manifest-src *; connect-src *; img-src * data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; form-action 'self'; base-uri 'self'; frame-src *`
    );
    next();
  });
}
const customHtmlHeader = process.env["LEMMY_UI_CUSTOM_HTML_HEADER"] || "";

server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use("/static", express.static(path.resolve("./dist")));

const robotstxt = `User-Agent: *
Disallow: /login
Disallow: /settings
Disallow: /create_community
Disallow: /create_post
Disallow: /create_private_message
Disallow: /inbox
Disallow: /setup
Disallow: /admin
Disallow: /password_change
Disallow: /search/
`;

server.get("/service-worker.js", async (_req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.resolve("./dist/service-worker.js"));
});

server.get("/robots.txt", async (_req, res) => {
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.send(robotstxt);
});

server.get("/css/themes/:name", async (req, res) => {
  res.contentType("text/css");
  const theme = req.params.name;
  if (!theme.endsWith(".css")) {
    res.statusCode = 400;
    res.send("Theme must be a css file");
  }

  const customTheme = path.resolve(`./${extraThemesFolder}/${theme}`);
  if (existsSync(customTheme)) {
    res.sendFile(customTheme);
  } else {
    const internalTheme = path.resolve(`./dist/assets/css/themes/${theme}`);

    // If the theme doesn't exist, just send litely
    if (existsSync(internalTheme)) {
      res.sendFile(internalTheme);
    } else {
      res.sendFile(path.resolve("./dist/assets/css/themes/litely.css"));
    }
  }
});

async function buildThemeList(): Promise<string[]> {
  const themes = ["darkly", "darkly-red", "litely", "litely-red"];
  if (existsSync(extraThemesFolder)) {
    const dirThemes = await readdir(extraThemesFolder);
    const cssThemes = dirThemes
      .filter(d => d.endsWith(".css"))
      .map(d => d.replace(".css", ""));
    themes.push(...cssThemes);
  }
  return themes;
}

server.get("/css/themelist", async (_req, res) => {
  res.type("json");
  res.send(JSON.stringify(await buildThemeList()));
});

// server.use(cookieParser());
server.get("/*", async (req, res) => {
  try {
    const activeRoute = routes.find(route => matchPath(req.path, route));
    let auth: string | undefined = IsomorphicCookie.load("jwt", req);

    const getSiteForm: GetSite = { auth };

    const headers = setForwardedHeaders(req.headers);
    const client = new LemmyHttp(getHttpBaseInternal(), headers);

    const { path, url, query } = req;

    // Get site data first
    // This bypasses errors, so that the client can hit the error on its own,
    // in order to remove the jwt on the browser. Necessary for wrong jwts
    let site: GetSiteResponse | undefined = undefined;
    let routeData: any[] = [];
    let errorPageData: ErrorPageData | undefined;
    try {
      let try_site: any = await client.getSite(getSiteForm);
      if (try_site.error == "not_logged_in") {
        console.error(
          "Incorrect JWT token, skipping auth so frontend can remove jwt cookie"
        );
        getSiteForm.auth = undefined;
        auth = undefined;
        try_site = await client.getSite(getSiteForm);
      }

      if (!auth && isAuthPath(path)) {
        res.redirect("/login");
        return;
      }

      site = try_site;
      initializeSite(site);

      if (site) {
        const initialFetchReq: InitialFetchRequest = {
          client,
          auth,
          path,
          query,
          site,
        };

        if (activeRoute?.fetchInitialData) {
          routeData = await Promise.all([
            ...activeRoute.fetchInitialData(initialFetchReq),
          ]);
        }
      }
    } catch (error) {
      errorPageData = getErrorPageData(error, site);
    }

    // Redirect to the 404 if there's an API error
    if (routeData[0] && routeData[0].error) {
      const error = routeData[0].error;
      console.error(error);
      if (error === "instance_is_private") {
        return res.redirect(`/signup`);
      } else {
        errorPageData = getErrorPageData(error, site);
      }
    }

    const isoData: IsoDataOptionalSite = {
      path,
      site_res: site,
      routeData,
      errorPageData,
    };

    const wrapper = (
      <StaticRouter location={url} context={isoData}>
        <App />
      </StaticRouter>
    );

    const root = renderToString(wrapper);

    res.send(await createSsrHtml(root, isoData));
  } catch (err) {
    // If an error is caught here, the error page couldn't even be rendered
    console.error(err);
    res.statusCode = 500;
    return res.send(
      process.env.NODE_ENV === "development" ? err.message : "Server error"
    );
  }
});

server.listen(Number(port), hostname, () => {
  console.log(`http://${hostname}:${port}`);
});

function setForwardedHeaders(headers: IncomingHttpHeaders): {
  [key: string]: string;
} {
  let out: { [key: string]: string } = {};
  if (headers.host) {
    out.host = headers.host;
  }
  let realIp = headers["x-real-ip"];
  if (realIp) {
    out["x-real-ip"] = realIp as string;
  }
  let forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    out["x-forwarded-for"] = forwardedFor as string;
  }

  return out;
}

process.on("SIGINT", () => {
  console.info("Interrupted");
  process.exit(0);
});

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const defaultLogoPathDirectory = path.join(
  process.cwd(),
  "dist",
  "assets",
  "icons"
);

export async function generateManifestBase64(site: Site) {
  const url = (
    process.env.NODE_ENV === "development"
      ? "http://localhost:1236/"
      : getHttpBase()
  ).replace(/\/$/g, "");
  const icon = site.icon ? await fetchIconPng(site.icon) : null;

  const manifest = {
    name: site.name,
    description: site.description ?? "A link aggregator for the fediverse",
    start_url: url,
    scope: url,
    display: "standalone",
    id: "/",
    background_color: "#222222",
    theme_color: "#222222",
    icons: await Promise.all(
      iconSizes.map(async size => {
        let src = await readFile(
          path.join(defaultLogoPathDirectory, `icon-${size}x${size}.png`)
        ).then(buf => buf.toString("base64"));

        if (icon) {
          src = await sharp(icon)
            .resize(size, size)
            .png()
            .toBuffer()
            .then(buf => buf.toString("base64"));
        }

        return {
          sizes: `${size}x${size}`,
          type: "image/png",
          src: `data:image/png;base64,${src}`,
          purpose: "any maskable",
        };
      })
    ),
  };

  return Buffer.from(JSON.stringify(manifest)).toString("base64");
}

async function fetchIconPng(iconUrl: string) {
  return await fetch(
    iconUrl.replace(/https?:\/\/[^\/]+/g, getHttpBaseInternal())
  )
    .then(res => res.blob())
    .then(blob => blob.arrayBuffer());
}

function getErrorPageData(error: Error, site?: GetSiteResponse) {
  const errorPageData: ErrorPageData = {};

  if (site) {
    errorPageData.error = error.message;
  }

  const adminMatrixIds = site?.admins
    .map(({ person: { matrix_user_id } }) => matrix_user_id)
    .filter(id => id) as string[] | undefined;
  if (adminMatrixIds && adminMatrixIds.length > 0) {
    errorPageData.adminMatrixIds = adminMatrixIds;
  }

  return errorPageData;
}

async function createSsrHtml(root: string, isoData: IsoDataOptionalSite) {
  const site = isoData.site_res;
  const appleTouchIcon = site?.site_view.site.icon
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

  const eruda = (
    <>
      <script src="//cdn.jsdelivr.net/npm/eruda"></script>
      <script>eruda.init();</script>
    </>
  );

  const erudaStr = process.env["LEMMY_UI_DEBUG"] ? renderToString(eruda) : "";

  const helmet = Helmet.renderStatic();

  const config: ILemmyConfig = { wsHost: process.env.LEMMY_UI_LEMMY_WS_HOST };

  return `
  <!DOCTYPE html>
  <html ${helmet.htmlAttributes.toString()} lang="en">
  <head>
  <script>window.isoData = ${JSON.stringify(isoData)}</script>
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
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link
     id="favicon"
     rel="shortcut icon"
     type="image/x-icon"
     href=${site?.site_view.site.icon ?? favIconUrl}
   />

  <!-- Web app manifest -->
  ${
    site &&
    `<link
        rel="manifest"
        href={${`data:application/manifest+json;base64,${await generateManifestBase64(
          site.site_view.site
        )}`}}
      />`
  }
  <link rel="apple-touch-icon" href=${appleTouchIcon} />
  <link rel="apple-touch-startup-image" href=${appleTouchIcon} />

  <!-- Styles -->
  <link rel="stylesheet" type="text/css" href="/static/styles/styles.css" />

  <!-- Current theme and more -->
  ${helmet.link.toString()}
  
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
