import { hydrate } from "inferno-hydrate";
import { BrowserRouter } from "inferno-router";
import App from "../shared/components/app/app";
import { lazyHighlightjs } from "@utils/lazy-highlightjs";
import { loadLanguageInstances } from "@services/I18NextService";
import { verifyDynamicImports } from "@utils/dynamic-imports";
import { setupMarkdown } from "@utils/markdown";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";
import { createRef } from "inferno";

window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
  ev.preventDefault();
  console.error("Unhandled promise rejection:", ev.reason);
});

async function startClient() {
  // Allows to test imports from the browser console.
  window.checkLazyScripts = async () => {
    await verifyDynamicImports(true).then(x => console.debug(x));
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
  ]);

  const rootRef = createRef<HTMLDivElement>();
  const wrapper = (
    <BrowserRouter>
      <App dateFnsLocale={dateFnsLocale} i18n={i18n} rootRef={rootRef} />
    </BrowserRouter>
  );

  if (rootRef.current) {
    hydrate(wrapper, rootRef.current);

    rootRef.current.dispatchEvent(
      new CustomEvent("lemmy-hydrated", { bubbles: true }),
    );
  }
}

await startClient();
