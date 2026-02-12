import {
  CommunityNotificationsMode,
  PostNotificationsMode,
} from "lemmy-js-client";
import { FilterChipDropdown, FilterOption } from "./filter-chip-dropdown";

const postNotifOptions: FilterOption<PostNotificationsMode>[] = [
  {
    i18n: "notification_mode_all_comments",
    value: "all_comments",
  },
  {
    i18n: "notification_mode_replies_and_mentions",
    value: "replies_and_mentions",
  },
  {
    i18n: "notification_mode_mute",
    value: "mute",
  },
];
type PostNotificationDropdownProps = {
  currentOption: PostNotificationsMode;
  onSelect: (val: PostNotificationsMode) => void;
  className?: string;
};
export function PostNotificationsDropdown({
  currentOption,
  onSelect,
  className,
}: PostNotificationDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={postNotifOptions}
      currentOption={postNotifOptions.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}

const communityNotifOptions: FilterOption<CommunityNotificationsMode>[] = [
  {
    i18n: "notification_mode_all_posts_and_comments",
    value: "all_posts_and_comments",
  },
  {
    i18n: "notification_mode_all_posts",
    value: "all_posts",
  },
  {
    i18n: "notification_mode_replies_and_mentions",
    value: "replies_and_mentions",
  },
  {
    i18n: "notification_mode_mute",
    value: "mute",
  },
];

type CommunityNotificationDropdownProps = {
  currentOption: CommunityNotificationsMode;
  onSelect: (val: CommunityNotificationsMode) => void;
  className?: string;
};
export function CommunityNotificationsDropdown({
  currentOption,
  onSelect,
  className,
}: CommunityNotificationDropdownProps) {
  return (
    <FilterChipDropdown
      allOptions={communityNotifOptions}
      currentOption={communityNotifOptions.find(t => t.value === currentOption)}
      onSelect={onSelect}
      className={className}
    />
  );
}
