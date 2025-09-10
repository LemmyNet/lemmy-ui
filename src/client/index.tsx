import { hydrate } from "inferno-hydrate";
import { BrowserRouter } from "inferno-router";
import App from "../shared/components/app/app";
import { lazyHighlightjs } from "@utils/lazy-highlightjs";
import { loadLanguageInstances } from "@services/I18NextService";
import { verifyDynamicImports } from "@utils/dynamic-imports";
import { setupEmojiDataModel, setupMarkdown } from "@utils/markdown";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";

async function startClient() {
  // Allows to test imports from the browser console.
  window.checkLazyScripts = () => {
    verifyDynamicImports(true).then(x => console.log(x));
  };

  window.history.scrollRestoration = "manual";

  setupMarkdown();
  lazyHighlightjs.enableLazyLoading();

  const fallbackLanguages = window.navigator.languages;
  const interfaceLanguage =
    window.isoData?.myUserInfo?.local_user_view.local_user.interface_language;

  // Make sure the language is loaded before hydration.
  const [[dateFnsLocale, i18n]] = await Promise.all([
    loadLanguageInstances(fallbackLanguages, interfaceLanguage),
    setupEmojiDataModel(),
  ]);

  const wrapper = (
    <BrowserRouter>
      <App dateFnsLocale={dateFnsLocale} i18n={i18n} />
    </BrowserRouter>
  );

  const root = document.getElementById("root");

  if (root) {
    hydrate(wrapper, root);

    root.dispatchEvent(new CustomEvent("lemmy-hydrated", { bubbles: true }));
  }
}

startClient();
