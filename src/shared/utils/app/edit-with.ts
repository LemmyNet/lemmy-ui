import { WithComment } from "@utils/types";

export default function editWith<D extends WithComment, L extends WithComment>(
  {
    comment,
    counts,
    saved,
    my_vote,
    creator_banned_from_community,
    creator_blocked,
    creator_is_admin,
    creator_is_moderator,
  }: D,
  list: L[],
) {
  return [
    ...list.map(c =>
      c.comment.id === comment.id
        ? {
            ...c,
            comment,
            counts,
            saved,
            my_vote,
            creator_banned_from_community,
            creator_blocked,
            creator_is_admin,
            creator_is_moderator,
          }
        : c,
    ),
  ];
}
