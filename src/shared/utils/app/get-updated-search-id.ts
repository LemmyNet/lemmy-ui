export default function getUpdatedSearchId(
  id?: number | null,
  urlId?: number | null
) {
  return id === null
    ? undefined
    : ((id ?? urlId) === 0 ? undefined : id ?? urlId)?.toString();
}
