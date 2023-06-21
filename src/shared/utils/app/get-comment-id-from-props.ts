export default function getCommentIdFromProps(props: any): number | undefined {
  const id = props.match.params.comment_id;
  return id ? Number(id) : undefined;
}
