import { initializeSite, setupDateFns, setupRedux } from "@utils/app";
import { hydrate } from "inferno-hydrate";
import { BrowserRouter } from "inferno-router";
import { App } from "../shared/components/app/app";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";
import { Provider } from "inferno-redux";

async function startClient() {
  const windowData = window.isoData;
  delete window.isoData;

  initializeSite(windowData?.site_res);

  await setupDateFns();

  const store = setupRedux(windowData!);

  const wrapper = (
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  );

  const root = document.getElementById("root");

  if (root) {
    hydrate(wrapper, root);
  }
}

startClient();
