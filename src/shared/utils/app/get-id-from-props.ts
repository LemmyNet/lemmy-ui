import { RouteComponentProps } from "inferno-router/dist/Route";

export default function getIdFromProps(
  props: Pick<RouteComponentProps<{ post_id?: string }>, "match">,
): number | undefined {
  const id = props.match.params.post_id;
  return id ? Number(id) : undefined;
}
