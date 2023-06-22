import { initializeSite } from "@utils/app";
import setDefaultOptions from "date-fns/setDefaultOptions";
import { hydrate } from "inferno-hydrate";
import { Router } from "inferno-router";
import { App } from "../shared/components/app/app";
import { HistoryService, I18NextService } from "../shared/services";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";

async function startClient() {
  initializeSite(window.isoData.site_res);

  const lang = I18NextService.i18n.language;
  const locale = (
    await import(
      /* webpackExclude: /\.js\.flow$/ */
      `date-fns/locale/${lang}`
    )
  ).default;

  setDefaultOptions({
    locale,
  });

  const wrapper = (
    <Router history={HistoryService.history}>
      <App />
    </Router>
  );

  const root = document.getElementById("root");

  if (root) {
    hydrate(wrapper, root);
  }
}

startClient();
