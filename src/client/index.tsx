import { hydrate } from "inferno-hydrate";
import { BrowserRouter } from "inferno-router";
import { App } from "../shared/components/app/app";
import { initializeSite } from "../shared/utils";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";

const site = window.isoData.site_res;
initializeSite(site);

const wrapper = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

const root = document.getElementById("root");
if (root) {
  hydrate(wrapper, root);
}
