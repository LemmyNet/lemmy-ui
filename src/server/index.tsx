import { setupDateFns } from "@utils/app";
import { getStaticDir } from "@utils/env";
import { VERSION } from "../shared/version";
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
import CodeThemeHandler from "./handlers/code-theme-handler";

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
server.get("/css/code-themes/:name", CodeThemeHandler);
server.get("/css/themelist", ThemesListHandler);
server.get("/*", CatchAllHandler);

const listener = server.listen(Number(port), hostname, () => {
  setupDateFns();
  console.log(`Lemmy-ui v{VERSION} started listening on http://${hostname}:${port}`);
});

const signals = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGTERM: 15,
};

const exit_signal = 128; // Fatal error signal code on Linux systems
const exit_timeout = 8000; // Because Docker SIGTERMs after 10 secs

const shutdown = (signal, value) => {
  // TODO: Should set a flag here for the listener to reject any further
  // incoming connections with a HTTP 503 error while shutting down.
  // Otherwise the connection count may not reach zero before timeout.
  listener.close(() => {
    console.log(`Lemmy stopped by ${signal} with value ${value}`);
    process.exit(exit_signal + value);
  });
  setTimeout(() => {
    console.error(
      `Could not close all connections in time, forcing shutdown because of ${signal}...`,
    );
    process.exit(exit_signal + value);
  }, exit_timeout);
};

for (const [signal, value] of Object.entries(signals)) {
  process.on(signal, () => {
    console.log(`Process received a ${signal} signal, shutting down...`);
    shutdown(signal, value);
  });
}
