import express from "express";
import fs from "fs";
import { IncomingHttpHeaders } from "http";
import { Helmet } from "inferno-helmet";
import { matchPath, StaticRouter } from "inferno-router";
import { renderToString } from "inferno-server";
import IsomorphicCookie from "isomorphic-cookie";
import { GetSite, GetSiteResponse, LemmyHttp } from "lemmy-js-client";
import path from "path";
import process from "process";
import serialize from "serialize-javascript";
import { App } from "../shared/components/app/app";
import { httpBaseInternal } from "../shared/env";
import {
  ILemmyConfig,
  InitialFetchRequest,
  IsoData,
} from "../shared/interfaces";
import { routes } from "../shared/routes";
import { initializeSite } from "../shared/utils";

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

server.get("/robots.txt", async (_req, res) => {
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.send(robotstxt);
});

server.get("/css/themes/:name", async (req, res) => {
  res.contentType("text/css");
  const theme = req.params.name;
  if (!theme.endsWith(".css")) {
    res.send("Theme must be a css file");
  }

  const customTheme = path.resolve(`./${extraThemesFolder}/${theme}`);
  if (fs.existsSync(customTheme)) {
    res.sendFile(customTheme);
  } else {
    const internalTheme = path.resolve(`./dist/assets/css/themes/${theme}`);

    // If the theme doesn't exist, just send litely
    if (fs.existsSync(internalTheme)) {
      res.sendFile(internalTheme);
    } else {
      res.sendFile(path.resolve("./dist/assets/css/themes/litely.css"));
    }
  }
});

function buildThemeList(): string[] {
  let themes = ["darkly", "darkly-red", "litely", "litely-red"];
  if (fs.existsSync(extraThemesFolder)) {
    let dirThemes = fs.readdirSync(extraThemesFolder);
    let cssThemes = dirThemes
      .filter(d => d.endsWith(".css"))
      .map(d => d.replace(".css", ""));
    themes.push(...cssThemes);
  }
  return themes;
}

server.get("/css/themelist", async (_req, res) => {
  res.type("json");
  res.send(JSON.stringify(buildThemeList()));
});

// server.use(cookieParser());
server.get("/*", async (req, res) => {
  try {
    const activeRoute = routes.find(route => matchPath(req.path, route));
    const context = {} as any;
    let auth: string | undefined = IsomorphicCookie.load("jwt", req);

    const getSiteForm: GetSite = { auth };

    const promises: Promise<any>[] = [];

    const headers = setForwardedHeaders(req.headers);
    const client = new LemmyHttp(httpBaseInternal, headers);

    // Get site data first
    // This bypasses errors, so that the client can hit the error on its own,
    // in order to remove the jwt on the browser. Necessary for wrong jwts
    let try_site: any = await client.getSite(getSiteForm);
    if (try_site.error == "not_logged_in") {
      console.error(
        "Incorrect JWT token, skipping auth so frontend can remove jwt cookie"
      );
      getSiteForm.auth = undefined;
      auth = undefined;
      try_site = await client.getSite(getSiteForm);
    }
    const site: GetSiteResponse = try_site;
    initializeSite(site);

    const initialFetchReq: InitialFetchRequest = {
      client,
      auth,
      path: req.path,
      query: req.query,
      site,
    };

    if (activeRoute?.fetchInitialData) {
      promises.push(...activeRoute.fetchInitialData(initialFetchReq));
    }

    const routeData = await Promise.all(promises);

    // Redirect to the 404 if there's an API error
    if (routeData[0] && routeData[0].error) {
      const error = routeData[0].error;
      console.error(error);
      if (error === "instance_is_private") {
        return res.redirect(`/signup`);
      } else {
        return res.send(`404: ${removeAuthParam(error)}`);
      }
    }

    const isoData: IsoData = {
      path: req.path,
      site_res: site,
      routeData,
    };

    const wrapper = (
      <StaticRouter location={req.url} context={isoData}>
        <App />
      </StaticRouter>
    );
    if (context.url) {
      return res.redirect(context.url);
    }

    const eruda = (
      <>
        <script src="//cdn.jsdelivr.net/npm/eruda"></script>
        <script>eruda.init();</script>
      </>
    );

    const erudaStr = process.env["LEMMY_UI_DEBUG"] ? renderToString(eruda) : "";
    const root = renderToString(wrapper);
    const helmet = Helmet.renderStatic();

    const config: ILemmyConfig = { wsHost: process.env.LEMMY_UI_LEMMY_WS_HOST };

    res.send(`
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

           <!-- Web app manifest -->
           <link rel="manifest" href="/static/assets/manifest.webmanifest">

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
`);
  } catch (err) {
    console.error(err);
    return res.send(`404: ${removeAuthParam(err)}`);
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

function removeAuthParam(err: any): string {
  return removeParam(err.toString(), "auth");
}

function removeParam(url: string, parameter: string): string {
  return url
    .replace(new RegExp("[?&]" + parameter + "=[^&#]*(#.*)?$"), "$1")
    .replace(new RegExp("([?&])" + parameter + "=[^&]*&"), "$1");
}
