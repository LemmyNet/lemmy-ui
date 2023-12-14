import { initializeSite, setupDateFns } from "@utils/app";
import { hydrate } from "inferno-hydrate";
import { BrowserRouter } from "@/inferno-router";
import { App } from "../shared/components/app/app";

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
    hydrate(wrapper, root);
  }
}

startClient();
