import { initializeSite } from "@utils/app";
import { hydrate } from "inferno-hydrate";
import { BrowserRouter } from "inferno-router";
import App from "../shared/components/app/app";
import { lazyHighlightjs } from "../shared/lazy-highlightjs";
import { loadUserLanguage } from "../shared/services/I18NextService";
import { verifyDynamicImports } from "../shared/dynamic-imports";
import { setupEmojiDataModel } from "../shared/markdown";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";

async function startClient() {
  // Allows to test imports from the browser console.
  window.checkLazyScripts = () => {
    verifyDynamicImports(true).then(x => console.log(x));
  };

  window.history.scrollRestoration = "manual";

  initializeSite(window.isoData.site_res);

  lazyHighlightjs.enableLazyLoading();

  await Promise.all([loadUserLanguage(), setupEmojiDataModel()]);

  const wrapper = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  const root = document.getElementById("root");

  if (root) {
    hydrate(wrapper, root);

    root.dispatchEvent(new CustomEvent("lemmy-hydrated", { bubbles: true }));
  }
}

startClient();
