export default function getPageFromString(page?: string): number {
  return page && !Number.isNaN(Number(page)) ? Number(page) : 1;
}
