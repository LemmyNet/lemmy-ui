import { I18NextService } from "@services/index";
import { Icon } from "./icon";
import { NoOptionI18nKeys } from "i18next";
import {
  CommunityNotificationsMode,
  PostNotificationsMode,
} from "lemmy-js-client";
import { Component, linkEvent } from "inferno";

interface CommonNotificationSelectProps<T extends string> {
  onChange(val: T): void;
  current: T;
}

interface NotificationSelectProps<T extends string>
  extends CommonNotificationSelectProps<T> {
  choices: Choice<T>[];
  showIcon?: boolean;
}

type Choice<T extends string> = {
  key: NoOptionI18nKeys;
  value: T;
};

class NotificationSelect<T extends string> extends Component<
  NotificationSelectProps<T>,
  any
> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <>
        {this.props.showIcon && <Icon icon="bell" classes="me-2" />}
        <select
          value={this.props.current}
          onChange={linkEvent(this, handleNotificationChange)}
          className="form-select w-100 text-truncate"
        >
          <option disabled aria-hidden="true">
            {I18NextService.i18n.t("notifications")}
          </option>
          {this.props.choices.map(choice => (
            <option value={choice.value}>
              {I18NextService.i18n.t(choice.key)}
            </option>
          ))}
        </select>
      </>
    );
  }
}

function handleNotificationChange<T extends string>(
  i: NotificationSelect<T>,
  event: any,
) {
  i.props.onChange(event.target.value);
}

const postNotifChoices: Choice<PostNotificationsMode>[] = [
  {
    key: "notification_mode_all_comments",
    value: "all_comments",
  },
  {
    key: "notification_mode_replies_and_mentions",
    value: "replies_and_mentions",
  },
  {
    key: "notification_mode_mute",
    value: "mute",
  },
];

export class PostNotificationSelect extends Component<
  CommonNotificationSelectProps<PostNotificationsMode>
> {
  render() {
    return (
      <NotificationSelect<PostNotificationsMode>
        onChange={this.props.onChange}
        choices={postNotifChoices}
        current={this.props.current}
        showIcon
      />
    );
  }
}

const communityNotifChoices: Choice<CommunityNotificationsMode>[] = [
  {
    key: "notification_mode_all_posts_and_comments",
    value: "all_posts_and_comments",
  },
  {
    key: "notification_mode_all_posts",
    value: "all_posts",
  },
  {
    key: "notification_mode_replies_and_mentions",
    value: "replies_and_mentions",
  },
  {
    key: "notification_mode_mute",
    value: "mute",
  },
];

export class CommunityNotificationSelect extends Component<
  CommonNotificationSelectProps<CommunityNotificationsMode>
> {
  render() {
    return (
      <NotificationSelect<CommunityNotificationsMode>
        onChange={this.props.onChange}
        choices={communityNotifChoices}
        current={this.props.current}
      />
    );
  }
}
