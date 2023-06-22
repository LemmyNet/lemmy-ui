type ImmutableListKey =
  | "comment"
  | "comment_reply"
  | "person_mention"
  | "community"
  | "private_message"
  | "post"
  | "post_report"
  | "comment_report"
  | "private_message_report"
  | "registration_application";

export default function editListImmutable<
  T extends { [key in F]: { id: number } },
  F extends ImmutableListKey
>(fieldName: F, data: T, list: T[]): T[] {
  return [
    ...list.map(c => (c[fieldName].id === data[fieldName].id ? data : c)),
  ];
}
