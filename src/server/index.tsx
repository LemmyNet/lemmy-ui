import cookieParser = require('cookie-parser');
import serialize from 'serialize-javascript';
import express from 'express';
import { StaticRouter } from 'inferno-router';
import { renderToString } from 'inferno-server';
import { matchPath } from 'inferno-router';
import path = require('path');
import { App } from '../shared/components/app';
import { routes } from '../shared/routes';
import IsomorphicCookie from 'isomorphic-cookie';
const server = express();
const port = 1234;

server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use('/assets', express.static(path.resolve('./dist/assets')));
server.use('/static', express.static(path.resolve('./dist/client')));

server.use(cookieParser());

server.get('/*', (req, res) => {
  const activeRoute = routes.find(route => matchPath(req.url, route)) || {};
  console.log(activeRoute);
  const context = {} as any;
  const isoData = {
    name: 'fishing sux',
  };
  let auth: string = IsomorphicCookie.load('jwt', req);

  const wrapper = (
    <StaticRouter location={req.url} context={context}>
      <App />
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

           <!-- Icons -->
           <link rel="shortcut icon" type="image/svg+xml" href="/assets/favicon.svg" />
           <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />

           <!-- Styles -->
           <link rel="stylesheet" type="text/css" href="/assets/css/tribute.css" />
           <link rel="stylesheet" type="text/css" href="/assets/css/toastify.css" />
           <link rel="stylesheet" type="text/css" href="/assets/css/choices.min.css" />
           <link rel="stylesheet" type="text/css" href="/assets/css/tippy.css" />
           <link rel="stylesheet" type="text/css" href="/assets/css/themes/litely.min.css" id="default-light" media="(prefers-color-scheme: light)" />
           <link rel="stylesheet" type="text/css" href="/assets/css/themes/darkly.min.css" id="default-dark" media="(prefers-color-scheme: no-preference), (prefers-color-scheme: dark)" />
           <link rel="stylesheet" type="text/css" href="/assets/css/main.css" />

           <!-- Scripts -->
           <script async src="/assets/libs/sortable/sortable.min.js"></script>
           </head>

           <body>
             <div id='root'>${renderToString(wrapper)}</div>
             <script src='./static/bundle.js'></script>
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
