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
import { SYMBOLS } from "../shared/components/common/symbols";
import { httpBaseInternal } from "../shared/env";
import {
  ILemmyConfig,
  InitialFetchRequest,
  IsoData,
} from "../shared/interfaces";
import { routes } from "../shared/routes";
import { initializeSite, setOptionalAuth } from "../shared/utils";

const server = express();
const [hostname, port] = process.env["LEMMY_UI_HOST"]
  ? process.env["LEMMY_UI_HOST"].split(":")
  : ["0.0.0.0", "1234"];
const extraThemesFolder =
  process.env["LEMMY_UI_EXTRA_THEMES_FOLDER"] || "./extra_themes";

// server.use(function (_req, res, next) {
//   // in debug mode, websocket backend may be on another port, so we need to permit it in csp policy
//   var websocketBackend;
//   if (process.env.NODE_ENV == "development") {
//     websocketBackend = wsUriBase;
//   }
//   res.setHeader(
//     "Content-Security-Policy",
//     `default-src 'none'; connect-src 'self' ${websocketBackend}; img-src * data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; form-action 'self'; base-uri 'self'`
//   );
//   next();
// });
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
    res.sendFile(internalTheme);
  }
});

function buildThemeList(): string[] {
  let themes = [
    "litera",
    "materia",
    "minty",
    "solar",
    "united",
    "cyborg",
    "darkly",
    "darkly-red",
    "journal",
    "sketchy",
    "vaporwave",
    "vaporwave-dark",
    "i386",
    "litely",
    "litely-red",
    "nord",
  ];
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
    const activeRoute = routes.find(route => matchPath(req.path, route)) || {};
    const context = {} as any;
    let auth: string = IsomorphicCookie.load("jwt", req);

    let getSiteForm: GetSite = {};
    setOptionalAuth(getSiteForm, auth);

    let promises: Promise<any>[] = [];

    let headers = setForwardedHeaders(req.headers);

    let initialFetchReq: InitialFetchRequest = {
      client: new LemmyHttp(httpBaseInternal, headers),
      auth,
      path: req.path,
    };

    // Get site data first
    // This bypasses errors, so that the client can hit the error on its own,
    // in order to remove the jwt on the browser. Necessary for wrong jwts
    let try_site: any = await initialFetchReq.client.getSite(getSiteForm);
    if (try_site.error == "not_logged_in") {
      console.error(
        "Incorrect JWT token, skipping auth so frontend can remove jwt cookie"
      );
      delete getSiteForm.auth;
      delete initialFetchReq.auth;
      try_site = await initialFetchReq.client.getSite(getSiteForm);
    }
    let site: GetSiteResponse = try_site;
    initializeSite(site);

    if (activeRoute.fetchInitialData) {
      promises.push(...activeRoute.fetchInitialData(initialFetchReq));
    }

    let routeData = await Promise.all(promises);

    // Redirect to the 404 if there's an API error
    if (routeData[0] && routeData[0].error) {
      let errCode = routeData[0].error;
      console.error(errCode);
      if (errCode == "instance_is_private") {
        return res.redirect(`/signup`);
      } else {
        return res.send(`404: ${removeAuthParam(errCode)}`);
      }
    }

    let isoData: IsoData = {
      path: req.path,
      site_res: site,
      routeData,
    };

    const wrapper = (
      <StaticRouter location={req.url} context={isoData}>
        <App siteRes={isoData.site_res} />
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
    const symbols = renderToString(SYMBOLS);
    const helmet = Helmet.renderStatic();

    const config: ILemmyConfig = { wsHost: process.env.LEMMY_WS_HOST };

    res.send(`
           <!DOCTYPE html>
           <html ${helmet.htmlAttributes.toString()} lang="en">
           <head>
           <script>window.isoData = ${serialize(isoData)}</script>
           <script>window.lemmyConfig = ${serialize(config)}</script>

           <!-- A remote debugging utility for mobile -->
           ${erudaStr}

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
           
           <!-- Icons -->
           ${symbols}

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
  let out = {
    host: headers.host,
  };
  if (headers["x-real-ip"]) {
    out["x-real-ip"] = headers["x-real-ip"];
  }
  if (headers["x-forwarded-for"]) {
    out["x-forwarded-for"] = headers["x-forwarded-for"];
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
