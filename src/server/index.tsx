import { setupDateFns } from "@utils/app";
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
server.use(
  `/static/${process.env.COMMIT_HASH}`,
  express.static(path.resolve("./dist"))
);
server.use(setCacheControl);

if (!process.env["LEMMY_UI_DISABLE_CSP"] && !process.env["LEMMY_UI_DEBUG"]) {
  server.use(setDefaultCsp);
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
