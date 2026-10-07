const imageRegex =
  /(http)?s?:?(\/\/[^"']*\.(?:jpg|jpeg|gif|png|svg|webp|avif))/;

export default function isImage(url: string) {
  return imageRegex.test(url);
}
