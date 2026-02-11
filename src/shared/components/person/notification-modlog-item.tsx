import { Component, InfernoNode } from "inferno";
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
import { PersonListing } from "./person-listing";
import { I18NextService } from "@services/index";

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
  // TODO get rid
  state: NotificationModlogItemState = {
    readLoading: false,
  };

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
      moderator,
      data,
    } = processModlogEntry(this.props.modlog_view, this.props.myUserInfo);
    return (
      <div className="border-top border-light">
        <div className="row text-muted small" role="group">
          <div className="col flex-grow-1">
            {moderator ? (
              <PersonListing
                person={moderator}
                banned={false}
                myUserInfo={this.props.myUserInfo}
              />
            ) : (
              I18NextService.i18n.t("mod")
            )}
          </div>
          <div className="col-auto">
            <MomentTime published={published_at} showAgo={false} />
          </div>
        </div>
        <span>{data}</span>
        <div className="row row-cols-auto align-items-center g-3 mb-2 mt-1 justify-content-end justify-content-md-start">
          <div className="col">
            <button
              type="button"
              className="btn btn-sm border-light-subtle btn-animate text-muted"
              onClick={() => this.handleMarkAsRead(this)}
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
          </div>
        </div>
      </div>
    );
  }

  handleMarkAsRead(i: NotificationModlogItem) {
    const n = i.props.notification;
    i.props.onMarkRead({ notification_id: n.id, read: !n.read });
  }
}
