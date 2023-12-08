import hostname from "./hostname";

export default function getApubName({
  name,
  actor_id,
}: {
  name: string;
  actor_id: string;
}) {
  return `${name}@${hostname(actor_id)}`;
}
