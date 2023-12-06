import { isBrowser } from "@utils/browser";
import { toast } from "../../../shared/toast";
import { I18NextService } from "../../services";

export default function myAuth(throwErr = false): string | undefined {
  if (auth) {
    return auth;
  } else {
    const msg = "No JWT cookie found";

    if (throwErr && isBrowser()) {
      console.error(msg);
      toast(I18NextService.i18n.t("not_logged_in"), "danger");
    }

    return undefined;
  }
}
