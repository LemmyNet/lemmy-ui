export default function getIdFromProps(props: any): number | undefined {
  const id = props.match.params.post_id;
  return id ? Number(id) : undefined;
}
