import { hydrate } from "inferno-hydrate";
import { Router } from "inferno-router";
import { App } from "../shared/components/app/app";
import { initializeSite } from "../shared/utils";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import { HistoryService } from "../shared/services/HistoryService";

const site = window.isoData.site_res;
initializeSite(site);

const wrapper = (
  <Router history={HistoryService.history}>
    <App />
  </Router>
);

const root = document.getElementById("root");
if (root) {
  hydrate(wrapper, root);
}
