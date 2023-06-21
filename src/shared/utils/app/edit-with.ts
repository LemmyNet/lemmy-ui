import { WithComment } from "@utils/types";

export default function editWith<D extends WithComment, L extends WithComment>(
  { comment, counts, saved, my_vote }: D,
  list: L[]
) {
  return [
    ...list.map(c =>
      c.comment.id === comment.id
        ? { ...c, comment, counts, saved, my_vote }
        : c
    ),
  ];
}
