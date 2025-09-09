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
import { getJwtCookie } from "server/utils/has-jwt-cookie";
import { authCookieName } from "@utils/config";
import { HttpService } from "@services/HttpService";
import { setIsoData, updateMyUserInfo } from "@utils/app";
import { refreshTheme } from "@utils/browser";

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

    // manually login
      const [site, myUser] = await Promise.all([
        HttpService.client.getSite(),
        HttpService.client.getMyUser(),
      ]);
    
      if (site.state === "success" && myUser.state === "success") {
        const isoData = setIsoData(null);
        updateMyUserInfo(myUser.data);
        isoData.siteRes.oauth_providers = site.data.oauth_providers;
        isoData.siteRes.admin_oauth_providers = site.data.admin_oauth_providers;
        refreshTheme();
      }
      
    root.dispatchEvent(new CustomEvent("lemmy-hydrated", { bubbles: true }));
    
  }
}

startClient();
