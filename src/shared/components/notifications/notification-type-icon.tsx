import { InfernoNode } from "inferno";
import { NotificationView } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon } from "../common/icon";

interface NotificationTypeIconProps {
  item: NotificationView;
  isSentByMe: boolean;
}

const typeIconBoxStyle = { width: "32px", height: "32px" };

export function NotificationTypeIcon({
  item,
  isSentByMe,
}: NotificationTypeIconProps): InfernoNode {
  const boxClasses =
    "rounded-2 border border-light-subtle d-flex align-items-center justify-content-center flex-shrink-0";

  switch (item.notification.kind) {
    case "private_message": {
      const colorClasses = isSentByMe
        ? "bg-body-secondary text-muted"
        : "bg-primary bg-opacity-10 text-primary";

      return (
        <div
          className={`${boxClasses} ${colorClasses}`}
          style={typeIconBoxStyle}
          data-tippy-content={I18NextService.i18n.t("messages")}
          aria-label={I18NextService.i18n.t("messages")}
        >
          <Icon icon="mail" classes="icon-inline" />
        </div>
      );
    }
    case "reply":
      return (
        <div
          className={`${boxClasses} bg-info bg-opacity-10 text-info`}
          style={typeIconBoxStyle}
          data-tippy-content={I18NextService.i18n.t("replies")}
          aria-label={I18NextService.i18n.t("replies")}
        >
          <Icon icon="message-square" classes="icon-inline" />
        </div>
      );
    case "mention":
      return (
        <div
          className={`${boxClasses} bg-success bg-opacity-10 text-success fw-bold`}
          style={typeIconBoxStyle}
          data-tippy-content={I18NextService.i18n.t("mentions")}
          aria-label={I18NextService.i18n.t("mentions")}
        >
          @
        </div>
      );
    default:
      return (
        <div
          className={`${boxClasses} bg-body-secondary text-muted`}
          style={typeIconBoxStyle}
        >
          <Icon icon="bell" classes="icon-inline" />
        </div>
      );
  }
}
