import { SiteResponse } from "lemmy-js-client";
import { adultConsentLocalStorageKey } from "../../config";
import { UserService } from "../../services";
import { isBrowser } from "@utils/browser";

export default function shouldBlurNsfw(siteRes?: SiteResponse) {
  return siteRes?.site_view.site.content_warning
    ? !(
        (isBrowser() && localStorage.getItem(adultConsentLocalStorageKey)) ||
        UserService.Instance.myUserInfo
      )
    : UserService.Instance.myUserInfo?.local_user_view.local_user.blur_nsfw;
}
