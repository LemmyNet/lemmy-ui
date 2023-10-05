import { setupDateFns } from "@utils/app";
import { getStaticDir } from "@utils/env";
import express from "express";
import path from "path";
import process from "process";
import CatchAllHandler from "./handlers/catch-all-handler";
import ManifestHandler from "./handlers/manifest-handler";
import RobotsHandler from "./handlers/robots-handler";
import SecurityHandler from "./handlers/security-handler";
import ServiceWorkerHandler from "./handlers/service-worker-handler";
import ThemeHandler from "./handlers/theme-handler";
import ThemesListHandler from "./handlers/themes-list-handler";
import { setCacheControl, setDefaultCsp } from "./middleware";

const server = express();

const [hostname, port] = process.env["LEMMY_UI_HOST"]
  ? process.env["LEMMY_UI_HOST"].split(":")
  : ["0.0.0.0", "1234"];

server.use(express.json());
server.use(express.urlencoded({ extended: false }));

const serverPath = path.resolve("./dist");

if (
  !process.env["LEMMY_UI_DISABLE_CSP"] &&
  !process.env["LEMMY_UI_DEBUG"] &&
  process.env["NODE_ENV"] !== "development"
) {
  server.use(
    getStaticDir(),
    express.static(serverPath, {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      immutable: true,
    }),
  );
  server.use(setDefaultCsp);
  server.use(setCacheControl);
} else {
  // In debug mode, don't use the maxAge and immutable, or it breaks live reload for dev
  server.use(getStaticDir(), express.static(serverPath));
}

server.get("/.well-known/security.txt", SecurityHandler);
server.get("/robots.txt", RobotsHandler);
server.get("/service-worker.js", ServiceWorkerHandler);
server.get("/manifest.webmanifest", ManifestHandler);
server.get("/css/themes/:name", ThemeHandler);
server.get("/css/themelist", ThemesListHandler);
server.get("/*", CatchAllHandler);

server.listen(Number(port), hostname, () => {
  setupDateFns();
  console.log(`http://${hostname}:${port}`);
});

process.on("SIGINT", () => {
  console.info("Interrupted");
  process.exit(0);
});
