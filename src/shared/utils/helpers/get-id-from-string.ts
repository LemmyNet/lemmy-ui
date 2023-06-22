export default function getIdFromString(id?: string): number | undefined {
  return id && id !== "0" && !Number.isNaN(Number(id)) ? Number(id) : undefined;
}
