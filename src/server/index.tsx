// import cookieParser = require('cookie-parser');
import serialize from 'serialize-javascript';
import express from 'express';
import { StaticRouter } from 'inferno-router';
import { renderToString } from 'inferno-server';
import { matchPath } from 'inferno-router';
import path from 'path';
import { App } from '../shared/components/app';
import { IsoData } from '../shared/interfaces';
import { routes } from '../shared/routes';
import IsomorphicCookie from 'isomorphic-cookie';
import { lemmyHttp, setAuth } from '../shared/utils';
import { GetSiteForm, GetSiteResponse } from 'lemmy-js-client';
import process from 'process';

const server = express();
const port = 1234;

server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use('/static', express.static(path.resolve('./dist')));

// server.use(cookieParser());

server.get('/*', async (req, res) => {
  const activeRoute = routes.find(route => matchPath(req.url, route)) || {};
  const context = {} as any;
  let auth: string = IsomorphicCookie.load('jwt', req);

  let getSiteForm: GetSiteForm = {};
  setAuth(getSiteForm, auth);

  let promises: Promise<any>[] = [];

  let siteData = lemmyHttp.getSite(getSiteForm);
  promises.push(siteData);
  if (activeRoute.fetchInitialData) {
    promises.push(...activeRoute.fetchInitialData(auth, req.path));
  }

  let resolver = await Promise.all(promises);
  let site: GetSiteResponse = resolver[0];
  let routeData = resolver.slice(1, resolver.length);

  let acceptLang = req.headers['accept-language'].split(',')[0];
  let lang = !!site.my_user
    ? site.my_user.lang == 'browser'
      ? acceptLang
      : 'en'
    : acceptLang;

  let isoData: IsoData = {
    path: req.path,
    site,
    routeData,
    lang,
  };

  const wrapper = (
    <StaticRouter location={req.url} context={isoData}>
      <App site={isoData.site} />
    </StaticRouter>
  );
  if (context.url) {
    return res.redirect(context.url);
  }

  res.send(`
           <!DOCTYPE html>
           <html lang="en">
           <head>
           <script>window.isoData = ${serialize(isoData)}</script>      

           <!-- Required meta tags -->
           <meta name="Description" content="Lemmy">
           <meta charset="utf-8">
           <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

           <!-- Web app manifest -->
           <link rel="manifest" href="/static/assets/manifest.webmanifest">

           <!-- Icons -->
           <link rel="shortcut icon" type="image/svg+xml" href="/static/assets/icons/favicon.svg" />
           <link rel="apple-touch-icon" href="/static/assets/icons/apple-touch-icon.png" />

           <!-- Styles -->
           <link rel="stylesheet" type="text/css" href="/static/styles/styles.css" />
           <link rel="stylesheet" type="text/css" href="/static/assets/css/themes/litely.min.css" id="default-light" media="(prefers-color-scheme: light)" />
           <link rel="stylesheet" type="text/css" href="/static/assets/css/themes/darkly.min.css" id="default-dark" media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)" />
           </head>

           <body>
             <noscript>
               <nav class="navbar fixed-bottom navbar-light bg-light">
                Javascript is disabled. Actions will not work.
               </nav>
             </noscript>
            
             <div id='root'>${renderToString(wrapper)}</div>
             <script src='/static/js/client.js'></script>
           </body>
         </html>
`);
});
let Server = server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

/**
 * Used to restart server by fuseBox
 */
export async function shutdown() {
  Server.close();
  Server = undefined;
}

process.on('SIGINT', () => {
  console.info('Interrupted');
  process.exit(0);
});
