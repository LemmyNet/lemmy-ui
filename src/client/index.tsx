import { initializeSite, setupDateFns } from "@utils/app";
import { hydrate } from "inferno-hydrate";
import { Router } from "inferno-router";
import { App } from "../shared/components/app/app";
import { HistoryService, UserService } from "../shared/services";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";

async function startClient() {
  initializeSite(window.isoData.site_res);

  await setupDateFns();

  const wrapper = (
    <Router history={HistoryService.history}>
      <App user={UserService.Instance.myUserInfo} />
    </Router>
  );

  const root = document.getElementById("root");

  if (root) {
    hydrate(wrapper, root);
  }
}

startClient();
