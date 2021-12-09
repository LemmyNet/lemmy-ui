import express from "express";
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
        return res.redirect(`/login`);
      } else {
        return res.redirect(`/404?err=${errCode}`);
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

    const cspHtml = (
      <meta
        http-equiv="Content-Security-Policy"
        content="default-src data: 'self'; connect-src * ws: wss:; frame-src *; img-src * data:; script-src 'self'; style-src 'self' 'unsafe-inline'; manifest-src 'self'"
      />
    );

    const root = renderToString(wrapper);
    const symbols = renderToString(SYMBOLS);
    const cspStr = process.env.LEMMY_EXTERNAL_HOST
      ? renderToString(cspHtml)
      : "";
    const helmet = Helmet.renderStatic();

    const config: ILemmyConfig = { wsHost: process.env.LEMMY_WS_HOST };

    res.send(`
           <!DOCTYPE html>
           <html ${helmet.htmlAttributes.toString()} lang="en">
           <head>
           <script>window.isoData = ${serialize(isoData)}</script>
           <script>window.lemmyConfig = ${serialize(config)}</script>

           <!-- A remote debugging utility for mobile
           <script src="//cdn.jsdelivr.net/npm/eruda"></script>
           <script>eruda.init();</script>
           -->

           ${helmet.title.toString()}
           ${helmet.meta.toString()}

           <!-- Required meta tags -->
           <meta name="Description" content="Lemmy">
           <meta charset="utf-8">
           <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

           <!-- Content Security Policy -->
           ${cspStr}

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
    return res.redirect(`/404?err=${err}`);
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
