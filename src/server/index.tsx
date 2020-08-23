import cookieParser = require("cookie-parser");
import * as serialize from "serialize-javascript";
import * as express from "express";
import { StaticRouter } from "inferno-router";
import { renderToString } from "inferno-server";
import path = require("path");
import App from "../client/components/App/App";
const server = express();
const port = 1234;

server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use("/static", express.static(path.resolve("./dist/client")));

server.use(cookieParser());

server.get("/*", (req, res) => {
   const context = {} as any;
   const isoData = {
     name: "fishing sux",
   }

   const wrapper = (
      <StaticRouter location={req.url} context={context}>
         <App name={isoData.name} />
      </StaticRouter>
   );
   if (context.url) {
      return res.redirect(context.url);
   }

   res.send(`
   <!doctype html>
   <html>
       <head>
       <title>My Universal App</title>
       <script>window.isoData = ${serialize(isoData)}</script>      
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
