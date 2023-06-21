export default function getRecipientIdFromProps(props: any): number {
  return props.match.params.recipient_id
    ? Number(props.match.params.recipient_id)
    : 1;
}
