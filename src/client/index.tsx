import { hydrate } from "inferno-hydrate";
import { BrowserRouter } from "inferno-router";
import { GetSiteResponse } from "lemmy-js-client";
import { App } from "../shared/components/app/app";
import { convertWindowJson, initializeSite } from "../shared/utils";

const site = convertWindowJson(GetSiteResponse, window.isoData.site_res);
initializeSite(site);

const wrapper = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

hydrate(wrapper, document.getElementById("root"));
