import { Component, InfernoNode, linkEvent } from "inferno";
import {
  ModlogView,
  MyUserInfo,
  Notification,
  MarkNotificationAsRead,
} from "lemmy-js-client";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { tippyMixin } from "../mixins/tippy-mixin";
import { mark_as_read_i18n } from "@utils/app";
import { processModlogEntry } from "@components/modlog";

interface NotificationModlogItemState {
  readLoading: boolean;
}

interface NotificationModlogItemProps {
  myUserInfo: MyUserInfo | undefined;
  notification: Notification;
  modlog_view: ModlogView;
  onMarkRead(form: MarkNotificationAsRead): void;
}

@tippyMixin
export class NotificationModlogItem extends Component<
  NotificationModlogItemProps,
  NotificationModlogItemState
> {
  state: NotificationModlogItemState = {
    readLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: Readonly<
      { children?: InfernoNode } & NotificationModlogItemProps
    >,
  ) {
    if (this.props.modlog_view !== nextProps.modlog_view) {
      this.setState({ readLoading: false });
    }
  }

  render() {
    const {
      modlog: { published_at },
      data,
    } = processModlogEntry(this.props.modlog_view, this.props.myUserInfo);
    return (
      <div>
        <span className="mt-2 me-1">
          <MomentTime published={published_at} />
        </span>
        <span>{data}</span>
        <ul className="list-inline mb-0 text-muted fw-bold">
          <li className="list-inline-item">
            <button
              type="button"
              className="btn btn-link btn-animate text-muted"
              onClick={linkEvent(this, this.handleMarkAsRead)}
              data-tippy-content={mark_as_read_i18n(
                this.props.notification.read,
              )}
              aria-label={mark_as_read_i18n(this.props.notification.read)}
            >
              {this.state.readLoading ? (
                <Spinner />
              ) : (
                <Icon
                  icon="check"
                  classes={`icon-inline ${
                    this.props.notification.read && "text-success"
                  }`}
                />
              )}
            </button>
          </li>
        </ul>
      </div>
    );
  }

  handleMarkAsRead(i: NotificationModlogItem) {
    const n = i.props.notification;
    i.props.onMarkRead({ notification_id: n.id, read: !n.read });
  }
}
