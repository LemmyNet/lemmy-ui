import hostname from "./hostname";

export default function getApubName({
  name,
  ap_id,
}: {
  name: string;
  ap_id: string;
}) {
  return `${name}@${hostname(ap_id)}`;
}
