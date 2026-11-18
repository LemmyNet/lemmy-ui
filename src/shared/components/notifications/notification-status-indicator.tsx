import type { InfernoNode } from 'inferno';

const unreadDotStyle = { width: "10px", height: "10px" };

interface NotificationStatusIndicatorProps {
  icon: InfernoNode;
  isUnread: boolean;
}

export function NotificationStatusIndicator({
  icon,
  isUnread,
}: NotificationStatusIndicatorProps): InfernoNode {
  return (
    <div className="position-relative flex-shrink-0 align-self-start">
      {icon}
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
