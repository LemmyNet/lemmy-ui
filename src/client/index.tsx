import { initializeSite, setupDateFns } from "@utils/app";
import { BrowserRouter } from "@/inferno-router";
import { App } from "../shared/components/app/app";
import { hydrateRoot } from "react-dom/client";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";

async function startClient() {
  initializeSite(window.isoData.site_res);

  await setupDateFns();

  const wrapper = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  const root = document.getElementById("root");

  if (root) {
    hydrateRoot(root, wrapper);
  }
}

startClient();
