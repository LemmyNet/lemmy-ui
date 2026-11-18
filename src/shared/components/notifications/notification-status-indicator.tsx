import type { InfernoNode } from "inferno";

import { NotificationView } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon } from "../common/icon";

const unreadDotStyle = { width: "10px", height: "10px" };
const typeIconBoxStyle = { width: "32px", height: "32px" };

interface NotificationStatusIndicatorProps {
  item: NotificationView;
  isSentByMe: boolean;
  isUnread: boolean;
}

interface NotificationTypeIconProps {
  item: NotificationView;
  isSentByMe: boolean;
}

export function NotificationStatusIndicator({
  item,
  isSentByMe,
  isUnread,
}: NotificationStatusIndicatorProps): InfernoNode {
  return (
    <div className="position-relative flex-shrink-0 align-self-start">
      <NotificationTypeIcon item={item} isSentByMe={isSentByMe} />
      {isUnread && (
        <span
          className="position-absolute top-0 start-100 translate-middle bg-primary rounded-circle border border-2 border-body"
          style={unreadDotStyle}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function NotificationTypeIcon({
  item,
  isSentByMe,
}: NotificationTypeIconProps): InfernoNode {
  const boxClasses =
    "rounded-2 border border-light-subtle d-flex align-items-center justify-content-center flex-shrink-0";
  const mailColorClasses = isSentByMe
    ? "bg-body-secondary text-muted"
    : "bg-primary bg-opacity-10 text-primary";

  switch (item.notification.kind) {
    case "private_message":
      return (
        <div
          className={`${boxClasses} ${mailColorClasses}`}
          style={typeIconBoxStyle}
          data-tippy-content={I18NextService.i18n.t("messages")}
          aria-label={I18NextService.i18n.t("messages")}
        >
          <Icon icon="mail" classes="icon-inline" />
        </div>
      );
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
