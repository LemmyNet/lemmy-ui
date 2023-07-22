import { NoOptionI18nKeys } from "i18next";
import { MouseEventHandler } from "inferno";
import { SubscribedType } from "lemmy-js-client";
import { I18NextService, UserService } from "../../services";
import { Icon, Spinner } from "./icon";

interface SubscribeButtonProps {
  subscribed: SubscribedType;
  onFollow: MouseEventHandler;
  onUnFollow: MouseEventHandler;
  loading: boolean;
}

export function SubscribeButton({
  subscribed,
  onFollow,
  onUnFollow,
  loading,
}: SubscribeButtonProps) {
  let i18key: NoOptionI18nKeys;

  switch (subscribed) {
    case "NotSubscribed": {
      i18key = "subscribe";

      break;
    }
    case "Subscribed": {
      i18key = "joined";

      break;
    }
    default: {
      i18key = "subscribe_pending";

      break;
    }
  }

  if (!UserService.Instance.myUserInfo) {
    return (
      <button type="button" className="btn btn-secondary d-block mb-2 w-100">
        {I18NextService.i18n.t("subscribe")}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn-${
        subscribed === "Pending" ? "warning" : "secondary"
      } d-block mb-2 w-100`}
      onClick={subscribed === "NotSubscribed" ? onFollow : onUnFollow}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {subscribed === "Subscribed" && (
            <Icon icon="check" classes="icon-inline me-1" />
          )}
          {I18NextService.i18n.t(i18key)}
        </>
      )}
    </button>
  );
}
