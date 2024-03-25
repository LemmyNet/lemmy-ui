import { RouteComponentProps } from "inferno-router/dist/Route";

export default function getRecipientIdFromProps(
  props: Pick<RouteComponentProps<{ recipient_id: string }>, "match">,
): number {
  return props.match.params.recipient_id
    ? Number(props.match.params.recipient_id)
    : 1;
}
