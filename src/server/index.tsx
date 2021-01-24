import serialize from 'serialize-javascript';
import express from 'express';
import { StaticRouter } from 'inferno-router';
import { renderToString } from 'inferno-server';
import { matchPath } from 'inferno-router';
import path from 'path';
import { App } from '../shared/components/app';
import { InitialFetchRequest, IsoData } from '../shared/interfaces';
import { routes } from '../shared/routes';
import IsomorphicCookie from 'isomorphic-cookie';
import { GetSite, LemmyHttp } from 'lemmy-js-client';
import process from 'process';
import { Helmet } from 'inferno-helmet';
import { initializeSite } from '../shared/initialize';
import { httpUri } from '../shared/env';
import { IncomingHttpHeaders } from 'http';
import { setOptionalAuth } from '../shared/utils';

const server = express();
const port = 1234;

server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use('/static', express.static(path.resolve('./dist')));

// server.use(cookieParser());

server.get('/*', async (req, res) => {
  const activeRoute = routes.find(route => matchPath(req.path, route)) || {};
  const context = {} as any;
  let auth: string = IsomorphicCookie.load('jwt', req);

  let getSiteForm: GetSite = {};
  setOptionalAuth(getSiteForm, auth);

  let promises: Promise<any>[] = [];

  let headers = setForwardedHeaders(req.headers);

  let initialFetchReq: InitialFetchRequest = {
    client: new LemmyHttp(httpUri, headers),
    auth,
    path: req.path,
  };

  // Get site data first
  let site = await initialFetchReq.client.getSite(getSiteForm);
  initializeSite(site);

  if (activeRoute.fetchInitialData) {
    promises.push(...activeRoute.fetchInitialData(initialFetchReq));
  }

  let routeData = await Promise.all(promises);

  // Redirect to the 404 if there's an API error
  if (routeData[0] && routeData[0].error) {
    let errCode = routeData[0].error;
    return res.redirect(`/404?err=${errCode}`);
  }

  let acceptLang = req.headers['accept-language']
    ? req.headers['accept-language'].split(',')[0]
    : 'en';
  let lang = !!site.my_user
    ? site.my_user.lang == 'browser'
      ? acceptLang
      : 'en'
    : acceptLang;

  let isoData: IsoData = {
    path: req.path,
    site_res: site,
    routeData,
    lang,
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
  const cspStr = process.env.LEMMY_EXTERNAL_HOST ? renderToString(cspHtml) : '';
  const helmet = Helmet.renderStatic();

  res.send(`
           <!DOCTYPE html>
           <html ${helmet.htmlAttributes.toString()} lang="en">
           <head>
           <script>window.isoData = ${serialize(isoData)}</script>

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

           <!-- Icons -->
           <link rel="shortcut icon" type="image/svg+xml" href="/static/assets/icons/favicon.svg" />
           <link rel="apple-touch-icon" href="/static/assets/icons/apple-touch-icon.png" />

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
});

server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

function setForwardedHeaders(
  headers: IncomingHttpHeaders
): { [key: string]: string } {
  let out = {
    host: headers.host,
  };
  if (headers['x-real-ip']) {
    out['x-real-ip'] = headers['x-real-ip'];
  }
  if (headers['x-forwarded-for']) {
    out['x-forwarded-for'] = headers['x-forwarded-for'];
  }

  return out;
}

process.on('SIGINT', () => {
  console.info('Interrupted');
  process.exit(0);
});
