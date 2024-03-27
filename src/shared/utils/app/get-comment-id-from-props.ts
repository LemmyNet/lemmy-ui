import { RouteComponentProps } from "inferno-router/dist/Route";

export default function getCommentIdFromProps(
  props: Pick<RouteComponentProps<{ comment_id?: string }>, "match">,
): number | undefined {
  const id = props.match.params.comment_id;
  return id ? Number(id) : undefined;
}
