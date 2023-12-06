import { GetSiteResponse } from "lemmy-js-client";
import { setupEmojiDataModel, setupMarkdown } from "../../markdown";
import { I18NextService } from "../../services";
import { updateDataBsTheme } from "@utils/browser";
import { LanguageDetector } from "shared/services/I18NextService";

export default function initializeSite(site?: GetSiteResponse) {
  updateDataBsTheme(site);

  // TODO test this
  const ld = new LanguageDetector();
  ld.setupMyLanguages(site?.my_user);

  I18NextService.i18n.changeLanguage();
  if (site) {
    setupEmojiDataModel(site.custom_emojis ?? []);
  }
  setupMarkdown();
}
