import { initializeSite } from "@utils/app";
import { hydrate } from "inferno-hydrate";
import { Router } from "inferno-router";
import { App } from "../shared/components/app/app";
import { HistoryService } from "../shared/services";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";

initializeSite(window.isoData.site_res);

const wrapper = (
  <Router history={HistoryService.history}>
    <App />
  </Router>
);

const root = document.getElementById("root");

if (root) {
  hydrate(wrapper, root);
}
